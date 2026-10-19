import { getTableColumns, getTableName, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/** The id of the transaction that made a change, read in the write's own RETURNING. */
export const txid = sql<string>`pg_current_xact_id()::text`;

/** `ON CONFLICT DO UPDATE SET col = excluded.col` for every column but the keys. */
export function excludedSet(table: PgTable, keys: readonly string[]): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    if (keys.includes(key)) continue;
    set[key] = sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

/**
 * Lets a snapshot replace a row only when it is at least as new as the one
 * stored, and only when something besides the version differs, so stale or
 * identical snapshots return no row and no txid.
 */
export function newerAndChanged(table: PgTable, version: SQL): SQL {
  const name = getTableName(table);
  const columns = Object.values(getTableColumns(table))
    .map((c) => c.name)
    .filter((c) => c !== "mirrored_at");
  const current = columns.map((c) => `"${name}"."${c}"`).join(", ");
  const incoming = columns.map((c) => `excluded."${c}"`).join(", ");
  return sql`${sql.raw(`"${name}"."mirrored_at"`)} <= ${version} AND (${sql.raw(current)}) IS DISTINCT FROM (${sql.raw(incoming)})`;
}
