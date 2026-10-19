import { PageBody } from "@/components/page-header";
import { loadProjectBranch } from "@/lib/project-context";
import { BranchesTable } from "./branches-table";

export const dynamic = "force-dynamic";

export default async function BranchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;
  const { project, branch } = await loadProjectBranch(projectId, branchParam);
  return (
    <PageBody>
      <BranchesTable projectId={projectId} projectName={project.name} currentBranchId={branch.id} />
    </PageBody>
  );
}
