"use server";
import { revalidatePath } from "next/cache";
import { getMemberRole, renameAppOrg, requireTenant } from "@/lib/tenancy";

type Result = { ok: true } | { ok: false; error: string };

export async function renameOrgAction(name: string): Promise<Result> {
  const tenant = await requireTenant();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Organization name is required." };
  if (trimmed.length > 64) return { ok: false, error: "Use 64 characters or fewer." };
  const role = await getMemberRole(tenant.activeOrg.id, tenant.session.user.id);
  if (role !== "owner") return { ok: false, error: "Only organization owners can rename it." };
  await renameAppOrg(tenant.activeOrg.id, trimmed);
  revalidatePath("/", "layout");
  return { ok: true };
}
