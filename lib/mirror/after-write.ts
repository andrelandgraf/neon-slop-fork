import "server-only";
import { revalidatePath } from "next/cache";
import { reconcileLater, syncProject, type ProjectSync } from "./sync";

/**
 * Mirrors a project after a server action changed it through the Neon API,
 * so live views update. The Neon write already succeeded, so a failed
 * mirror write must not turn it into a failed action: it's logged with its
 * cause and a reconcile is scheduled, which brings the live views up to
 * date on the next renewal. Returns null in that case.
 */
export async function mirrorProject(projectId: string): Promise<ProjectSync | null> {
  try {
    return await syncProject(projectId);
  } catch (cause) {
    console.error(`Mirror sync failed after a Neon write to project ${projectId}; reconciling later.`, cause);
    reconcileLater({ projectId });
    return null;
  }
}

/** `mirrorProject`, then revalidates the pages that still render from the Neon API. */
export async function projectChanged(projectId: string): Promise<ProjectSync | null> {
  const synced = await mirrorProject(projectId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return synced;
}
