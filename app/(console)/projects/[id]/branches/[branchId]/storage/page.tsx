import { ConnectDialog } from "@/components/connect/connect-dialog";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities, requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { BucketTable } from "./bucket-table";
import { CreateBucketDialog } from "./create-bucket-dialog";

export const dynamic = "force-dynamic";

export default async function StoragePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "storage");
  await ensureMirrored({ kind: "services", projectId, branchId });
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId, branchId };
  const [buckets, storage, capabilities] = await Promise.all([
    loadLive("buckets", live),
    neonSdk.storage.get({ projectId, branchId }),
    getProjectCapabilities(projectId, defaultBranch.id),
  ]);

  return (
    <PageBody>
      <PageHeader
        title="Storage"
        project={project}
        branch={branch}
        description="S3-compatible object storage for this project. Create buckets, then connect with any S3 client using a Neon API key."
      />
      <BucketTable
        projectId={projectId}
        branchId={branchId}
        buckets={buckets}
        actions={
          <>
            <ConnectDialog
              projectId={projectId}
              branchId={branchId}
              capabilities={capabilities}
              variant="outline"
              initialTab="storage"
            />
            <CreateBucketDialog
              projectId={projectId}
              branchId={branchId}
              branchName={branch.name}
              region={storage.region}
            />
          </>
        }
      />
    </PageBody>
  );
}
