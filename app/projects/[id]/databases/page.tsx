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
import { createDatabaseAction, deleteDatabaseAction } from "@/app/actions";
import { relativeTime } from "@/lib/utils";
import { Plus, Trash2, Database } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DatabasesPage({
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

  const [dbRes, rolesRes] = await Promise.all([
    neon.listProjectBranchDatabases(id, activeBranch.id),
    neon.listProjectBranchRoles(id, activeBranch.id),
  ]);
  const databases = dbRes.data.databases;
  const roles = rolesRes.data.roles;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Databases</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New database
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={createDatabaseAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="branchId" value={activeBranch.id} />
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
                <Button type="submit">Create database</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Postgres databases on branch{" "}
        <span className="font-mono">{activeBranch.name}</span>. The default
        Neon database is <code className="text-xs">neondb</code>.
      </p>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {databases.map((d) => (
              <tr key={d.name} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono font-medium">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono">
                  {d.owner_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {relativeTime(d.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {databases.length > 1 && (
                    <form
                      action={async () => {
                        "use server";
                        await deleteDatabaseAction(id, activeBranch.id, d.name);
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
