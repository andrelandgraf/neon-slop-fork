"use server";
import { projectChanged } from "@/lib/mirror/after-write";
import { revalidatePath } from "next/cache";
import { neonRaw, neonSdk } from "@/lib/neon";
import { loadBranch, loadProject } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";

export type BranchDataMode = "current" | "past" | "schema_only" | "anonymized";

export interface CreateBranchInput {
  projectId: string;
  name: string;
  parentId: string;
  dataMode: BranchDataMode;
  /** ISO timestamp, for `past`. */
  parentTimestamp?: string;
  /** ISO timestamp; omitted means the branch never expires. */
  expiresAt?: string;
}

export type CreateBranchResult =
  | { ok: true; branchId: string; elapsedMs: number }
  | { ok: false; error: string };

export async function createBranchAction(
  input: CreateBranchInput
): Promise<CreateBranchResult> {
  const { branches } = await loadProject(input.projectId);
  if (!branches.some((b) => b.id === input.parentId)) {
    return { ok: false, error: "Parent branch not found." };
  }
  const fields = {
    ...(input.name.trim() ? { name: input.name.trim() } : {}),
    parent_id: input.parentId,
    ...(input.expiresAt ? { expires_at: input.expiresAt } : {}),
  };
  const started = Date.now();
  try {
    if (input.dataMode === "anonymized") {
      const created = await neonRaw.createAnonymizedBranch(input.projectId, {
        branch_create: { branch: fields, endpoints: [{ type: "read_write" }] },
      });
      await projectChanged(input.projectId, { masking: created.branch.id });
      return { ok: true, branchId: created.branch.id, elapsedMs: Date.now() - started };
    }
    const branch = await neonSdk.branches.create({
      projectId: input.projectId,
      ...fields,
      ...(input.dataMode === "past" && input.parentTimestamp
        ? { parent_timestamp: input.parentTimestamp }
        : {}),
      ...(input.dataMode === "schema_only" ? { init_source: "schema-only" } : {}),
    });
    await projectChanged(input.projectId);
    return { ok: true, branchId: branch.id, elapsedMs: Date.now() - started };
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to create branch." };
  }
}

export type BranchActionResult = { ok: true } | { ok: false; error: string };

async function run(
  projectId: string,
  fallback: string,
  call: () => Promise<unknown>
): Promise<BranchActionResult> {
  try {
    await call();
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? fallback };
  }
  await projectChanged(projectId);
  return { ok: true };
}

export async function renameBranchAction(
  projectId: string,
  branchId: string,
  name: string
): Promise<BranchActionResult> {
  await loadBranch(projectId, branchId);
  if (!name.trim()) return { ok: false, error: "Branch name is required." };
  return run(projectId, "Failed to rename branch.", () =>
    neonSdk.branches.update({ projectId, branchId, name: name.trim() })
  );
}

export async function setBranchExpirationAction(
  projectId: string,
  branchId: string,
  expiresAt: string | null
): Promise<BranchActionResult> {
  await loadBranch(projectId, branchId);
  return run(projectId, "Failed to update the expiration.", () =>
    neonSdk.branches.update({ projectId, branchId, expires_at: expiresAt })
  );
}

export async function setBranchProtectedAction(
  projectId: string,
  branchId: string,
  isProtected: boolean
): Promise<BranchActionResult> {
  await loadBranch(projectId, branchId);
  return run(projectId, "Failed to update branch protection.", () =>
    neonSdk.branches.update({ projectId, branchId, protected: isProtected })
  );
}

export async function setDefaultBranchAction(
  projectId: string,
  branchId: string
): Promise<BranchActionResult> {
  await loadBranch(projectId, branchId);
  return run(projectId, "Failed to set the default branch.", () =>
    neonSdk.branches.setDefault({ projectId, branchId })
  );
}

export async function resetFromParentAction(
  projectId: string,
  branchId: string
): Promise<BranchActionResult> {
  const { branch } = await loadBranch(projectId, branchId);
  if (!branch.parent_id) {
    return { ok: false, error: "This branch has no parent to reset from." };
  }
  return run(projectId, "Failed to reset from parent.", () =>
    neonSdk.branches.resetFromParent({ projectId, branchId })
  );
}

export async function deleteBranchAction(
  projectId: string,
  branchId: string
): Promise<BranchActionResult> {
  const { branch } = await loadBranch(projectId, branchId);
  if (branch.default) {
    return { ok: false, error: "The default branch can't be deleted." };
  }
  return run(projectId, "Failed to delete branch.", () =>
    neonSdk.branches.delete({ projectId, branchId })
  );
}
