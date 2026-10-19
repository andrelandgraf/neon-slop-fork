"use server";
import { projectChanged } from "@/lib/mirror/after-write";
import { revalidatePath } from "next/cache";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";

type Result = { ok: true } | { ok: false; error: string };

async function run(
  projectId: string,
  branchId: string,
  fallback: string,
  call: () => Promise<unknown>
): Promise<Result> {
  await loadBranch(projectId, branchId);
  try {
    await call();
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? fallback };
  }
  await projectChanged(projectId, { services: branchId });
  return { ok: true };
}

export async function enableRealtimeAction(projectId: string, branchId: string) {
  return run(projectId, branchId, "Failed to enable Realtime.", () =>
    neonSdk.realtime.enable({ projectId, branchId })
  );
}

export async function disableRealtimeAction(projectId: string, branchId: string) {
  return run(projectId, branchId, "Failed to disable Realtime.", () =>
    neonSdk.realtime.disable({ projectId, branchId })
  );
}

export async function rotateRealtimeSecretAction(projectId: string, branchId: string) {
  return run(projectId, branchId, "Failed to rotate the secret.", () =>
    neonSdk.realtime.rotateSecret({ projectId, branchId })
  );
}

export type RealtimeSecretResult =
  | { ok: true; secret: string; pending: boolean }
  | { ok: false; error: string };

/** The branch secret, fetched only when the user clicks "Copy secret". */
export async function getRealtimeSecretAction(
  projectId: string,
  branchId: string
): Promise<RealtimeSecretResult> {
  await loadBranch(projectId, branchId);
  try {
    const { secret, pending } = await neonSdk.realtime.secret({ projectId, branchId });
    return { ok: true, secret, pending };
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to read the secret." };
  }
}
