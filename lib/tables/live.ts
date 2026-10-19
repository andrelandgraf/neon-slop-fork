import "server-only";
import { createRealtime, rawSql, type SealedLiveQuery } from "@neon/realtime/server";
import { getProjectCapabilities } from "@/lib/capabilities";
import { ifFound, neonSdk } from "@/lib/neon";
import type { TableRow } from "./preview-sql";
import type { TablePreview } from "./preview";

/** Whether a table page can be live, and what the browser needs to subscribe. */
export type TableLive =
  | { kind: "unsupported" }
  | { kind: "off" }
  | { kind: "pending" }
  | { kind: "no-primary-key" }
  | { kind: "error"; message: string }
  | { kind: "ready"; url: string; allowedOrigins: string[]; sealedQuery: SealedLiveQuery<TableRow> };

/**
 * Seals a page's SQL with the tenant branch's own Realtime secret. A pending
 * change keeps the current secret valid until it finishes, so only a branch
 * that has no secret yet returns null.
 */
export async function sealTableRows(
  projectId: string,
  branchId: string,
  databaseName: string,
  sql: string
): Promise<SealedLiveQuery<TableRow> | null> {
  const { secret } = await neonSdk.realtime.secret({ projectId, branchId });
  if (!secret) return null;
  const realtime = createRealtime({ secret, db: databaseName });
  return realtime.seal({ query: rawSql<TableRow>(sql) });
}

/**
 * Prepares the live subscription for a page that already loaded. A failure
 * here leaves the preview as it is and reports why it isn't live.
 */
export async function setUpTableLive(
  projectId: string,
  defaultBranchId: string,
  branchId: string,
  preview: TablePreview
): Promise<TableLive> {
  try {
    const capabilities = await getProjectCapabilities(projectId, defaultBranchId);
    if (!capabilities.realtime) return { kind: "unsupported" };
    const realtime = await ifFound(neonSdk.realtime.get({ projectId, branchId }));
    if (!realtime?.enabled) return { kind: "off" };
    if (realtime.pending) return { kind: "pending" };
    if (preview.primaryKey.length === 0) return { kind: "no-primary-key" };
    if (!realtime.invocation_url) throw new Error("Neon returned no Realtime URL for this branch.");
    const sealedQuery = await sealTableRows(projectId, branchId, preview.databaseName, preview.sql);
    if (!sealedQuery) return { kind: "pending" };
    return {
      kind: "ready",
      url: realtime.invocation_url.replace(/^https:/, "wss:"),
      allowedOrigins: realtime.allowed_origins ?? [],
      sealedQuery,
    };
  } catch (error) {
    console.error(`Live table rows for ${projectId}/${branchId}:`, error);
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}
