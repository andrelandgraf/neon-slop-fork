"use server";
import { projectChanged } from "@/lib/mirror/after-write";
import { revalidatePath } from "next/cache";
import type { MaskingRule } from "@neon/sdk";
import { neonRaw } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Saves the full rule set (the API replaces all rules on every PATCH), then
 * starts anonymization. The editor sends every rule it loaded, including
 * custom expressions it can't edit, so nothing is dropped.
 */
export async function applyMaskingRulesAction(
  projectId: string,
  branchId: string,
  rules: MaskingRule[]
): Promise<Result> {
  await loadBranch(projectId, branchId);
  try {
    await neonRaw.updateMaskingRules(projectId, branchId, rules);
    await neonRaw.startAnonymization(projectId, branchId);
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to apply masking rules." };
  }
  await projectChanged(projectId, { masking: branchId });
  return { ok: true };
}
