import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { loadOrgProjects } from "@/lib/project-context";
import { listOrgMembers, requireTenant } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const tenant = await requireTenant("/org/people");
  const [members, projects] = await Promise.all([
    listOrgMembers(tenant.activeOrg.id),
    loadOrgProjects(tenant.activeOrg.id),
  ]);
  return (
    <PageBody>
      <PageHeader
        title="People"
        actions={
          <Button disabled title="This clone doesn't send email, so it can't deliver invites.">
            Invite member
          </Button>
        }
      />
      <div className="max-w-[860px] space-y-8">
        <section>
          <h2 className="font-semibold text-lg">Members</h2>
          <p className="mb-3 text-sm">Members of {tenant.activeOrg.name}. Every member can see and manage its projects.</p>
          <Table
            columns={["Name", "Email", "Role", "Joined"]}
            rows={members.map((m) => [
              m.name,
              m.email,
              m.role === "owner" ? "Admin" : "Member",
              m.joinedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            ])}
          />
        </section>
        <section>
          <h2 className="font-semibold text-lg">Your project access</h2>
          <p className="mb-3 text-sm">Projects available to you in this organization.</p>
          <Table
            columns={["Project", "Access"]}
            rows={projects.map((p) => [
              <Link key={p.id} href={`/projects/${p.id}`} className="hover:underline">
                {p.name}
              </Link>,
              "Admin",
            ])}
            empty="No projects yet."
          />
        </section>
        <section>
          <h2 className="font-semibold text-lg">Pending invites</h2>
          <p className="text-muted-foreground text-sm">There are no pending invites at the moment.</p>
        </section>
      </div>
    </PageBody>
  );
}

function Table({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: React.ReactNode[][];
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
        {rows.map((row, i) => (
          <tr key={i} className="border-panel-border border-b">
            {row.map((cell, j) => (
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
