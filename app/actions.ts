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

// ---------------------------------------------------------------------------
// Project settings: every setting below maps to a field on
// `updateProject({ project })`. Each action returns a discriminated
// result so the UI can render upstream errors inline (Free plan limits
// surface here a lot — e.g. "max history retention 86400s", "hipaa
// requires Enterprise", "modifying suspend interval requires upgrade").
// ---------------------------------------------------------------------------

export type SettingsResult = { ok: true } | { ok: false; error: string };

/**
 * Update the project-level compute defaults. These are the values
 * new endpoints inherit when they're created — they don't retroactively
 * resize existing computes (mirrors Neon console behaviour).
 */
export async function updateComputeDefaultsAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const minCu = Number(formData.get("minCu") ?? 0.25);
  const maxCu = Number(formData.get("maxCu") ?? 0.25);
  const suspendChanged = formData.get("suspendChanged") === "1";
  const suspendSeconds = suspendChanged
    ? Number(formData.get("suspendSeconds") ?? 300)
    : null;
  if (!projectId) return { ok: false, error: "projectId is required." };
  if (!Number.isFinite(minCu) || !Number.isFinite(maxCu) || minCu > maxCu) {
    return { ok: false, error: "Min CU must be ≤ Max CU." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: {
        default_endpoint_settings: {
          autoscaling_limit_min_cu: minCu,
          autoscaling_limit_max_cu: maxCu,
          ...(suspendSeconds !== null && Number.isFinite(suspendSeconds)
            ? { suspend_timeout_seconds: suspendSeconds }
            : {}),
        },
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to update compute defaults.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Update the shared change-history retention window. Neon caps this
 * at 30 days (2592000s) and the Free plan caps it at 24h (86400s);
 * we let the upstream limit error bubble up rather than guessing the
 * caller's plan.
 */
export async function updateHistoryWindowAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const hours = Number(formData.get("hours") ?? 24);
  if (!projectId) return { ok: false, error: "projectId is required." };
  if (!Number.isFinite(hours) || hours < 0 || hours > 720) {
    return { ok: false, error: "History window must be 0–720 hours." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: { history_retention_seconds: Math.round(hours * 3600) },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to update history window.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Update the project's networking gating flags. `block_public_connections`
 * and `block_vpc_connections` toggle the two transports independently —
 * blocking both bricks every endpoint, which the Neon API rejects with
 * "at least one connection method must be allowed". We surface that
 * error verbatim so the user sees Neon's exact rule.
 */
export async function updateNetworkingAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "projectId is required." };
  const blockPublic = formData.get("blockPublic") === "on";
  const blockVpc = formData.get("blockVpc") === "on";
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: {
        settings: {
          block_public_connections: blockPublic,
          block_vpc_connections: blockVpc,
        },
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to update networking.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Toggle HIPAA compliance on this project. The Neon API itself
 * accepts the flag freely, but the org must be on a HIPAA-eligible
 * plan — otherwise updateProject returns "hipaa requires…". We
 * forward that error verbatim instead of pre-checking the plan.
 */
export async function setHipaaAction(
  projectId: string,
  enabled: boolean
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: { settings: { hipaa: enabled } },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to update HIPAA setting.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Enable logical replication. This is a one-way switch in Neon (the
 * SDK type literally says "cannot be disabled" once on) so we only
 * expose an enable action — never a disable.
 */
export async function enableLogicalReplicationAction(
  projectId: string
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: { settings: { enable_logical_replication: true } },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to enable logical replication.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Set or clear the project's maintenance window. The Neon API
 * encodes weekdays as 1–7 (Mon–Sun) and times as "HH:MM" UTC. To
 * clear a window we pass an empty weekday list, which the upstream
 * accepts as "no scheduled window".
 */
export async function updateMaintenanceWindowAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "projectId is required." };
  const enabled = formData.get("enabled") === "on";
  const startTime = String(formData.get("startTime") ?? "00:00");
  const endTime = String(formData.get("endTime") ?? "01:00");
  const weekdaysRaw = formData.getAll("weekdays").map((w) => Number(w));
  const weekdays = weekdaysRaw.filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= 7
  );
  if (enabled && weekdays.length === 0) {
    return { ok: false, error: "Pick at least one weekday." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProject(projectId, {
      project: {
        settings: {
          maintenance_window: enabled
            ? { weekdays, start_time: startTime, end_time: endTime }
            : { weekdays: [], start_time: "00:00", end_time: "00:00" },
        },
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to update maintenance window.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Grant a teammate access to this project by email. Maps to Neon's
 * `POST /projects/{id}/permissions`. The upstream call validates the
 * email format and account existence; we surface those errors raw.
 */
export async function grantProjectAccessAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!projectId || !email) {
    return { ok: false, error: "projectId and email are required." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.grantPermissionToProject(projectId, { email });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to grant project access.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

export async function revokeProjectAccessAction(
  projectId: string,
  permissionId: string
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.revokePermissionFromProject(projectId, permissionId);
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to revoke project access.",
    };
  }
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}

/**
 * Transfer this project to another Neon org. The Neon API has two
 * variants — org→org and user→org. This app keeps every project
 * inside an app-org tenant, so we always use the org→org endpoint
 * and target a real Neon org id (defaulting to the same global
 * `ORG_ID` if the caller didn't pick one).
 *
 * The Neon org id is independent of the app org id, so we surface
 * the upstream error verbatim if the user supplies an invalid target.
 */
export async function transferProjectAction(
  formData: FormData
): Promise<SettingsResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const destinationOrgId = String(formData.get("destinationOrgId") ?? "").trim();
  if (!projectId || !destinationOrgId) {
    return {
      ok: false,
      error: "projectId and destinationOrgId are required.",
    };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.transferProjectsFromOrgToOrg(ORG_ID, {
      destination_org_id: destinationOrgId,
      project_ids: [projectId],
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to transfer project.",
    };
  }
  await detachProject(projectId);
  revalidatePath(`/projects`);
  return { ok: true };
}

export type BranchResult = { ok: true } | { ok: false; error: string };

/**
 * Create a new branch on a project.
 *
 * Mirrors the real Neon console's "Create new branch" modal:
 *
 * - `parentId` selects the parent branch (defaults to the project's
 *   default branch if blank).
 * - `name` is optional; Neon picks a slug if omitted.
 * - Data option: `current` (default, no extra fields), `past` (uses
 *   `parent_timestamp` to fork from a specific point in time), or
 *   `schema_only` (uses `init_source: schema-only`, Beta).
 * - `expiresAt` ISO timestamp opts the branch into Neon's TTL auto-
 *   delete background job. The field is currently limited to Early
 *   Access participants — we still send it, and the discriminated
 *   result lets the dialog show the upstream "early access" error.
 */
export async function createBranchAction(
  formData: FormData
): Promise<BranchResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const dataMode = String(formData.get("dataMode") ?? "current").trim();
  const pastTimestamp = String(formData.get("pastTimestamp") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  if (!projectId) return { ok: false, error: "projectId is required." };
  await requireProjectAccess(tenant, projectId);

  let parentTimestamp: string | undefined;
  if (dataMode === "past" && pastTimestamp) {
    try {
      parentTimestamp = new Date(pastTimestamp).toISOString();
    } catch {
      return { ok: false, error: "Invalid past data timestamp." };
    }
  }

  let expiresAt: string | undefined;
  if (expiresAtRaw) {
    try {
      expiresAt = new Date(expiresAtRaw).toISOString();
    } catch {
      return { ok: false, error: "Invalid auto-delete timestamp." };
    }
  }

  try {
    await neon.createProjectBranch(projectId, {
      branch: {
        ...(name ? { name } : {}),
        ...(parentId ? { parent_id: parentId } : {}),
        ...(parentTimestamp ? { parent_timestamp: parentTimestamp } : {}),
        ...(dataMode === "schema_only" ? { init_source: "schema-only" } : {}),
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      },
      endpoints: [{ type: EndpointType.ReadWrite }],
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to create branch." };
  }
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
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
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.startProjectEndpoint(projectId, endpointId);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to start endpoint." };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
}

export async function suspendEndpointAction(
  projectId: string,
  endpointId: string
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.suspendProjectEndpoint(projectId, endpointId);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to suspend endpoint." };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
}

export type EndpointResult = { ok: true } | { ok: false; error: string };

export async function updateEndpointAutoscalingAction(
  formData: FormData
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const endpointId = String(formData.get("endpointId") ?? "");
  const minCu = Number(formData.get("minCu") ?? 0.25);
  const maxCu = Number(formData.get("maxCu") ?? 0.25);
  // Diff flags from the client so we only patch fields the user
  // actually changed. Sending an unchanged `suspend_timeout_seconds`
  // is rejected on the Free plan with "modifying the suspend interval
  // is not permitted on this account" — even when the value matches
  // the existing one — because Neon treats any explicit value as an
  // override attempt.
  const suspendChanged = formData.get("suspendChanged") === "1";
  const suspendSeconds = suspendChanged
    ? Number(formData.get("suspendSeconds") ?? 0)
    : null;
  if (!projectId || !endpointId) {
    return { ok: false, error: "Missing fields." };
  }
  if (!Number.isFinite(minCu) || !Number.isFinite(maxCu) || minCu > maxCu) {
    return { ok: false, error: "Min CU must be ≤ Max CU." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProjectEndpoint(projectId, endpointId, {
      endpoint: {
        autoscaling_limit_min_cu: minCu,
        autoscaling_limit_max_cu: maxCu,
        ...(suspendSeconds !== null && Number.isFinite(suspendSeconds)
          ? { suspend_timeout_seconds: suspendSeconds }
          : {}),
      },
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to update endpoint." };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
}

/**
 * Create a new compute endpoint (read replica) on a branch.
 *
 * Read replicas serve `read_only` traffic from the same data as the
 * branch's primary read/write endpoint, at their own connection
 * string. A branch can have at most one read/write endpoint but as
 * many read replicas as the plan allows; we don't enforce a count
 * here — the Neon API returns a clear plan-limit error if exceeded
 * and we surface it inline via `EndpointResult`.
 */
export async function createReadReplicaAction(
  formData: FormData
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const minCu = Number(formData.get("minCu") ?? 0.25);
  const maxCu = Number(formData.get("maxCu") ?? 0.25);
  // suspendSeconds is optional — leaving it off makes Neon pick the
  // project default (and the Free plan rejects any explicit value
  // here with "modifying the suspend interval is not permitted").
  const suspendRaw = formData.get("suspendSeconds");
  const suspendSeconds =
    suspendRaw === null || String(suspendRaw).trim() === ""
      ? null
      : Number(suspendRaw);
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  if (!Number.isFinite(minCu) || !Number.isFinite(maxCu) || minCu > maxCu) {
    return { ok: false, error: "Min CU must be ≤ Max CU." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.createProjectEndpoint(projectId, {
      endpoint: {
        branch_id: branchId,
        type: EndpointType.ReadOnly,
        autoscaling_limit_min_cu: minCu,
        autoscaling_limit_max_cu: maxCu,
        ...(suspendSeconds !== null && Number.isFinite(suspendSeconds)
          ? { suspend_timeout_seconds: suspendSeconds }
          : {}),
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to create read replica.",
    };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
}

export async function deleteEndpointAction(
  projectId: string,
  endpointId: string
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.deleteProjectEndpoint(projectId, endpointId);
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to delete endpoint.",
    };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
}

export async function restartEndpointAction(
  projectId: string,
  endpointId: string
): Promise<EndpointResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.restartProjectEndpoint(projectId, endpointId);
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to restart endpoint.",
    };
  }
  revalidatePath(`/projects/${projectId}/compute`);
  return { ok: true };
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
