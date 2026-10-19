import "server-only";
import { revalidatePath } from "next/cache";
import { followOperations, reconcileLater, syncBranch, syncProject, type ProjectSync } from "./sync";

/**
 * Mirrors a project after a server action changed it through the Neon API,
 * so live views update. The Neon write already succeeded, so a failed
 * mirror write must not turn it into a failed action: it's logged with its
 * cause and a reconcile is scheduled, which brings the live views up to
 * date on the next renewal. Returns null in that case.
 */
export async function mirrorProject(projectId: string): Promise<ProjectSync | null> {
  try {
    const synced = await syncProject(projectId);
    if (synced.inFlight) followOperations(projectId);
    return synced;
  } catch (cause) {
    console.error(`Mirror sync failed after a Neon write to project ${projectId}; reconciling later.`, cause);
    reconcileLater({ projectId });
    return null;
  }
}

/** Mirrors one branch's databases and roles after a write to them; failures are handled like `mirrorProject`'s. */
async function mirrorBranch(projectId: string, branchId: string): Promise<void> {
  try {
    await syncBranch(projectId, branchId);
  } catch (cause) {
    console.error(`Mirror sync failed after a Neon write to branch ${branchId}; reconciling later.`, cause);
    reconcileLater({ projectId, branchId });
  }
}

/**
 * `mirrorProject` (and the branch's databases and roles when `branchId` is
 * given), then revalidates the pages that still render from the Neon API.
 */
export async function projectChanged(projectId: string, branchId?: string): Promise<ProjectSync | null> {
  const [synced] = await Promise.all([mirrorProject(projectId), branchId ? mirrorBranch(projectId, branchId) : null]);
  revalidatePath(`/projects/${projectId}`, "layout");
  return synced;
}
