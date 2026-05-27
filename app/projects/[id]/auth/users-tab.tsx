import { runProjectSql } from "@/lib/sql";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, ExternalLink, UserPlus } from "lucide-react";
import { CreateUserDialog } from "./create-user-dialog";
import { DeleteUserButton } from "./delete-user-button";

interface SyncedUser {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  updated_at: string | null;
  raw_json: unknown;
}

/**
 * Users tab. The Neon REST API doesn't expose a "list users" endpoint —
 * Neon Auth mirrors users into `neon_auth.users_sync` on the database
 * itself, and that's where the upstream console reads them too. We
 * select straight from the sync table over the standard SQL pathway,
 * scoped to the branch the user picked.
 *
 * If Neon Auth was just enabled, the sync table may not exist yet on
 * the database — Neon provisions it asynchronously. We handle the
 * "relation neon_auth.users_sync does not exist" case as an empty list
 * rather than an error.
 */
export async function AuthUsersTab({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
  defaultBranchId: string;
}) {
  let users: SyncedUser[] = [];
  let queryError: string | null = null;
  try {
    const res = await runProjectSql(
      projectId,
      `select id,
              raw_json->>'primary_email' as email,
              raw_json->>'display_name' as name,
              created_at,
              updated_at,
              raw_json
         from neon_auth.users_sync
        where deleted_at is null
        order by created_at desc
        limit 100`,
      { branchId }
    );
    users = res.rows as unknown as SyncedUser[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // The sync table may not exist yet on a freshly-enabled Neon Auth.
    // Treat it as an empty list rather than a hard error.
    if (
      message.includes("neon_auth.users_sync") ||
      message.includes("does not exist") ||
      message.includes("relation")
    ) {
      users = [];
    } else {
      queryError = message;
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold">Users</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Users mirrored from{" "}
              <code className="text-[11px] font-mono">
                neon_auth.users_sync
              </code>
              . Sign-ups happen through your application&apos;s auth UI.
            </p>
          </div>
          <CreateUserDialog projectId={projectId} branchId={branchId} />
        </div>

        {queryError ? (
          <div className="text-xs text-destructive font-mono p-3 rounded-md border border-destructive/30 bg-destructive/5">
            {queryError}
          </div>
        ) : users.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {u.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteUserButton
                        projectId={projectId}
                        branchId={branchId}
                        userId={u.id}
                        userLabel={u.email ?? u.name ?? u.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-sm">
      <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div className="font-semibold mb-1">Ready for your first users</div>
      <p className="text-muted-foreground text-xs max-w-md mx-auto mb-3">
        Integrate Neon Auth into your application using the docs below, or
        create a user directly from the console for testing.
      </p>
      <div className="flex justify-center gap-2">
        <a
          href="https://neon.tech/docs/neon-auth/quick-start/nextjs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <UserPlus className="h-3 w-3" />
          Open quickstart
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
