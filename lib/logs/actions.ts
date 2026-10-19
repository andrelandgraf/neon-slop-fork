"use server";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { apiErrorMessage } from "@/lib/errors";
import { buildLogQL, levelOf, RANGE_MS, type LogFilters, type LogRange } from "./logql";

const LOG_LIMIT = 1000;

export interface LogLine {
  timestamp: string;
  message: string;
  level: string;
  service: string;
}

export type LogsResult =
  | { ok: true; lines: LogLine[]; start: string; end: string; truncated: boolean }
  | { ok: false; error: string };

export async function queryLogsAction(
  projectId: string,
  branchId: string,
  filters: LogFilters,
  range: LogRange
): Promise<LogsResult> {
  await loadBranch(projectId, branchId);
  const end = new Date();
  const start = new Date(end.getTime() - RANGE_MS[range]);
  try {
    const page = await neonSdk.logs
      .query({
        projectId,
        branchId,
        logql: buildLogQL(filters),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        limit: LOG_LIMIT,
        sort_order: "desc",
      })
      .page();
    return {
      ok: true,
      lines: page.items.map((r) => ({
        timestamp: r.timestamp,
        message: r.message,
        level: levelOf(r.severity_text),
        service: r.service_name ?? "",
      })),
      start: start.toISOString(),
      end: end.toISOString(),
      truncated: page.cursor !== undefined,
    };
  } catch (err) {
    return { ok: false, error: apiErrorMessage(err) ?? "Failed to query logs." };
  }
}
