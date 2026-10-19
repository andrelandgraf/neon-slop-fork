import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import { neon } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { relativeTime } from "@/lib/utils";
import { AddReplicaBanner } from "./add-replica-banner";
import { ComputeRow } from "./compute-row";

export const dynamic = "force-dynamic";

export default async function ComputesPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  const [{ data }, capabilities] = await Promise.all([
    neon.listProjectBranchEndpoints(projectId, branchId),
    getProjectCapabilities(projectId, defaultBranch.id),
  ]);
  const endpoints = [...data.endpoints].sort((a, b) =>
    a.type === b.type
      ? a.created_at.localeCompare(b.created_at)
      : a.type === "read_write"
        ? -1
        : 1
  );
  let replica = 0;

  return (
    <PageBody>
      <PageHeader title="Computes" project={project} branch={branch} />
      <div className="space-y-3">
        {endpoints.length === 0 && (
          <div className="rounded-[3px] border border-panel-border px-5 py-8 text-center text-muted-foreground text-sm">
            This branch has no compute.
          </div>
        )}
        {endpoints.map((endpoint) => {
          const label =
            endpoint.type === "read_write" ? "Primary" : `Read replica ${++replica}`;
          const since =
            endpoint.current_state === "active" ? endpoint.started_at : endpoint.suspended_at;
          return (
            <ComputeRow
              key={endpoint.id}
              projectId={projectId}
              branchId={branchId}
              label={label}
              capabilities={capabilities}
              sinceLabel={since ? relativeTime(since) : "—"}
              endpoint={{
                id: endpoint.id,
                name: endpoint.name ?? null,
                type: endpoint.type,
                current_state: endpoint.current_state,
                started_at: endpoint.started_at ?? null,
                suspended_at: endpoint.suspended_at ?? null,
                autoscaling_limit_min_cu: endpoint.autoscaling_limit_min_cu,
                autoscaling_limit_max_cu: endpoint.autoscaling_limit_max_cu,
                suspend_timeout_seconds: endpoint.suspend_timeout_seconds,
              }}
            />
          );
        })}
        <AddReplicaBanner projectId={projectId} branchId={branchId} />
      </div>
    </PageBody>
  );
}
