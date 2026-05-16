import Link from "next/link";
import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  createRoleAction,
  deleteRoleAction,
  createDatabaseAction,
  deleteDatabaseAction,
} from "@/app/actions";
import { ResetPasswordButton } from "./reset-password-button";
import { relativeTime } from "@/lib/utils";
import { Plus, Trash2, User, Database } from "lucide-react";

/**
 * Two stacked sections — Roles and Databases — exactly like
 * console.neon.tech's Branch overview → Roles & Databases tab.
 *
 * Each section gets:
 *   - a brief description with a `Manage …` deep link to the same
 *     Neon docs page Neon links to,
 *   - an "Add role" / "Add database" CTA in the section header,
 *   - a table with delete affordances on each non-protected row.
 */
export async function RolesDatabasesTab({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const [rolesRes, dbRes] = await Promise.all([
    neon.listProjectBranchRoles(projectId, branchId),
    neon.listProjectBranchDatabases(projectId, branchId),
  ]);
  const roles = rolesRes.data.roles;
  const databases = dbRes.data.databases;

  return (
    <div className="space-y-5">
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 pb-3">
          <div>
            <div className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Roles
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage the Postgres roles on this branch. For more information,
              see{" "}
              <Link
                href="https://neon.com/docs/manage/roles"
                target="_blank"
                className="text-primary hover:underline"
              >
                Manage roles
              </Link>
              .
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form action={createRoleAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="branchId" value={branchId} />
                <DialogHeader>
                  <DialogTitle>Create role</DialogTitle>
                  <DialogDescription>
                    Roles are created on the selected branch. The password
                    is generated server-side and shown once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5 my-3">
                  <Label htmlFor="role-name">Name</Label>
                  <Input
                    id="role-name"
                    name="name"
                    placeholder="app_reader"
                    pattern="[a-z0-9_]+"
                    maxLength={63}
                    required
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <SubmitButton pendingLabel="Creating…">
                    Add role
                  </SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <table className="w-full text-sm border-t">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Created</th>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-5 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="px-5 py-3 font-mono font-medium">{r.name}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {relativeTime(r.created_at)}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {r.protected ? "Protected" : "User"}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap space-x-1">
                  <ResetPasswordButton
                    projectId={projectId}
                    branchId={branchId}
                    roleName={r.name}
                  />
                  {!r.protected && (
                    <form
                      className="inline"
                      action={async () => {
                        "use server";
                        await deleteRoleAction(projectId, branchId, r.name);
                      }}
                    >
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        pendingLabel="Deleting…"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 pb-3">
          <div>
            <div className="text-base font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Databases
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage the Postgres databases on this branch. For more
              information, see{" "}
              <Link
                href="https://neon.com/docs/manage/databases"
                target="_blank"
                className="text-primary hover:underline"
              >
                Manage databases
              </Link>
              .
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add database
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form action={createDatabaseAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="branchId" value={branchId} />
                <DialogHeader>
                  <DialogTitle>Create database</DialogTitle>
                  <DialogDescription>
                    Postgres databases are scoped to the selected branch.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 my-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="db-name">Name</Label>
                    <Input
                      id="db-name"
                      name="name"
                      placeholder="analytics"
                      pattern="[a-z0-9_]+"
                      maxLength={63}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="db-owner">Owner role</Label>
                    <select
                      id="db-owner"
                      name="ownerName"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      required
                    >
                      {roles.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <SubmitButton pendingLabel="Creating…">
                    Add database
                  </SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <table className="w-full text-sm border-t">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Owner</th>
              <th className="px-5 py-2 font-medium">Created</th>
              <th className="px-5 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {databases.map((d) => (
              <tr key={d.name} className="border-b last:border-0">
                <td className="px-5 py-3 font-mono font-medium">{d.name}</td>
                <td className="px-5 py-3 text-muted-foreground font-mono">
                  {d.owner_name}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {relativeTime(d.created_at)}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {databases.length > 1 && (
                    <form
                      action={async () => {
                        "use server";
                        await deleteDatabaseAction(
                          projectId,
                          branchId,
                          d.name
                        );
                      }}
                    >
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        pendingLabel="Deleting…"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
