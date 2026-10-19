import "server-only";
import { revalidatePath } from "next/cache";
import { reconcileLater, syncProject, type ProjectSync } from "./sync";

/**
 * Call after a server action changed a project through the Neon API: mirrors
 * the project so live views update, then revalidates the pages that still
 * render from the Neon API. The Neon write already happened, so a failed
 * mirror write says so instead of reading as a failed change.
 */
export async function projectChanged(projectId: string): Promise<ProjectSync> {
  let synced: ProjectSync;
  try {
    synced = await syncProject(projectId);
  } catch (cause) {
    reconcileLater({ projectId });
    throw new Error("Saved in Neon, but the console couldn't update its live view. It catches up within a minute.", {
      cause,
    });
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return synced;
}
