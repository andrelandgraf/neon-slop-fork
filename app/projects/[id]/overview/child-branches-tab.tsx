import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Clock } from "lucide-react";
import { relativeTime, relativeFuture } from "@/lib/utils";

interface BranchOpt {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  expires_at: string | null;
}

/**
 * Mirrors the "Child branches" sub-tab on the real Neon Branch
 * overview screen: lists every branch whose parent_id matches this
 * one, plus a deep link to switch into each.
 */
export function ChildBranchesTab({
  projectId,
  branchId,
  allBranches,
}: {
  projectId: string;
  branchId: string;
  allBranches: BranchOpt[];
}) {
  const children = allBranches.filter((b) => b.parent_id === branchId);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b">
        <div className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Child branches
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Branches forked from this one. Each is an independent copy-on-write
          snapshot.
        </p>
      </div>
      {children.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <GitBranch className="h-6 w-6 mx-auto mb-2 opacity-30" />
          No child branches yet.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Created</th>
              <th className="px-5 py-2 font-medium">Expires</th>
              <th className="px-5 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {children.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/projects/${projectId}/overview?branch=${b.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    {b.name}
                  </Link>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {b.id}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {relativeTime(b.created_at)}
                </td>
                <td className="px-5 py-3">
                  {b.expires_at ? (
                    <Badge variant="muted">
                      <Clock className="h-3 w-3" />
                      {relativeFuture(b.expires_at)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-xs">
                  <Link
                    href={`/projects/${projectId}/overview?branch=${b.id}`}
                    className="text-primary hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
