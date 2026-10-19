import { getTableColumns, getTableName, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";

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

/** An upsert changes the row only when something besides `mirrored_at` differs, so identical snapshots return no txid. */
export function changedColumns(table: PgTable): SQL {
  const name = getTableName(table);
  const columns = Object.values(getTableColumns(table))
    .map((c) => c.name)
    .filter((c) => c !== "mirrored_at");
  const current = columns.map((c) => `"${name}"."${c}"`).join(", ");
  const incoming = columns.map((c) => `excluded."${c}"`).join(", ");
  return sql.raw(`(${current}) IS DISTINCT FROM (${incoming})`);
}

/**
 * `INSERT INTO table SELECT ... FROM jsonb_to_recordset(rows) WHERE gate`:
 * the rows go in as one JSON parameter and only when `gate` holds, so a
 * whole snapshot can be skipped by one condition. Row keys must be the
 * table's column names, which holds for the mirror tables.
 */
export function gatedInsert(table: PgTable, rows: Record<string, unknown>[], gate: SQL) {
  const columns = Object.entries(getTableColumns(table));
  const definitions = columns.map(([, c]) => `"${c.name}" ${c.getSQLType()}`).join(", ");
  const fields = Object.fromEntries(columns.map(([key, c]) => [key, sql.raw(`batch."${c.name}"`).as(c.name)]));
  return db
    .insert(table)
    .select(
      db
        .select(fields)
        .from(sql`jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as batch(${sql.raw(definitions)})`)
        .where(gate)
    );
}
