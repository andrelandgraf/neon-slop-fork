import { Badge } from "@/components/ui/badge";
import { PageBody, PageHeader } from "@/components/page-header";
import { requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { RealtimeDisabled, RealtimeEnabled } from "./realtime-panel";

export const dynamic = "force-dynamic";

export default async function RealtimePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "realtime");
  const realtime = await neonSdk.realtime.get({ projectId, branchId });

  if (!realtime.enabled) {
    return (
      <RealtimeDisabled projectId={projectId} branchId={branchId} pending={realtime.pending} />
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
      <RealtimeEnabled
        projectId={projectId}
        branchId={branchId}
        endpointUrl={realtime.invocation_url ?? ""}
        pending={realtime.pending}
      />
    </PageBody>
  );
}
