"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { AddDatabaseButton, DatabaseActions, ObjectRow, RoleActions } from "@/components/postgres-objects";
import { useBranchDatabases, useBranchRoles } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { DatabaseRow, RoleRow } from "@/lib/live/queries";
import { relativeTime } from "@/lib/utils";

interface Seeds {
  projectId: string;
  branchId: string;
  roles: LiveSeed<RoleRow>;
  databases: LiveSeed<DatabaseRow>;
}

function useObjects({ branchId, roles, databases }: Seeds) {
  const rolesCollection = useBranchRoles(branchId, roles);
  const databasesCollection = useBranchDatabases(branchId, databases);
  const liveRoles = useLiveQuery((q) => q.from({ role: rolesCollection }).orderBy(({ role }) => role.created_at, "asc"));
  const liveDatabases = useLiveQuery((q) =>
    q.from({ database: databasesCollection }).orderBy(({ database }) => database.created_at, "asc")
  );
  return { roles: liveRoles.data, databases: liveDatabases.data };
}

export function RolesList(seeds: Seeds) {
  const { roles, databases } = useObjects(seeds);
  return (
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
            actions={<RoleActions projectId={seeds.projectId} branchId={seeds.branchId} roleName={role.name} />}
          />
        ))}
    </div>
  );
}

export function DatabasesList(seeds: Seeds) {
  const { databases } = useObjects(seeds);
  return (
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
          actions={<DatabaseActions projectId={seeds.projectId} branchId={seeds.branchId} databaseName={database.name} />}
        />
      ))}
    </div>
  );
}

/** "Add database" with the branch's live role list as owner options. */
export function LiveAddDatabaseButton({ branchName, ...seeds }: Seeds & { branchName: string }) {
  const { roles } = useObjects(seeds);
  return (
    <AddDatabaseButton
      projectId={seeds.projectId}
      branchId={seeds.branchId}
      branchName={branchName}
      roles={roles.filter((r) => !r.protected).map((r) => r.name)}
    />
  );
}
