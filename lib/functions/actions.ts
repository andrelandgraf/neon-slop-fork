"use server";
import { projectChanged } from "@/lib/mirror/after-write";
import { revalidatePath } from "next/cache";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";

type Result = { ok: true } | { ok: false; error: string };

export type TriggerInput =
  | { type: "schedule"; name: string; functionPath: string; cron: string; enabled: boolean }
  | {
      type: "storage_object_created";
      name: string;
      functionPath: string;
      bucketName: string;
      prefix: string;
      enabled: boolean;
    };

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

export async function createTriggerAction(
  projectId: string,
  branchId: string,
  functionSlug: string,
  input: TriggerInput
): Promise<Result> {
  const common = {
    projectId,
    branchId,
    function_slug: functionSlug,
    name: input.name.trim(),
    function_path: input.functionPath || "/",
    enabled: input.enabled,
  };
  return run(projectId, branchId, "Failed to create the trigger.", () =>
    input.type === "schedule"
      ? neonSdk.triggers.create({ ...common, type: "schedule", schedule: { cron: input.cron.trim() } })
      : neonSdk.triggers.create({
          ...common,
          type: "storage_object_created",
          storage_object_created: {
            bucket_name: input.bucketName.trim(),
            ...(input.prefix.trim() ? { prefix: input.prefix.trim() } : {}),
          },
        })
  );
}

export async function updateTriggerAction(
  projectId: string,
  branchId: string,
  triggerId: string,
  input: TriggerInput
): Promise<Result> {
  const common = {
    projectId,
    branchId,
    triggerId,
    name: input.name.trim(),
    function_path: input.functionPath || "/",
    enabled: input.enabled,
  };
  return run(projectId, branchId, "Failed to update the trigger.", () =>
    input.type === "schedule"
      ? neonSdk.triggers.update({ ...common, type: "schedule", schedule: { cron: input.cron.trim() } })
      : neonSdk.triggers.update({
          ...common,
          type: "storage_object_created",
          storage_object_created: {
            bucket_name: input.bucketName.trim(),
            ...(input.prefix.trim() ? { prefix: input.prefix.trim() } : {}),
          },
        })
  );
}

export async function deleteTriggerAction(projectId: string, branchId: string, triggerId: string) {
  return run(projectId, branchId, "Failed to delete the trigger.", () =>
    neonSdk.triggers.delete({ projectId, branchId, triggerId })
  );
}

export async function deleteFunctionAction(projectId: string, branchId: string, slug: string) {
  return run(projectId, branchId, "Failed to delete the function.", () =>
    neonSdk.functions.delete({ projectId, branchId, slug })
  );
}

export async function registerCustomDomainAction(
  projectId: string,
  branchId: string,
  slug: string,
  domain: string
) {
  return run(projectId, branchId, "Failed to add the custom domain.", () =>
    neonSdk.functions.customDomains.register({
      projectId,
      branchId,
      domain: domain.trim(),
      entity_type: "function",
      entity_id: slug,
    })
  );
}
