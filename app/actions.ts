"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  DataApiSettings,
  NeonAuthEmailAndPasswordConfigUpdate,
  NeonAuthWebhookConfig,
} from "@neon/sdk";
import { NeonApiError } from "@neon/sdk";
import {
  EndpointType,
  NeonAuthSupportedAuthProvider,
  neon,
  ORG_ID,
} from "@/lib/neon";
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
  if (err instanceof NeonApiError) {
    const body = err.body;
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }
    return err.message;
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

// ---------------------------------------------------------------------------
// Data API (per-branch, PostgREST-compatible)
//
// Endpoints mirror the Neon Console: a Data API is a per-branch, per-database
// SubZero deployment that exposes REST endpoints over PostgreSQL via JWT auth.
// We use `neondb` as the database name (the project default) — matching what
// the real console picks for "Enable Data API" on the default branch.
// ---------------------------------------------------------------------------

export type DataApiResult = { ok: true } | { ok: false; error: string };

/**
 * Enable Neon Data API on a branch.
 *
 * `useNeonAuth` mirrors the console's "Use Neon Auth" checkbox: when on we
 * pass `auth_provider: "neon_auth"` so the Data API picks up the branch's
 * Neon Auth JWKS automatically. When off, the user is expected to configure
 * an external JWKS URL later (we surface that path from the settings tab).
 *
 * `grantPublicSchemaAccess` toggles `add_default_grants` which grants
 * `authenticated` SELECT/INSERT/UPDATE/DELETE on the `public` schema — the
 * caller is then expected to add RLS policies before going live.
 */
export async function enableDataApiAction(
  formData: FormData
): Promise<DataApiResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const databaseName = String(formData.get("databaseName") ?? "neondb");
  const useNeonAuth = formData.get("useNeonAuth") === "on";
  const grantPublicSchemaAccess =
    formData.get("grantPublicSchemaAccess") === "on";
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.createProjectBranchDataApi(projectId, branchId, databaseName, {
      ...(useNeonAuth ? { auth_provider: "neon_auth" as const } : {}),
      add_default_grants: grantPublicSchemaAccess,
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to enable Data API." };
  }
  revalidatePath(`/projects/${projectId}/data-api`);
  return { ok: true };
}

/**
 * Update Data API settings (advanced settings tab).
 *
 * All fields are optional; we only patch keys the user actually changed so
 * we don't accidentally overwrite server-side defaults with empty strings.
 */
export async function updateDataApiSettingsAction(
  formData: FormData
): Promise<DataApiResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const databaseName = String(formData.get("databaseName") ?? "neondb");
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);

  const settings: NonNullable<DataApiSettings> = {};
  const schemasRaw = String(formData.get("schemas") ?? "").trim();
  if (schemasRaw) {
    settings.db_schemas = schemasRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const anonRole = String(formData.get("anonRole") ?? "").trim();
  if (anonRole) settings.db_anon_role = anonRole;
  const maxRowsRaw = String(formData.get("maxRows") ?? "").trim();
  if (maxRowsRaw) {
    const maxRows = Number(maxRowsRaw);
    if (!Number.isFinite(maxRows) || maxRows < 0) {
      return { ok: false, error: "Maximum rows must be a positive number." };
    }
    settings.db_max_rows = maxRows;
  }
  const cors = String(formData.get("corsOrigins") ?? "").trim();
  if (cors) settings.server_cors_allowed_origins = cors;
  const openapi = String(formData.get("openapiMode") ?? "").trim();
  if (openapi) settings.openapi_mode = openapi;
  settings.server_timing_enabled =
    formData.get("serverTimingEnabled") === "on";

  try {
    await neon.updateProjectBranchDataApi(
      projectId,
      branchId,
      databaseName,
      { settings }
    );
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to update Data API." };
  }
  revalidatePath(`/projects/${projectId}/data-api`);
  return { ok: true };
}

/**
 * Refresh the PostgREST schema cache for a branch's Data API. Used after
 * DDL changes (CREATE TABLE / ALTER TYPE / etc.) so PostgREST picks up
 * the new shape without restarting the endpoint. Under the hood this is
 * a PATCH with no settings — the upstream description notes that a
 * schema refresh always runs as part of the update call.
 */
export async function refreshDataApiSchemaCacheAction(
  projectId: string,
  branchId: string,
  databaseName: string
): Promise<DataApiResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateProjectBranchDataApi(
      projectId,
      branchId,
      databaseName,
      {}
    );
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to refresh schema cache." };
  }
  revalidatePath(`/projects/${projectId}/data-api`);
  return { ok: true };
}

