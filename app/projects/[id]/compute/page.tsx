import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EndpointCard } from "./endpoint-card";
import { AddReadReplica } from "./add-read-replica";
import { Cpu, Play, PauseCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComputePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const [bRes, eRes] = await Promise.all([
    neon.listProjectBranches({ projectId: id }),
    neon.listProjectEndpoints(id),
  ]);
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranchId = branchParam ?? defaultBranch.id;
  const activeBranchName =
    branches.find((b) => b.id === activeBranchId)?.name ?? "main";

  const branchEndpoints = eRes.data.endpoints.filter(
    (ep) => ep.branch_id === activeBranchId
  );
  // Sort: primary read/write first, then read replicas in creation order.
  branchEndpoints.sort((a, b) => {
    if (a.type !== b.type) return a.type === "read_write" ? -1 : 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const hasPrimary = branchEndpoints.some((ep) => ep.type === "read_write");
  const replicas = branchEndpoints.filter((ep) => ep.type === "read_only");

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-1 gap-4">
        <h1 className="text-xl font-semibold">Compute</h1>
        <AddReadReplica
          projectId={id}
          branchId={activeBranchId}
          branchName={activeBranchName}
          replicaCount={replicas.length}
        />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Endpoints attached to branch{" "}
        <span className="font-mono">{activeBranchName}</span>. Start, suspend,
        tune autoscaling, or fan out reads to additional replicas — all backed
        by <code className="text-xs">/projects/{`{id}`}/endpoints</code>.
      </p>

      {branchEndpoints.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Cpu className="h-6 w-6 mx-auto mb-2 opacity-40" />
          No compute endpoints attached to this branch.
        </Card>
      ) : (
        <div className="space-y-4">
          {branchEndpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              projectId={id}
              endpoint={{
                id: ep.id,
                type: ep.type,
                current_state: ep.current_state,
                disabled: ep.disabled ?? false,
                host: ep.host,
                region_id: ep.region_id,
                pooler_enabled: ep.pooler_enabled ?? false,
                pooler_mode: ep.pooler_mode ?? null,
                last_active: ep.last_active ?? null,
                autoscaling_limit_min_cu: ep.autoscaling_limit_min_cu,
                autoscaling_limit_max_cu: ep.autoscaling_limit_max_cu,
                suspend_timeout_seconds: ep.suspend_timeout_seconds ?? 0,
              }}
              // The primary read/write endpoint is critical infra — the
              // Neon API would refuse to delete it anyway, but the UI
              // hides the action entirely to keep the flow obvious.
              deletable={ep.type !== "read_write"}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Play className="h-3 w-3" /> Start triggers a{" "}
          <code>start_compute</code> op.
        </span>
        <span className="inline-flex items-center gap-1">
          <PauseCircle className="h-3 w-3" /> Suspend triggers a{" "}
          <code>suspend_compute</code> op.
        </span>
        <span className="inline-flex items-center gap-1">
          <Cpu className="h-3 w-3" /> Each replica gets its own connection
          string and autoscaling envelope.
        </span>
        {!hasPrimary && (
          <Badge variant="warn">No primary endpoint on this branch</Badge>
        )}
      </div>
    </div>
  );
}
