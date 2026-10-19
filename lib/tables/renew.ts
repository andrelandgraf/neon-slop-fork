import type { SealedLiveQuery } from "@neon/realtime/client";
import { isSealedQuery, leavePage } from "@/lib/live/renew";
import type { PreviewTarget, TableRow } from "./preview-sql";

export interface TableRowsRenewal extends PreviewTarget {
  userId: string;
  orgId: string;
  projectId: string;
  branchId: string;
  databaseName: string;
}

/** `stopped`: the server refused for good, because access, the table or Realtime is gone. */
export type RenewalResult =
  | { kind: "renewed"; sealedQuery: SealedLiveQuery<TableRow> }
  | { kind: "stopped"; message: string };

const FINAL = new Set([403, 404, 409]);

function errorOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  return typeof body.error === "string" ? body.error : undefined;
}

export async function renewTableRows(params: TableRowsRenewal): Promise<RenewalResult> {
  const response = await fetch("/api/live/table-rows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (response.status === 401) leavePage();
  const body: unknown = await response.json().catch(() => null);
  if (FINAL.has(response.status)) {
    return { kind: "stopped", message: errorOf(body) ?? `The server refused the renewal (${response.status}).` };
  }
  if (!response.ok) throw new Error(`Couldn't renew the live table rows (${response.status}).`);
  if (!isSealedQuery<TableRow>(body)) throw new Error("The table rows renewal returned no sealed query.");
  return { kind: "renewed", sealedQuery: body };
}
