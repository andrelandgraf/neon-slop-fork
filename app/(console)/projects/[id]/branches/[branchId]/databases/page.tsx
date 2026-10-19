import { PageBody, PageHeader } from "@/components/page-header";
import { loadBranch } from "@/lib/project-context";
import { DatabasesList, LiveAddDatabaseButton } from "@/components/branch-objects-live";
import { loadLive } from "@/lib/live/load";
import { ensureBranchMirrored } from "@/lib/mirror/sync";

export const dynamic = "force-dynamic";

export default async function DatabasesPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch } = await loadBranch(projectId, branchId);
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId, branchId };
  await ensureBranchMirrored(projectId, branchId);
  const [roles, databases] = await Promise.all([loadLive("roles", live), loadLive("databases", live)]);
  const seeds = { projectId, branchId, roles, databases };

  return (
    <PageBody>
      <PageHeader
        title="Databases"
        project={project}
        branch={branch}
        actions={
          <LiveAddDatabaseButton {...seeds} branchName={branch.name} />
        }
      />
      <p className="mb-4 text-sm">
        Manage the Postgres databases on this branch. For more information, see{" "}
        <a className="font-semibold text-link" href="https://neon.com/docs/manage/databases" target="_blank" rel="noreferrer">
          Manage databases.
        </a>
      </p>
      <DatabasesList {...seeds} />
    </PageBody>
  );
}
