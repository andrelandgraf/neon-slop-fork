import "server-only";
import { Pool, type QueryResult } from "@neondatabase/serverless";
import { neon } from "@/lib/neon";
import { splitSqlStatements } from "@/lib/sql-split";

/**
 * Fetch a connection URI for the project's default branch and database,
 * then execute the given SQL. Returns rows + column metadata.
 */
export async function runProjectSql(
  projectId: string,
  sql: string,
  opts?: { branchId?: string; databaseName?: string; roleName?: string }
): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}> {
  const branchId =
    opts?.branchId ?? (await getDefaultBranchId(projectId));
  const { databaseName, roleName } = await getDatabaseAndRole(
    projectId,
    branchId,
    opts?.databaseName,
    opts?.roleName
  );

  const uriRes = await neon.getConnectionUri({
    projectId,
    branch_id: branchId,
    database_name: databaseName,
    role_name: roleName,
    pooled: true,
  });

  const connectionString = uriRes.data.uri;
  const pool = new Pool({ connectionString });
  try {
    const started = Date.now();
    const statements = splitSqlStatements(sql);
    if (statements.length === 0) {
      throw new Error("Empty query.");
    }
    let lastResult: QueryResult<Record<string, unknown>> | null = null;
    for (const stmt of statements) {
      lastResult = await pool.query<Record<string, unknown>>(stmt);
    }
    const durationMs = Date.now() - started;
    if (!lastResult) throw new Error("No result.");

    const fields = lastResult.fields ?? [];
    const columns: string[] =
      fields.length > 0
        ? fields.map((f: { name: string }) => f.name)
        : Object.keys(lastResult.rows?.[0] ?? {});
    return {
      columns,
      rows: lastResult.rows ?? [],
      rowCount:
        typeof lastResult.rowCount === "number"
          ? lastResult.rowCount
          : (lastResult.rows?.length ?? 0),
      durationMs,
    };
  } finally {
    await pool.end();
  }
}

export async function getDefaultBranchId(projectId: string): Promise<string> {
  const res = await neon.listProjectBranches({ projectId });
  const def = res.data.branches.find((b) => b.default) ?? res.data.branches[0];
  if (!def) throw new Error(`Project ${projectId} has no branches`);
  return def.id;
}

export async function getDatabaseAndRole(
  projectId: string,
  branchId: string,
  databaseName?: string,
  roleName?: string
): Promise<{ databaseName: string; roleName: string }> {
  const [dbRes, rolesRes] = await Promise.all([
    neon.listProjectBranchDatabases(projectId, branchId),
    neon.listProjectBranchRoles(projectId, branchId),
  ]);
  const dbs = dbRes.data.databases;
  const roles = rolesRes.data.roles;
  const db =
    (databaseName && dbs.find((d) => d.name === databaseName)) ?? dbs[0];
  if (!db) throw new Error("No database on branch");
  const role =
    (roleName && roles.find((r) => r.name === roleName)) ??
    roles.find((r) => r.name === db.owner_name) ??
    roles[0];
  if (!role) throw new Error("No role on branch");
  return { databaseName: db.name, roleName: role.name };
}
