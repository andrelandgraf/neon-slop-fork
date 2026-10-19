"use server";
import { projectChanged } from "@/lib/mirror/after-write";
import { revalidatePath } from "next/cache";
import type { SnapshotFrequency } from "@neon/sdk";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";

type Result = { ok: true } | { ok: false; error: string };

export type ScheduleChoice = "none" | SnapshotFrequency;

/** Writes a one-entry schedule (or clears it), like the Console's picker. */
export async function setSnapshotScheduleAction(
  projectId: string,
  branchId: string,
  choice: ScheduleChoice
): Promise<Result> {
  await loadBranch(projectId, branchId);
  try {
    await neonSdk.snapshots.setSchedule({
      projectId,
      branchId,
      schedule: choice === "none" ? [] : [{ frequency: choice }],
    });
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to update the schedule." };
  }
  await projectChanged(projectId);
  return { ok: true };
}

export type CreateSnapshotResult =
  | { ok: true; elapsedMs: number }
  | { ok: false; error: string };

/** "Create": one click, named "<branch> at <UTC time> (manual)". */
export async function createSnapshotNowAction(
  projectId: string,
  branchId: string
): Promise<CreateSnapshotResult> {
  const { branch } = await loadBranch(projectId, branchId);
  const at = new Date().toISOString().replace("T", " ").slice(0, 19);
  const started = Date.now();
  try {
    await neonSdk.snapshots.create({
      projectId,
      branchId,
      name: `${branch.name} at ${at} UTC (manual)`,
    });
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to create snapshot." };
  }
  await projectChanged(projectId);
  return { ok: true, elapsedMs: Date.now() - started };
}
