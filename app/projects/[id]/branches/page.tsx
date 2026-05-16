import { neon } from "@/lib/neon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { createBranchAction, deleteBranchAction } from "@/app/actions";
import { relativeTime } from "@/lib/utils";
import { GitBranch, Plus, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await neon.listProjectBranches({ projectId: id });
  const branches = res.data.branches;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {branches.length} of 5000 branches
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={createBranchAction}>
              <input type="hidden" name="projectId" value={id} />
              <DialogHeader>
                <DialogTitle>Create branch</DialogTitle>
                <DialogDescription>
                  A new branch is forked from the project&apos;s default branch.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 my-3">
                <Label htmlFor="name">Branch name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="dev-feature-x"
                  maxLength={64}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Parent
              </th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const parent = branches.find((x) => x.id === b.parent_id);
              return (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{b.name}</span>
                      {b.default && <Badge variant="muted">Default</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {b.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {parent?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {relativeTime(b.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!b.default && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteBranchAction(id, b.id);
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
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
