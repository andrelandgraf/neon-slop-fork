import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createRoleAction, deleteRoleAction } from "@/app/actions";
import { ResetPasswordButton } from "./reset-password-button";
import { relativeTime } from "@/lib/utils";
import { Plus, Trash2, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const bRes = await neon.listProjectBranches({ projectId: id });
  const defaultBranch =
    bRes.data.branches.find((b) => b.default) ?? bRes.data.branches[0];
  const activeBranch =
    bRes.data.branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const rolesRes = await neon.listProjectBranchRoles(id, activeBranch.id);
  const roles = rolesRes.data.roles;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Roles</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={createRoleAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="branchId" value={activeBranch.id} />
              <DialogHeader>
                <DialogTitle>Create role</DialogTitle>
                <DialogDescription>
                  Roles are created on the selected branch. The password is
                  generated server-side and shown to you once.
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
                <span className="text-[11px] text-muted-foreground">
                  Lowercase, digits and underscores only.
                </span>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Create role</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Postgres roles on branch{" "}
        <span className="font-mono">{activeBranch.name}</span>. Operations use
        the public API directly: <code className="text-xs">POST/DELETE
        /projects/{`{id}`}/branches/{`{branch}`}/roles</code>.
      </p>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {relativeTime(r.created_at)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.protected ? "Protected" : "User"}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <ResetPasswordButton
                    projectId={id}
                    branchId={activeBranch.id}
                    roleName={r.name}
                  />
                  {!r.protected && (
                    <form
                      className="inline"
                      action={async () => {
                        "use server";
                        await deleteRoleAction(id, activeBranch.id, r.name);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
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
