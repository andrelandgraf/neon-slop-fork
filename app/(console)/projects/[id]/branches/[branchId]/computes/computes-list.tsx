"use client";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useProjectLive } from "@/components/live/project-live";
import type { ProjectCapabilities } from "@/lib/capabilities";
import { relativeTime } from "@/lib/utils";
import { ComputeRow } from "./compute-row";

/** The branch's computes, primary first, then replicas by age; live. */
export function ComputesList({
  projectId,
  branchId,
  capabilities,
}: {
  projectId: string;
  branchId: string;
  capabilities: ProjectCapabilities;
}) {
  const live = useProjectLive();
  const { data } = useLiveQuery({
    query: (q) => q.from({ endpoint: live.endpoints }).where(({ endpoint }) => eq(endpoint.branch_id, branchId)),
  });
  const endpoints = [...data].sort((a, b) =>
    a.type === b.type ? a.created_at.getTime() - b.created_at.getTime() : a.type === "read_write" ? -1 : 1
  );
  let replica = 0;
  if (endpoints.length === 0) {
    return (
      <div className="rounded-[3px] border border-panel-border px-5 py-8 text-center text-muted-foreground text-sm">
        This branch has no compute.
      </div>
    );
  }
  return (
    <>
      {endpoints.map((endpoint) => {
        const label = endpoint.type === "read_write" ? "Primary" : `Read replica ${++replica}`;
        const since = endpoint.current_state === "active" ? endpoint.started_at : endpoint.suspended_at;
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
              name: endpoint.name,
              type: endpoint.type,
              current_state: endpoint.pending_state ?? endpoint.current_state,
              started_at: endpoint.started_at?.toISOString() ?? null,
              suspended_at: endpoint.suspended_at?.toISOString() ?? null,
              autoscaling_limit_min_cu: endpoint.autoscaling_limit_min_cu,
              autoscaling_limit_max_cu: endpoint.autoscaling_limit_max_cu,
              suspend_timeout_seconds: endpoint.suspend_timeout_seconds,
            }}
          />
        );
      })}
    </>
  );
}
