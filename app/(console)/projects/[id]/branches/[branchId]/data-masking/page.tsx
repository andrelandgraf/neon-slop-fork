import { ifFound, neon, neonRaw } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { LiveMasking } from "./live-masking";
import { columnKind } from "@/lib/masking/options";
import { MaskingEmptyState } from "./empty-state";
import type { MaskColumn } from "./masking-editor";

export const dynamic = "force-dynamic";

/** Schemas Postgres and PostgreSQL Anonymizer own; nothing in them is user data. */
const SYSTEM_SCHEMAS = new Set(["anon", "information_schema", "pg_catalog", "pg_toast"]);

export default async function DataMaskingPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch, branches } = await loadBranch(projectId, branchId);
  await ensureMirrored({ kind: "masking", projectId, branchId });
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId, branchId };
  const [status, liveStatus] = await Promise.all([
    ifFound(neonRaw.getAnonymizedStatus(projectId, branchId)),
    loadLive("masking-status", live),
  ]);

  if (!status) {
    return (
      <MaskingEmptyState
        projectId={projectId}
        branchId={branchId}
        branches={branches.map((b) => ({ id: b.id, name: b.name, default: b.default }))}
      />
    );
  }

  // Rules and the schema are unavailable until Neon finishes setting the
  // branch up, and the branch refuses connections while anonymization runs.
  const ready = status.state !== "created" && status.state !== "anonymizing";
  const [masking_rules, { data }] = await Promise.all([
    ready ? neonRaw.getMaskingRules(projectId, branchId).then((r) => r.masking_rules) : [],
    neon.listProjectBranchDatabases(projectId, branchId),
  ]);
  const columns: MaskColumn[] = ready
    ? (
        await Promise.all(
          data.databases.map(async (db) => {
            const { json } = await neonRaw.getBranchSchemaJson(projectId, branchId, db.name);
            return (json?.tables ?? [])
              .filter((t) => !SYSTEM_SCHEMAS.has(t.schema) && !t.schema.startsWith("pg_"))
              .flatMap((t) => {
                const keys = (type: string) =>
                  new Set((t.constraints ?? []).filter((c) => c.type === type).flatMap((c) => c.columns));
                const primary = keys("primary_key");
                const foreign = keys("foreign_key");
                return t.columns.map(
                  (c): MaskColumn => ({
                    database: db.name,
                    schema: t.schema,
                    table: t.name,
                    name: c.name,
                    type: c.type,
                    kind: columnKind(c.type),
                    nullable: c.nullable === true,
                    primaryKey: primary.has(c.name),
                    foreignKey: foreign.has(c.name),
                  })
                );
              });
          })
        )
      ).flat()
    : [];

  return (
    <LiveMasking
      status={liveStatus}
      serverState={status.state}
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
