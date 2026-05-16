import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComputeRow } from "./compute-row";
import { AddReadReplica } from "./add-read-replica";
import { Cpu } from "lucide-react";
import { relativeTime } from "@/lib/utils";

export async function ComputesTab({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const eRes = await neon.listProjectEndpoints(projectId);
  const endpoints = eRes.data.endpoints
    .filter((ep) => ep.branch_id === branchId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "read_write" ? -1 : 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const replicas = endpoints.filter((ep) => ep.type === "read_only");
  const branchName = (await neon
    .listProjectBranches({ projectId })
    .then((r) => r.data.branches.find((b) => b.id === branchId)?.name)) ?? "main";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Computes attached to this branch. Each replica gets its own
          connection string and autoscaling envelope.
        </p>
        <AddReadReplica
          projectId={projectId}
          branchId={branchId}
          branchName={branchName}
          replicaCount={replicas.length}
        />
      </div>

      {endpoints.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Cpu className="h-6 w-6 mx-auto mb-2 opacity-40" />
          No compute endpoints attached to this branch.
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <ComputeRow
              key={ep.id}
              projectId={projectId}
              endpoint={{
                id: ep.id,
                type: ep.type,
                current_state: ep.current_state,
                disabled: ep.disabled ?? false,
                host: ep.host,
                region_id: ep.region_id,
                last_active: ep.last_active ?? null,
                autoscaling_limit_min_cu: ep.autoscaling_limit_min_cu,
                autoscaling_limit_max_cu: ep.autoscaling_limit_max_cu,
                suspend_timeout_seconds: ep.suspend_timeout_seconds ?? 0,
              }}
              relativeLastActive={
                ep.last_active ? relativeTime(ep.last_active) : "—"
              }
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        <Badge variant="muted">Beta</Badge> Connection-pool limits and
        autoscaling caps depend on the project plan.
      </p>
    </div>
  );
}
