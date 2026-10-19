import { PageBody, PageHeader } from "@/components/page-header";
import { dataApiDatabase, neon } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { LiveDataApi } from "./live-data-api";
import { runProjectSql } from "@/lib/sql";

export const dynamic = "force-dynamic";

export default async function DataApiPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch } = await loadBranch(projectId, branchId);
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

  await ensureMirrored({ kind: "services", projectId, branchId });
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId, branchId };
  const [dataApis, services, tableStats] = await Promise.all([
    loadLive("data-apis", live),
    loadLive("branch-services", live),
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
    <LiveDataApi
      projectId={projectId}
      branchId={branchId}
      databaseName={databaseName}
      project={{ id: project.id, name: project.name }}
      branch={{ id: branch.id, name: branch.name, default: branch.default }}
      tables={{ total: Number(row?.total ?? 0), withoutRls: Number(row?.without_rls ?? 0) }}
      dataApis={dataApis}
      services={services}
    />
  );
}
