import { PageBody } from "@/components/page-header";
import { neon } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { formatBytes, formatCuRange } from "@/lib/format";
import { relativeTime } from "@/lib/utils";
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
  const { project, branches, branch } = await loadProjectBranch(projectId, branchParam);
  const { data } = await neon.listProjectEndpoints(projectId);
  const nameById = new Map(branches.map((b) => [b.id, b.name]));

  const rows = branches.map((b) => {
    const primary = data.endpoints.find((e) => e.branch_id === b.id && e.type === "read_write");
    const lastActive = primary?.last_active;
    return {
      id: b.id,
      name: b.name,
      default: b.default,
      protected: b.protected,
      parentId: b.parent_id,
      parentName: b.parent_id ? (nameById.get(b.parent_id) ?? b.parent_id) : null,
      expiresAt: b.expires_at,
      computeHours: `${+(b.compute_time_seconds / 3600).toFixed(2)} CU-hrs`,
      primary: primary
        ? {
            range: formatCuRange(primary.autoscaling_limit_min_cu, primary.autoscaling_limit_max_cu),
            active: primary.current_state === "active",
          }
        : null,
      storage: b.logical_size ? formatBytes(b.logical_size) : "-",
      createdBy: b.created_by?.name ?? "—",
      lastActive: primary?.current_state === "active" ? "now" : lastActive ? relativeTime(lastActive) : "-",
    };
  });

  return (
    <PageBody>
      <BranchesTable
        projectId={projectId}
        projectName={project.name}
        currentBranchId={branch.id}
        rows={rows}
      />
    </PageBody>
  );
}
