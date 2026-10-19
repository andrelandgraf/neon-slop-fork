import { PageBody, PageHeader } from "@/components/page-header";
import { ifFound, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { runProjectSql } from "@/lib/sql";
import { formatDateTime } from "@/lib/format";
import { AuthLinks, EnableAuth, NoUsers, SignupBanner } from "./auth-panels";
import { CreateUserDialog } from "./create-user-dialog";
import { DeleteUserButton } from "./delete-user-button";

export const dynamic = "force-dynamic";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  createdAt: string;
}

function toAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    emailVerified: row.emailVerified === true,
    role: typeof row.role === "string" ? row.role : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch } = await loadBranch(projectId, branchId);
  const auth = await ifFound(neonSdk.auth.get({ projectId, branchId }));
  if (!auth) return <EnableAuth projectId={projectId} branchId={branchId} />;

  // Managed Better Auth keeps users in the `neon_auth` schema of the
  // database it was enabled on.
  const { rows } = await runProjectSql(
    projectId,
    `SELECT id, name, email, "emailVerified", role, "createdAt"
       FROM neon_auth."user" ORDER BY "createdAt" DESC LIMIT 100`,
    { branchId, databaseName: auth.db_name }
  );
  const users = rows.map(toAuthUser);
  const configureHref = `/projects/${projectId}/settings/auth?branch=${branchId}`;
  const createUser = <CreateUserDialog projectId={projectId} branchId={branchId} />;

  return (
    <PageBody>
      <PageHeader
        title="Better Auth"
        project={project}
        branch={branch}
        description={
          <>
            Serverless authentication that branches with your database. Powered by{" "}
            <a className="font-semibold text-link" href="https://www.better-auth.com" target="_blank" rel="noreferrer">
              Better Auth
            </a>
          </>
        }
      />
      <SignupBanner />
      <div className="mb-5 border-panel-border border-b">
        <span className="-mb-px inline-block border-primary border-b-2 pb-2 font-semibold text-sm">Users</span>
      </div>
      {users.length === 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-[3px] border border-panel-border px-5 py-4">
            <span className="size-1.5 rounded-full bg-primary" />
            <div className="flex-1 text-sm">
              <div>Waiting for users to sign up to your app.</div>
              <div className="text-muted-foreground text-xs">
                Your users&apos; data will be added to the{" "}
                <code className="font-mono">neon_auth</code> schema on your database.
              </div>
            </div>
            <AuthLinks configureHref={configureHref} />
          </div>
          <NoUsers configureHref={configureHref} createUser={createUser} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            {createUser}
            <AuthLinks configureHref={configureHref} />
          </div>
          <div className="overflow-hidden rounded-[3px] border border-panel-border">
            <table className="w-full text-sm">
              <thead className="bg-table-head text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Created</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-panel-border border-t">
                    <td className="px-4 py-2">{user.name || "—"}</td>
                    <td className="px-4 py-2">
                      {user.email}
                      {!user.emailVerified && (
                        <span className="ml-2 text-muted-foreground text-xs">unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{user.role ?? "user"}</td>
                    <td className="px-4 py-2">{formatDateTime(user.createdAt)}</td>
                    <td className="px-2 py-2">
                      <DeleteUserButton
                        projectId={projectId}
                        branchId={branchId}
                        userId={user.id}
                        userLabel={user.email}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageBody>
  );
}
