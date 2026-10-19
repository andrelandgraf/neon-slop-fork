import { ConnectDialog } from "@/components/connect/connect-dialog";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities, requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { BucketTable } from "./bucket-table";
import { CreateBucketDialog } from "./create-bucket-dialog";

export const dynamic = "force-dynamic";

export default async function StoragePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "storage");
  const [buckets, storage, capabilities] = await Promise.all([
    neonSdk.storage.buckets.list({ projectId, branchId }),
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
        buckets={buckets.map((b) => ({
          name: b.name,
          public: b.access_level === "public_read",
          createdAt: b.created_at,
        }))}
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
