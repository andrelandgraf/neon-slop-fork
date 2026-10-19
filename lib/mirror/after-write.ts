import "server-only";
import { revalidatePath } from "next/cache";
import { followMasking, followServices, reconcileServicesLater, syncExtras, syncMasking, syncServices } from "./services";
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

async function mirrorScope(label: string, sync: () => Promise<unknown>, recover: () => void): Promise<void> {
  try {
    await sync();
  } catch (cause) {
    console.error(`Mirror sync of ${label} failed after a Neon write; reconciling later.`, cause);
    recover();
  }
}

/** Mirrors a branch's app-backend state without revalidating, for writes whose response must not remount the page. */
export function mirrorServices(projectId: string, branchId: string): Promise<void> {
  return mirrorScope(
    `services of ${branchId}`,
    () => syncServices(projectId, branchId),
    () => reconcileServicesLater({ kind: "services", projectId, branchId })
  );
}

/** What else a write changed, besides the project, its branches, computes and operations. */
export interface ChangedScopes {
  /** A branch whose databases or roles changed. */
  branch?: string;
  /** A branch whose app-backend services, buckets, functions or credentials changed. */
  services?: string;
  /** Snapshots, snapshot schedules or collaborators. */
  extras?: boolean;
  /** A branch whose masking status changed; its setup or anonymization is followed while it runs. */
  masking?: string;
}

/** Mirrors the project and the scopes a write changed, then revalidates the pages that still render from the Neon API. */
export async function projectChanged(projectId: string, scopes: ChangedScopes = {}): Promise<ProjectSync | null> {
  const { branch, services, extras, masking } = scopes;
  const [synced] = await Promise.all([
    mirrorProject(projectId),
    branch
      ? mirrorScope(`branch ${branch}`, () => syncBranch(projectId, branch), () => reconcileLater({ projectId, branchId: branch }))
      : null,
    services
      ? mirrorScope(
          `services of ${services}`,
          async () => {
            await syncServices(projectId, services);
            followServices(projectId, services);
          },
          () => reconcileServicesLater({ kind: "services", projectId, branchId: services })
        )
      : null,
    extras
      ? mirrorScope(`extras of ${projectId}`, () => syncExtras(projectId), () =>
          reconcileServicesLater({ kind: "extras", projectId })
        )
      : null,
    masking
      ? mirrorScope(
          `masking of ${masking}`,
          async () => {
            await syncMasking(projectId, masking);
            followMasking(projectId, masking);
          },
          () => reconcileServicesLater({ kind: "masking", projectId, branchId: masking })
        )
      : null,
  ]);
  revalidatePath(`/projects/${projectId}`, "layout");
  return synced;
}
