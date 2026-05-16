import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/operations`
 *
 * The control plane's operation log. Every state change in Neon
 * (create branch, start endpoint, restore, suspend, …) produces an
 * Operation row, with a status and timing info. The public API
 * exposes the same list at `GET /projects/{id}/operations`.
 */
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { id } = await params;
  const { cursor } = await searchParams;
  const res = await neon.listProjectOperations({
    projectId: id,
    limit: 50,
    cursor,
  });
  const ops = res.data.operations;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Operations</h1>
        <span className="text-xs text-muted-foreground">
          {ops.length} most recent
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Every state change in the project &mdash; from create_branch to
        start_compute &mdash; produces an operation row with timing and status.
        The list is paginated and sourced from{" "}
        <code className="text-xs">GET /projects/{`{id}`}/operations</code>.
      </p>

      <Card className="p-0 overflow-hidden">
        {ops.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <ScrollText className="h-6 w-6 mx-auto mb-2 opacity-30" />
            No operations yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Branch / Endpoint</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op) => {
                const started = op.created_at;
                const ended = op.updated_at;
                const durationMs = started && ended
                  ? new Date(ended).getTime() - new Date(started).getTime()
                  : null;
                return (
                  <tr key={op.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {op.action}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={op.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {op.branch_id ?? op.endpoint_id ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {relativeTime(op.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {durationMs == null
                        ? "—"
                        : durationMs > 1000
                          ? `${(durationMs / 1000).toFixed(1)}s`
                          : `${durationMs}ms`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    finished: "bg-emerald-50 text-emerald-700 border-emerald-200",
    running: "bg-amber-50 text-amber-700 border-amber-200",
    scheduling: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    error: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-50 text-gray-700 border-gray-200",
    cancelling: "bg-gray-50 text-gray-700 border-gray-200",
  };
  const cls = colors[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <Badge variant="muted" className={`border ${cls}`}>
      {status}
    </Badge>
  );
}
