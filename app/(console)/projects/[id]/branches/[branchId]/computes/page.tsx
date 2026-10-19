import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import { loadBranch } from "@/lib/project-context";
import { AddReplicaBanner } from "./add-replica-banner";
import { ComputesList } from "./computes-list";

export const dynamic = "force-dynamic";

export default async function ComputesPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  const capabilities = await getProjectCapabilities(projectId, defaultBranch.id);

  return (
    <PageBody>
      <PageHeader title="Computes" project={project} branch={branch} />
      <div className="space-y-3">
        <ComputesList projectId={projectId} branchId={branchId} capabilities={capabilities} />
        <AddReplicaBanner projectId={projectId} branchId={branchId} />
      </div>
    </PageBody>
  );
}
