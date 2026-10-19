import Link from "next/link";
import { History } from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { formatHistoryRetention } from "@/lib/format";
import type { ScheduleChoice } from "@/lib/snapshots/actions";
import { RestoreForm } from "./restore-form";
import { CreateSnapshotCard, SnapshotList } from "./snapshots";

export const dynamic = "force-dynamic";

function scheduleChoice(frequency: string | undefined): ScheduleChoice {
  return frequency === "daily" || frequency === "weekly" || frequency === "monthly"
    ? frequency
    : "none";
}

export default async function RestorePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, branches } = await loadBranch(projectId, branchId);
  const isRoot = !branch.parent_id;
  const [snapshots, schedule] = await Promise.all([
    neonSdk.snapshots.list({ projectId }),
    isRoot ? neonSdk.snapshots.getSchedule({ projectId, branchId }) : null,
  ]);
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const items = snapshots
    // Snapshots outlive their source branch; those land on the default branch
    // so they stay restorable and deletable.
    .filter(
      (s) =>
        s.source_branch_id === branchId ||
        (branch.default && !branchName.has(s.source_branch_id ?? ""))
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({
      id: s.id,
      name: s.name,
      sourceBranchId: s.source_branch_id ?? null,
      sourceBranchName: s.source_branch_id ? (branchName.get(s.source_branch_id) ?? s.source_branch_id) : "—",
      createdAt: s.created_at,
      expiresAt: s.expires_at ?? null,
    }));

  return (
    <PageBody>
      <PageHeader title="Backup & Restore" project={project} branch={branch} />
      <div className="rounded-[3px] border border-panel-border px-5 py-4">
        <div className="flex items-start gap-3 border-panel-border border-b pb-4">
          <History className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <div className="font-semibold text-sm">Restore from history</div>
            <p className="text-muted-foreground text-xs">
              Instantly restore this branch to any point in the past{" "}
              <strong className="text-foreground">
                {formatHistoryRetention(project.history_retention_seconds)} history window
              </strong>
              .{" "}
              <Link
                href={`/projects/${projectId}/settings/postgres?branch=${branchId}`}
                className="font-semibold text-link"
              >
                Configure
              </Link>
            </p>
          </div>
        </div>
        <div className="pt-4">
          <RestoreForm projectId={projectId} branchId={branchId} branchName={branch.name} />
        </div>
      </div>
      <div className="my-8 flex items-center gap-4 text-muted-foreground text-xs">
        <span className="h-px flex-1 bg-panel-border" />
        Or restore from a snapshot
        <span className="h-px flex-1 bg-panel-border" />
      </div>
      <div className="space-y-4">
        <CreateSnapshotCard
          projectId={projectId}
          branchId={branchId}
          snapshotCount={items.length}
          schedule={scheduleChoice(schedule?.schedule[0]?.frequency)}
          canSnapshot={isRoot}
        />
        <SnapshotList projectId={projectId} snapshots={items} />
      </div>
    </PageBody>
  );
}