export async function disableDataApiAction(
  projectId: string,
  branchId: string,
  databaseName: string
): Promise<DataApiResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.deleteProjectBranchDataApi(projectId, branchId, databaseName);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to disable Data API." };
  }
  revalidatePath(`/projects/${projectId}/data-api`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Neon Auth (per-branch, Better Auth v2)
//
// Neon Auth provisions a managed auth provider project (`better_auth`, the
// current managed service; `stack` is the deprecated v1 engine) tied
// to a Neon branch and adds a `neon_auth.users_sync` table that mirrors
// users into the user's database. The console exposes:
//
//   - enable / disable
//   - trusted redirect domains + allow localhost
//   - email & password sign-in toggles
//   - OAuth providers (add/remove)
//   - webhook config
//   - user creation / deletion
//
// We replicate all of those against the public REST API.
// ---------------------------------------------------------------------------

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function enableAuthAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.createNeonAuth(projectId, branchId, {
      auth_provider: NeonAuthSupportedAuthProvider.BetterAuth,
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to enable Neon Auth." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function disableAuthAction(
  projectId: string,
  branchId: string,
  deleteData: boolean
): Promise<AuthResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.disableNeonAuth(projectId, branchId, {
      delete_data: deleteData,
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to disable Neon Auth." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function addAuthTrustedDomainAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const domain = String(formData.get("domain") ?? "").trim();
  if (!projectId || !branchId || !domain) {
    return { ok: false, error: "domain is required." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.addBranchNeonAuthTrustedDomain(projectId, branchId, {
      domain,
      auth_provider: NeonAuthSupportedAuthProvider.BetterAuth,
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to add domain." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function removeAuthTrustedDomainAction(
  projectId: string,
  branchId: string,
  domain: string
): Promise<AuthResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.deleteBranchNeonAuthTrustedDomain(projectId, branchId, {
      auth_provider: NeonAuthSupportedAuthProvider.BetterAuth,
      domains: [{ domain }],
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to remove domain." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function setAuthAllowLocalhostAction(
  projectId: string,
  branchId: string,
  allow: boolean
): Promise<AuthResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.updateNeonAuthAllowLocalhost(projectId, branchId, {
      allow_localhost: allow,
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to update allow localhost." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function updateAuthEmailPasswordConfigAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);
  const update: NeonAuthEmailAndPasswordConfigUpdate = {
    enabled: formData.get("enabled") === "on",
    require_email_verification: formData.get("requireVerification") === "on",
    disable_sign_up: formData.get("disableSignUp") === "on",
  };
  try {
    await neon.updateNeonAuthEmailAndPasswordConfig(
      projectId,
      branchId,
      update
    );
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to update email/password config." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

/**
 * Add a (shared-keys) OAuth provider. Real client_id / client_secret aren't
 * configured here because the public-API/console-managed path uses Neon's
 * shared keys by default — the user can swap in their own keys later through
 * the provider-specific dialog, which we surface as a follow-up.
 */
export async function addAuthOauthProviderAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!projectId || !branchId || !providerId) {
    return { ok: false, error: "providerId is required." };
  }
  await requireProjectAccess(tenant, projectId);
  const oauthProviderId = assertOAuthProviderId(providerId);
  if (!oauthProviderId) {
    return { ok: false, error: `Invalid OAuth provider id: ${providerId}` };
  }
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();
  const body: {
    id: SupportedOAuthProviderId;
    client_id?: string;
    client_secret?: string;
  } = {
    id: oauthProviderId,
  };
  if (clientId) body.client_id = clientId;
  if (clientSecret) body.client_secret = clientSecret;
  try {
    await neon.addBranchNeonAuthOauthProvider(projectId, branchId, body);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to add provider." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function removeAuthOauthProviderAction(
  projectId: string,
  branchId: string,
  providerId: string
): Promise<AuthResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  const oauthProviderId = assertOAuthProviderId(providerId);
  if (!oauthProviderId) {
    return { ok: false, error: `Invalid OAuth provider id: ${providerId}` };
  }
  try {
    await neon.deleteBranchNeonAuthOauthProvider(
      projectId,
      branchId,
      oauthProviderId
    );
  } catch (err) {
    return {
      ok: false,
      error: extractApiError(err) ?? "Failed to remove provider.",
    };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

// Neon Auth v2 (Better Auth) OAuth providers. The Neon API enum also lists
// `microsoft`, but the v2 Better Auth service rejects it (verified live:
// `[body.id] Invalid option: expected one of "google"|"github"|"vercel"`), so
// we offer only the set v2 actually supports. (v1 Stack supported more, but the
// app now provisions Better Auth.)
const OAUTH_PROVIDER_IDS = ["google", "github", "vercel"] as const;

type SupportedOAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

function assertOAuthProviderId(
  providerId: string
): SupportedOAuthProviderId | null {
  if (!/^[a-z]{2,32}$/.test(providerId)) return null;
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(providerId)
    ? (providerId as SupportedOAuthProviderId)
    : null;
}

export async function updateAuthWebhookConfigAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  if (!projectId || !branchId) {
    return { ok: false, error: "Missing projectId or branchId." };
  }
  await requireProjectAccess(tenant, projectId);
  const enabled = formData.get("enabled") === "on";
  const webhookUrl = String(formData.get("webhookUrl") ?? "").trim();
  const timeoutRaw = String(formData.get("timeoutSeconds") ?? "").trim();
  const config: NeonAuthWebhookConfig = {
    enabled,
    ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    ...(timeoutRaw
      ? { timeout_seconds: Number.parseInt(timeoutRaw, 10) }
      : {}),
  };
  try {
    await neon.updateNeonAuthWebhookConfig(projectId, branchId, config);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to update webhook config." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function createAuthUserAction(
  formData: FormData
): Promise<AuthResult> {
  const tenant = await requireTenant();
  const projectId = String(formData.get("projectId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !branchId || !email) {
    return { ok: false, error: "email is required." };
  }
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.createBranchNeonAuthNewUser(projectId, branchId, {
      email,
      ...(name ? { name } : {}),
    });
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to create user." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}

export async function deleteAuthUserAction(
  projectId: string,
  branchId: string,
  userId: string
): Promise<AuthResult> {
  const tenant = await requireTenant();
  await requireProjectAccess(tenant, projectId);
  try {
    await neon.deleteBranchNeonAuthUser(projectId, branchId, userId);
  } catch (err) {
    return { ok: false, error: extractApiError(err) ?? "Failed to delete user." };
  }
  revalidatePath(`/projects/${projectId}/auth`);
  return { ok: true };
}
