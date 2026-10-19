import { requireCapability } from "@/lib/capabilities";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { loadBranch } from "@/lib/project-context";
import { LiveRealtime } from "./live-realtime";

export const dynamic = "force-dynamic";

export default async function RealtimePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "realtime");
  await ensureMirrored({ kind: "services", projectId, branchId });
  const services = await loadLive("branch-services", {
    userId: tenant.session.user.id,
    orgId: tenant.activeOrg.id,
    projectId,
    branchId,
  });
  return (
    <LiveRealtime
      projectId={projectId}
      branchId={branchId}
      project={{ id: project.id, name: project.name }}
      branch={{ id: branch.id, name: branch.name, default: branch.default }}
      services={services}
    />
  );
}
