"use client";
import Link from "next/link";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useIdentity, useShellCollections } from "@/components/live/live-root";
import { LiveStatus } from "@/components/live/live-status";
import { formatDate } from "@/lib/format";
import { useOrgMembers } from "@/lib/live/hooks";
import type { LiveSeed } from "@/lib/live/load";
import type { OrgMemberRow } from "@/lib/live/queries";

export function PeopleTables({ members: seed }: { members: LiveSeed<OrgMemberRow> }) {
  const identity = useIdentity();
  const shell = useShellCollections();
  const membersCollection = useOrgMembers(seed);
  const members = useLiveQuery((q) =>
    q.from({ member: membersCollection }).orderBy(({ member }) => member.joined_at, "asc")
  );
  const projects = useLiveQuery((q) =>
    q.from({ project: shell.projects }).orderBy(({ project }) => project.created_at, "desc")
  );
  const org = useLiveQuery({ query: (q) => q.from({ org: shell.orgs }).where(({ org }) => eq(org.id, identity.orgId)) });
  return (
    <div className="max-w-[860px] space-y-8">
      <section>
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">Members</h2>
          <LiveStatus queries={[members, projects]} />
        </div>
        <p className="mb-3 text-sm">
          Members of {org.data[0]?.name}. Every member can see and manage its projects.
        </p>
        <Table
          columns={["Name", "Email", "Role", "Joined"]}
          rows={members.data.map((m) => ({
            key: m.id,
            cells: [m.name, m.email, m.role === "owner" ? "Admin" : "Member", formatDate(m.joined_at)],
          }))}
        />
      </section>
      <section>
        <h2 className="font-semibold text-lg">Your project access</h2>
        <p className="mb-3 text-sm">Projects available to you in this organization.</p>
        <Table
          columns={["Project", "Access"]}
          rows={projects.data.map((p) => ({
            key: p.id,
            cells: [
              <Link key={p.id} href={`/projects/${p.id}`} className="hover:underline">
                {p.name}
              </Link>,
              "Admin",
            ],
          }))}
          empty="No projects yet."
        />
      </section>
      <section>
        <h2 className="font-semibold text-lg">Pending invites</h2>
        <p className="text-muted-foreground text-sm">There are no pending invites at the moment.</p>
      </section>
    </div>
  );
}

function Table({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
  empty?: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left">
        <tr className="border-panel-border border-b">
          {columns.map((c) => (
            <th key={c} className="px-3 py-2.5 font-semibold">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
              {empty}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.key} className="border-panel-border border-b">
            {row.cells.map((cell, j) => (
              <td key={j} className="px-3 py-2.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
