"use server";
import { revalidatePath } from "next/cache";
import { neonRaw } from "@/lib/neon";
import { loadProject } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";
import {
  getMemberOrgs,
  recordClaimLinkExpiry,
  reserveClaimLink,
  transferProjectToAppOrg,
} from "@/lib/tenancy";

export type ClaimLinkResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: string };

/**
 * A Neon transfer request: whoever opens the link while signed in to Neon
 * can move the project into one of their own organizations, taking it out
 * of this clone's shared org.
 */
export async function createClaimLinkAction(projectId: string): Promise<ClaimLinkResult> {
  const { tenant } = await loadProject(projectId);
  if (!(await reserveClaimLink(projectId, tenant.activeOrg.id))) {
    return { ok: false, error: "This project no longer belongs to your organization." };
  }
  try {
    const request = await neonRaw.createTransferRequest(projectId);
    await recordClaimLinkExpiry(projectId, new Date(request.expires_at));
    const url = `https://console.neon.tech/app/claim?${new URLSearchParams({
      tr: request.id,
      p: projectId,
    })}`;
    return { ok: true, url, expiresAt: request.expires_at };
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to create a claim link." };
  }
}

export type TransferResult = { ok: true } | { ok: false; error: string };

/** Moves the project to another organization the user belongs to in this app. */
export async function transferProjectAction(
  projectId: string,
  destinationOrgId: string
): Promise<TransferResult> {
  const { tenant } = await loadProject(projectId);
  const memberOrgs = await getMemberOrgs(tenant.session.user.id);
  if (!memberOrgs.some((org) => org.id === destinationOrgId)) {
    return { ok: false, error: "You're not a member of that organization." };
  }
  if (destinationOrgId === tenant.activeOrg.id) {
    return { ok: false, error: "The project already belongs to this organization." };
  }
  const result = await transferProjectToAppOrg(projectId, tenant.activeOrg.id, destinationOrgId);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "claim_link_active"
          ? `A claim link for this project is active until ${result.until?.toLocaleString("en-US")}. Transfer is available after it expires.`
          : "This project no longer belongs to your organization.",
    };
  }
  revalidatePath("/projects");
  return { ok: true };
}
