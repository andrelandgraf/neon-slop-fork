import { PageBody, PageHeader } from "@/components/page-header";
import { dataApiDatabase, ifFound, neon, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { runProjectSql } from "@/lib/sql";
import { EnableDataApiCard } from "./enable-card";
import { DataApiOverview } from "./overview";

export const dynamic = "force-dynamic";

export default async function DataApiPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch } = await loadBranch(projectId, branchId);
  const { data } = await neon.listProjectBranchDatabases(projectId, branchId);
  const databaseName = dataApiDatabase(data.databases);
  if (!databaseName) {
    return (
      <PageBody>
        <PageHeader title="Data API" project={project} branch={branch} />
        <p className="text-sm">Create a database on this branch to use the Data API.</p>
      </PageBody>
    );
  }

  const dataApi = await ifFound(
    neonSdk.postgres.dataApi.get({ projectId, branchId, databaseName })
  );
  if (!dataApi) {
    return (
      <EnableDataApiCard projectId={projectId} branchId={branchId} databaseName={databaseName} />
    );
  }

  const [auth, tableStats] = await Promise.all([
    ifFound(neonSdk.auth.get({ projectId, branchId })),
    runProjectSql(
      projectId,
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT c.relrowsecurity)::int AS without_rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind = 'r' AND n.nspname = 'public'`,
      { branchId, databaseName }
    ),
  ]);
  const row = tableStats.rows[0];

  return (
    <PageBody>
      <PageHeader title="Data API" project={project} branch={branch} />
      <DataApiOverview
        projectId={projectId}
        branchId={branchId}
        databaseName={databaseName}
        url={dataApi.url}
        authEnabled={auth !== null}
        tables={{ total: Number(row?.total ?? 0), withoutRls: Number(row?.without_rls ?? 0) }}
      />
    </PageBody>
  );
}
