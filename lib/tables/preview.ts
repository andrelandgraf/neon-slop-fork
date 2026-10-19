import "server-only";
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { neon } from "@/lib/neon";
import { previewSql, type PreviewTarget, type TableRow } from "./preview-sql";

/** A preview that can't be built: the database or table is gone. */
export class TablePreviewNotFoundError extends Error {}

export interface TablePreview {
  databaseName: string;
  columns: { name: string; typeOid: number }[];
  rows: TableRow[];
  primaryKey: string[];
  sql: string;
}

const RAW_TEXT = { getTypeParser: () => (value: string) => value };

/**
 * The branch's database: the one named, exactly, or else the first one, the
 * way the rest of the Tables page picks it. A renewal names the database it
 * was sealed for, so a deleted database stops the subscription instead of
 * moving it to another one.
 */
async function connectionUri(projectId: string, branchId: string, databaseName?: string) {
  const [dbRes, rolesRes] = await Promise.all([
    neon.listProjectBranchDatabases(projectId, branchId),
    neon.listProjectBranchRoles(projectId, branchId),
  ]);
  const databases = dbRes.data.databases;
  const database = databaseName === undefined ? databases[0] : databases.find((d) => d.name === databaseName);
  if (!database) {
    throw new TablePreviewNotFoundError(
      databaseName === undefined ? "This branch has no database." : `Database ${databaseName} no longer exists on this branch.`
    );
  }
  const roles = rolesRes.data.roles;
  const role = roles.find((r) => r.name === database.owner_name) ?? roles[0];
  if (!role) throw new Error("This branch has no role to connect with.");
  const uri = await neon.getConnectionUri({
    projectId,
    branch_id: branchId,
    database_name: database.name,
    role_name: role.name,
    pooled: true,
  });
  return { databaseName: database.name, uri: uri.data.uri };
}

/**
 * Runs `read` in one read-only transaction. Realtime prints intervals as
 * ISO 8601, so the server does too, and both sides render the same text.
 */
async function readOnly<T>(uri: string, read: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: uri });
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL IntervalStyle = iso_8601");
    const result = await read(client);
    await client.query("COMMIT");
    return result;
  } finally {
    client.release();
    await pool.end();
  }
}

async function primaryKeyOf(client: PoolClient, schema: string, table: string): Promise<string[]> {
  const relation = await client.query<{ oid: number }>(
    `SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2`,
    [schema, table]
  );
  if (relation.rows.length === 0) throw new TablePreviewNotFoundError(`Table ${schema}.${table} doesn't exist.`);
  // The first indnkeyatts entries are the key; the rest are INCLUDE columns.
  const key = await client.query<{ attname: string }>(
    `SELECT a.attname FROM pg_index i
     CROSS JOIN LATERAL unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, position)
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
     WHERE i.indrelid = $1 AND i.indisprimary AND k.position <= i.indnkeyatts
     ORDER BY k.position`,
    [relation.rows[0].oid]
  );
  return key.rows.map((row) => row.attname);
}

/** Reads one page of a table, every value as Postgres text. */
export async function loadTablePreview(projectId: string, branchId: string, target: PreviewTarget): Promise<TablePreview> {
  const { databaseName, uri } = await connectionUri(projectId, branchId);
  return readOnly(uri, async (client) => {
    const primaryKey = await primaryKeyOf(client, target.schema, target.table);
    const sql = previewSql(target, primaryKey);
    const result = await client.query<TableRow>({ text: sql, types: RAW_TEXT });
    return {
      databaseName,
      columns: result.fields.map((field) => ({ name: field.name, typeOid: field.dataTypeID })),
      rows: result.rows,
      primaryKey,
      sql,
    };
  });
}

/** Rebuilds a page's SQL for a renewal from the catalog alone, without reading rows. */
export async function tablePreviewSql(
  projectId: string,
  branchId: string,
  databaseName: string,
  target: PreviewTarget
): Promise<{ sql: string; primaryKey: string[] }> {
  const { uri } = await connectionUri(projectId, branchId, databaseName);
  return readOnly(uri, async (client) => {
    const primaryKey = await primaryKeyOf(client, target.schema, target.table);
    return { sql: previewSql(target, primaryKey), primaryKey };
  });
}
