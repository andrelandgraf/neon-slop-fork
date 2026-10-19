import { PageBody, PageHeader } from "@/components/page-header";
import { neon } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { relativeTime } from "@/lib/utils";
import { AddDatabaseButton, DatabaseActions, ObjectRow } from "@/components/postgres-objects";

export const dynamic = "force-dynamic";

export default async function DatabasesPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch } = await loadBranch(projectId, branchId);
  const [roles, databases] = await Promise.all([
    neon.listProjectBranchRoles(projectId, branchId).then((r) => r.data.roles),
    neon.listProjectBranchDatabases(projectId, branchId).then((r) => r.data.databases),
  ]);

  return (
    <PageBody>
      <PageHeader
        title="Databases"
        project={project}
        branch={branch}
        actions={
          <AddDatabaseButton
            projectId={projectId}
            branchId={branchId}
            branchName={branch.name}
            roles={roles.filter((r) => !r.protected).map((r) => r.name)}
          />
        }
      />
      <p className="mb-4 text-sm">
        Manage the Postgres databases on this branch. For more information, see{" "}
        <a className="font-semibold text-link" href="https://neon.com/docs/manage/databases" target="_blank" rel="noreferrer">
          Manage databases.
        </a>
      </p>
      <div className="space-y-2">
        {databases.map((database) => (
          <ObjectRow
            key={database.name}
            name={database.name}
            columns={[
              { label: "Owner", value: database.owner_name },
              { label: "Created", value: relativeTime(database.created_at) },
              { label: "Last updated", value: relativeTime(database.updated_at) },
            ]}
            actions={
              <DatabaseActions projectId={projectId} branchId={branchId} databaseName={database.name} />
            }
          />
        ))}
      </div>
    </PageBody>
  );
}
