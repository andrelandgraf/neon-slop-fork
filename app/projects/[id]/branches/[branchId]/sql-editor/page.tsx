import { SqlEditor } from "@/components/sql-editor";
import { neon } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";

export const dynamic = "force-dynamic";

export default async function SqlEditorPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch } = await loadBranch(projectId, branchId);
  const { data } = await neon.listProjectBranchDatabases(projectId, branchId);

  return (
    <SqlEditor
      key={branchId}
      projectId={projectId}
      projectName={project.name}
      branchId={branchId}
      branchName={branch.name}
      isDefault={branch.default}
      databases={data.databases.map((d) => d.name)}
    />
  );
}
