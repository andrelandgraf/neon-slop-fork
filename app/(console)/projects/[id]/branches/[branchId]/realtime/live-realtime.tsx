"use client";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Badge } from "@/components/ui/badge";
import { PageBody, PageHeader } from "@/components/page-header";
import { LiveStatus } from "@/components/live/live-status";
import { useBranchServices } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { BranchServiceRow } from "@/lib/live/queries";
import { RealtimeDisabled, RealtimeEnabled } from "./realtime-panel";

/** The Realtime page, switching between its enabled and disabled views as the branch's Realtime state changes. */
export function LiveRealtime({
  projectId,
  branchId,
  project,
  branch,
  services: seed,
}: {
  projectId: string;
  branchId: string;
  project: { id: string; name: string };
  branch: { id: string; name: string; default: boolean };
  services: LiveSeed<BranchServiceRow>;
}) {
  const services = useBranchServices(branchId, seed);
  const query = useLiveQuery({ query: (q) => q.from({ s: services }).where(({ s }) => eq(s.branch_id, branchId)) });
  const realtime = query.data[0]?.realtime;
  if (!realtime?.enabled) {
    return (
      <>
        <LiveStatus queries={[query]} />
        <RealtimeDisabled projectId={projectId} branchId={branchId} pending={realtime?.pending ?? false} />
      </>
    );
  }
  return (
    <PageBody>
      <PageHeader
        title={
          <>
            Realtime <Badge className="bg-primary/20 text-foreground">Beta</Badge>
          </>
        }
        project={project}
        branch={branch}
      />
      <LiveStatus queries={[query]} />
      <RealtimeEnabled
        projectId={projectId}
        branchId={branchId}
        endpointUrl={realtime.invocation_url ?? ""}
        pending={realtime.pending}
      />
    </PageBody>
  );
}
