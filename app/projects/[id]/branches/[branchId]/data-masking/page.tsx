import { ifFound, neon, neonRaw } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { runProjectSql } from "@/lib/sql";
import { columnKind } from "@/lib/masking/options";
import { MaskingEmptyState } from "./empty-state";
import { MaskingEditor, type MaskColumn } from "./masking-editor";

export const dynamic = "force-dynamic";

const COLUMNS_SQL = `
SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.udt_name,
       c.is_nullable = 'YES' AS nullable,
       EXISTS (
         SELECT 1 FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage k
           ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY' AND k.table_schema = c.table_schema
           AND k.table_name = c.table_name AND k.column_name = c.column_name
       ) AS primary_key,
       EXISTS (
         SELECT 1 FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage k
           ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY' AND k.table_schema = c.table_schema
           AND k.table_name = c.table_name AND k.column_name = c.column_name
       ) AS foreign_key
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'anon')
  AND c.table_schema NOT LIKE 'pg_%'
ORDER BY c.table_schema, c.table_name, c.ordinal_position`;

export default async function DataMaskingPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, branches } = await loadBranch(projectId, branchId);
  const status = await ifFound(neonRaw.getAnonymizedStatus(projectId, branchId));

  if (!status) {
    return (
      <MaskingEmptyState
        projectId={projectId}
        branchId={branchId}
        branches={branches.map((b) => ({ id: b.id, name: b.name, default: b.default }))}
      />
    );
  }

  const [{ masking_rules }, { data }] = await Promise.all([
    neonRaw.getMaskingRules(projectId, branchId),
    neon.listProjectBranchDatabases(projectId, branchId),
  ]);
  // The branch refuses connections while anonymization runs.
  const ready = status.state !== "anonymizing";
  const columns: MaskColumn[] = ready
    ? (
        await Promise.all(
          data.databases.map(async (db) => {
            const { rows } = await runProjectSql(projectId, COLUMNS_SQL, {
              branchId,
              databaseName: db.name,
            });
            return rows.map(
              (r): MaskColumn => ({
                database: db.name,
                schema: String(r.table_schema),
                table: String(r.table_name),
                name: String(r.column_name),
                type: String(r.udt_name),
                kind: columnKind(String(r.data_type), String(r.udt_name)),
                nullable: r.nullable === true,
                primaryKey: r.primary_key === true,
                foreignKey: r.foreign_key === true,
              })
            );
          })
        )
      ).flat()
    : [];

  return (
    <MaskingEditor
      projectId={projectId}
      branchId={branchId}
      project={project}
      branch={branch}
      state={status.state}
      statusMessage={status.status_message}
      columns={columns}
      rules={masking_rules}
    />
  );
}
