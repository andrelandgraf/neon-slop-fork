import { neon } from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { relativeTime, relativeFuture } from "@/lib/utils";
import { GitBranch, Clock } from "lucide-react";
import { BranchRowActions } from "./branch-row-actions";
import { CreateBranchDialog } from "./create-branch-dialog";

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
        <CreateBranchDialog
          projectId={id}
          branches={branches.map((b) => ({
            id: b.id,
            name: b.name,
            default: b.default,
          }))}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-4 py-2.5 font-mono font-medium text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2.5 font-mono font-medium text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Parent
              </th>
              <th className="px-4 py-2.5 font-mono font-medium text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const parent = branches.find((x) => x.id === b.parent_id);
              const expiresAt = (b as { expires_at?: string }).expires_at;
              return (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{b.name}</span>
                      {b.default && <Badge variant="secondary">Default</Badge>}
                      {expiresAt && (
                        <Badge
                          variant="secondary"
                          title={`Auto-deletes at ${new Date(expiresAt).toLocaleString()}`}
                        >
                          <Clock className="h-3 w-3" />
                          Expires {relativeFuture(expiresAt)}
                        </Badge>
                      )}
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
                      <BranchRowActions
                        branchId={b.id}
                        canSetDefault={!expiresAt}
                        projectId={id}
                        setDefaultDisabledReason="A branch with an expiration date cannot be the default branch."
                      />
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
