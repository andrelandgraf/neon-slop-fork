"use server";
import { loadBranch } from "@/lib/project-context";
import { runProjectSqlScript, type ScriptResult } from "@/lib/sql";

export type RunScriptResult =
  | ({ ok: true } & ScriptResult)
  | { ok: false; error: string };

export async function runSqlScriptAction(
  projectId: string,
  branchId: string,
  databaseName: string,
  sql: string
): Promise<RunScriptResult> {
  await loadBranch(projectId, branchId);
  try {
    return { ok: true, ...(await runProjectSqlScript(projectId, branchId, sql, databaseName)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
