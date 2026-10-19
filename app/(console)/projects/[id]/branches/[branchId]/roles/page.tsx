import { PageBody, PageHeader } from "@/components/page-header";
import { neon } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { relativeTime } from "@/lib/utils";
import { AddRoleButton, ObjectRow, RoleActions } from "@/components/postgres-objects";

export const dynamic = "force-dynamic";

export default async function RolesPage({
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
        title="Roles"
        project={project}
        branch={branch}
        actions={<AddRoleButton projectId={projectId} branchId={branchId} branchName={branch.name} />}
      />
      <p className="mb-4 text-sm">
        Manage the Postgres roles on this branch. For more information, see{" "}
        <a className="font-semibold text-link" href="https://neon.com/docs/manage/roles" target="_blank" rel="noreferrer">
          Manage roles.
        </a>
      </p>
      <div className="space-y-2">
        {roles
          .filter((role) => !role.protected)
          .map((role) => (
            <ObjectRow
              key={role.name}
              name={role.name}
              columns={[
                {
                  label: "Owns",
                  value:
                    databases
                      .filter((d) => d.owner_name === role.name)
                      .map((d) => d.name)
                      .join(", ") || "—",
                },
                { label: "Created", value: relativeTime(role.created_at) },
                { label: "Last updated", value: relativeTime(role.updated_at) },
              ]}
              actions={<RoleActions projectId={projectId} branchId={branchId} roleName={role.name} />}
            />
          ))}
      </div>
    </PageBody>
  );
}
