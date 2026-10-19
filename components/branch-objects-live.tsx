"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { AddDatabaseButton, DatabaseActions, ObjectRow, RoleActions } from "@/components/postgres-objects";
import { useBranchDatabases, useBranchRoles } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { DatabaseRow, RoleRow } from "@/lib/live/queries";
import { relativeTime } from "@/lib/utils";
import { LiveStatus } from "@/components/live/live-status";
import { LocalTime } from "@/components/local-time";

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
  return { roles: liveRoles.data, databases: liveDatabases.data, queries: [liveRoles, liveDatabases] };
}

export function RolesList(seeds: Seeds) {
  const { roles, databases, queries } = useObjects(seeds);
  return (
    <div className="space-y-2">
      <LiveStatus queries={queries} />
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
              { label: "Created", value: <LocalTime date={role.created_at} format={relativeTime} /> },
              { label: "Last updated", value: <LocalTime date={role.updated_at} format={relativeTime} /> },
            ]}
            actions={<RoleActions projectId={seeds.projectId} branchId={seeds.branchId} roleName={role.name} />}
          />
        ))}
    </div>
  );
}

export function DatabasesList(seeds: Seeds) {
  const { databases, queries } = useObjects(seeds);
  return (
    <div className="space-y-2">
      <LiveStatus queries={queries} />
      {databases.map((database) => (
        <ObjectRow
          key={database.name}
          name={database.name}
          columns={[
            { label: "Owner", value: database.owner_name },
            { label: "Created", value: <LocalTime date={database.created_at} format={relativeTime} /> },
            { label: "Last updated", value: <LocalTime date={database.updated_at} format={relativeTime} /> },
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
