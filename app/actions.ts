"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EndpointType } from "@neondatabase/api-client";
import { neon, ORG_ID } from "@/lib/neon";
import {
  requireTenant,
  requireProjectAccess,
  attachProjectToOrg,
  detachProject,
  setActiveOrgCookie,
  getMemberOrgs,
  createAppOrg,
} from "@/lib/tenancy";

export async function createProjectAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "aws-us-east-1");
  const pg_version_raw = String(formData.get("pg_version") ?? "17");
  if (!name) throw new Error("Project name is required.");

  const res = await neon.createProject({
    project: {
      name,
      region_id: region,
      pg_version: Number.parseInt(pg_version_raw, 10),
      org_id: ORG_ID,
    },
  });
  await attachProjectToOrg(
    res.data.project.id,
    tenant.activeOrg.id,
    tenant.session.user.id
  );
  revalidatePath("/projects");
  redirect(`/projects/${res.data.project.id}`);
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.deleteProject(projectId);
  await detachProject(projectId);
  revalidatePath("/projects");
  redirect("/projects");
}

export async function renameProjectAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) throw new Error("projectId and name are required.");
  await requireProjectAccess(tenant, projectId);
  await neon.updateProject(projectId, { project: { name } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function createBranchAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim() || undefined;
  if (!projectId) throw new Error("projectId is required.");
  await requireProjectAccess(tenant, projectId);
  await neon.createProjectBranch(projectId, {
    ...(name ? { branch: { name } } : {}),
    endpoints: [{ type: EndpointType.ReadWrite }],
  });
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteBranchAction(
  projectId: string,
  branchId: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.deleteProjectBranch(projectId, branchId);
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
}

export async function setDefaultBranchAction(
  projectId: string,
  branchId: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.setDefaultProjectBranch(projectId, branchId);
  revalidatePath(`/projects/${projectId}/branches`);
}

export interface CreatedProjectApiKey {
  id: number;
  key: string;
  name: string;
  created_at: string;
}

export async function createProjectApiKeyAction(
  projectId: string,
  name: string
): Promise<CreatedProjectApiKey> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("Key name is required.");
  const apiKey = process.env.NEON_API_KEY!;
  const r = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/api_keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key_name: trimmed }),
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Failed to create API key: ${r.status} ${text}`);
  }
  const json = (await r.json()) as CreatedProjectApiKey;
  revalidatePath(`/projects/${projectId}/api-keys`);
  return json;
}

export async function revokeProjectApiKeyAction(
  projectId: string,
  keyId: number
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  const apiKey = process.env.NEON_API_KEY!;
  const r = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/api_keys/${keyId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  if (!r.ok) {
    throw new Error(`Failed to revoke API key: ${r.status}`);
  }
  revalidatePath(`/projects/${projectId}/api-keys`);
}

export async function restoreToTimestampAction(
  projectId: string,
  branchId: string,
  timestamp: string,
  preserveName?: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.restoreProjectBranch(projectId, branchId, {
    source_branch_id: branchId,
    source_timestamp: timestamp,
    ...(preserveName ? { preserve_under_name: preserveName } : {}),
  });
  revalidatePath(`/projects/${projectId}/backup`);
}

// ---------------------------------------------------------------------------
// Snapshots (Beta API). Free plan caps at 1 manual snapshot; paid plans 10.
// We surface upstream errors as result types so the client can render the
// real upstream message (max-snapshot limit, etc.) inline.
// ---------------------------------------------------------------------------

export type SnapshotResult = { ok: true } | { ok: false; error: string };

export async function createSnapshotAction(
  formData: FormData
): Promise<SnapshotResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.createSnapshot({
      projectId,
      branchId,
      ...(name ? { name } : {}),
      ...(expiresAtRaw ? { expires_at: new Date(expiresAtRaw).toISOString() } : {}),
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to create snapshot." };
  }
  revalidatePath(`/projects/${projectId}/backup`);
  return { ok: true };
}

export async function deleteSnapshotAction(
  projectId: string,
  snapshotId: string
): Promise<SnapshotResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.deleteSnapshot(projectId, snapshotId);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to delete snapshot." };
  }
  revalidatePath(`/projects/${projectId}/backup`);
  return { ok: true };
}

export async function renameSnapshotAction(
  projectId: string,
  snapshotId: string,
  name: string
): Promise<SnapshotResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Snapshot name is required." };
  try {
    await neon.updateSnapshot(projectId, snapshotId, {
      snapshot: { name: trimmed },
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to rename snapshot." };
  }
  revalidatePath(`/projects/${projectId}/backup`);
  return { ok: true };
}

/**
 * Restore a snapshot to a brand-new branch ("Preview" mode).
 *
 * `finalize_restore` defaults to false, which means the snapshot data
 * is materialised on a fresh branch and the caller can connect to it
 * via the new branch's endpoint. The original active branch is left
 * untouched — perfect for "diff this version against today" workflows.
 */
export async function restoreSnapshotPreviewAction(
  formData: FormData
): Promise<SnapshotResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const snapshotId = String(formData.get("snapshotId") ?? "");
  const branchName = String(formData.get("name") ?? "").trim();
  if (!projectId || !snapshotId) {
    return { ok: false, error: "Missing projectId or snapshotId." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.restoreSnapshot(
      { projectId, snapshotId },
      {
        ...(branchName ? { name: branchName } : {}),
        finalize_restore: false,
      }
    );
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to restore snapshot." };
  }
  revalidatePath(`/projects/${projectId}/backup`);
  revalidatePath(`/projects/${projectId}/branches`);
  return { ok: true };
}

/**
 * Restore a snapshot in-place onto a target branch ("Rollback" mode).
 *
 * `finalize_restore: true` moves the compute endpoint from the
 * existing target branch to the newly-created snapshot branch, which
 * preserves the connection string. The old branch is orphaned with
 * `(old)` suffix and stays around until you delete it manually
 * (Neon's design — gives you a window to undo).
 */
export async function restoreSnapshotInPlaceAction(
  formData: FormData
): Promise<SnapshotResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const snapshotId = String(formData.get("snapshotId") ?? "");
  const targetBranchId = String(formData.get("targetBranchId") ?? "").trim();
  if (!projectId || !snapshotId) {
    return { ok: false, error: "Missing projectId or snapshotId." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.restoreSnapshot(
      { projectId, snapshotId },
      {
        ...(targetBranchId ? { target_branch_id: targetBranchId } : {}),
        finalize_restore: true,
      }
    );
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to restore snapshot." };
  }
  revalidatePath(`/projects/${projectId}/backup`);
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Roles & databases (per-branch)
// ---------------------------------------------------------------------------

export async function createRoleAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !branchId || !name) throw new Error("Missing fields.");
  await requireProjectAccess(tenant, projectId);
  await neon.createProjectBranchRole(projectId, branchId, { role: { name } });
  revalidatePath(`/projects/${projectId}/roles`);
}

export async function deleteRoleAction(
  projectId: string,
  branchId: string,
  roleName: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.deleteProjectBranchRole(projectId, branchId, roleName);
  revalidatePath(`/projects/${projectId}/roles`);
}

export async function resetRolePasswordAction(
  projectId: string,
  branchId: string,
  roleName: string
): Promise<{ password: string }> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  const res = await neon.resetProjectBranchRolePassword(
    projectId,
    branchId,
    roleName
  );
  revalidatePath(`/projects/${projectId}/roles`);
  return { password: res.data.role.password ?? "" };
}

export async function createDatabaseAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (!projectId || !branchId || !name || !ownerName)
    throw new Error("Missing fields.");
  await requireProjectAccess(tenant, projectId);
  await neon.createProjectBranchDatabase(projectId, branchId, {
    database: { name, owner_name: ownerName },
  });
  revalidatePath(`/projects/${projectId}/databases`);
}

export async function deleteDatabaseAction(
  projectId: string,
  branchId: string,
  databaseName: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.deleteProjectBranchDatabase(projectId, branchId, databaseName);
  revalidatePath(`/projects/${projectId}/databases`);
}

// ---------------------------------------------------------------------------
// Compute / endpoint management
// ---------------------------------------------------------------------------

export async function startEndpointAction(
  projectId: string,
  endpointId: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.startProjectEndpoint(projectId, endpointId);
  revalidatePath(`/projects/${projectId}/compute`);
}

export async function suspendEndpointAction(
  projectId: string,
  endpointId: string
): Promise<void> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  await neon.suspendProjectEndpoint(projectId, endpointId);
  revalidatePath(`/projects/${projectId}/compute`);
}

export async function updateEndpointAutoscalingAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const endpointId = String(formData.get("endpointId") ?? "");
  const minCu = Number(formData.get("minCu") ?? 0.25);
  const maxCu = Number(formData.get("maxCu") ?? 0.25);
  const suspendSeconds = Number(formData.get("suspendSeconds") ?? 0);
  if (!projectId || !endpointId) throw new Error("Missing fields.");
  await requireProjectAccess(tenant, projectId);
  await neon.updateProjectEndpoint(projectId, endpointId, {
    endpoint: {
      autoscaling_limit_min_cu: minCu,
      autoscaling_limit_max_cu: maxCu,
      suspend_timeout_seconds: suspendSeconds,
    },
  });
  revalidatePath(`/projects/${projectId}/compute`);
}

// ---------------------------------------------------------------------------
// IP allowlist
// ---------------------------------------------------------------------------

export type IpAllowlistResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update the project's IP allowlist. Returns a discriminated union
 * instead of throwing so the calling client component can render the
 * upstream Neon error inline — Next's production build masks raw
 * server-action throws as a generic "An error occurred in the Server
 * Components render." string, which hides genuinely useful messages
 * like "max 0 allowed_ips" from Free-plan users.
 */
export async function updateIpAllowlistAction(
  formData: FormData
): Promise<IpAllowlistResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "projectId is required." };
  await requireProjectAccess(tenant, projectId);
  const ipsRaw = String(formData.get("ips") ?? "");
  const ips = ipsRaw
    .split(/[\n,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const protectedOnly = formData.get("protectedOnly") === "on";
  try {
    await neon.updateProject(projectId, {
      project: {
        settings: {
          allowed_ips: { ips, protected_branches_only: protectedOnly },
        },
      },
    });
  } catch (err) {
    // The Neon SDK wraps fetch in axios; the most useful detail lives
    // on `response.data.message`. Fall back to the Error.message if the
    // shape is unfamiliar, and to a generic string if even that's gone.
    const upstream = extractApiError(err);
    return {
      ok: false,
      error: upstream ?? "Failed to update IP allowlist.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

function extractApiError(err: unknown): string | null {
  if (typeof err === "object" && err !== null) {
    const maybeResponse = (err as { response?: { data?: { message?: string } } })
      .response;
    if (maybeResponse?.data?.message) return maybeResponse.data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return null;
}

// ---------------------------------------------------------------------------
// App-level tenancy
// ---------------------------------------------------------------------------

export async function switchOrgAction(orgId: string): Promise<void> {
  const tenant = await requireTenant();
  const member = (await getMemberOrgs(tenant.session.user.id)).find(
    (o) => o.id === orgId
  );
  if (!member) throw new Error("Not a member of that organization.");
  await setActiveOrgCookie(member.id);
  revalidatePath("/", "layout");
}

export async function createOrgAction(formData: FormData): Promise<void> {
  const tenant = await requireTenant();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organization name is required.");
  const org = await createAppOrg(tenant.session.user.id, name);
  await setActiveOrgCookie(org.id);
  revalidatePath("/", "layout");
  redirect("/projects");
}
