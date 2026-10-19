"use client";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useProjectLive, useSnapshotSchedules, useSnapshots } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { SnapshotRow, SnapshotScheduleRow } from "@/lib/live/queries";
import type { ScheduleChoice } from "@/lib/snapshots/actions";
import { CreateSnapshotCard, SnapshotList } from "./snapshots";

function scheduleChoice(frequency: string | undefined): ScheduleChoice {
  return frequency === "daily" || frequency === "weekly" || frequency === "monthly" ? frequency : "none";
}

/** The branch's snapshots and, for a root branch, its schedule; live. */
export function LiveSnapshots({
  projectId,
  branchId,
  isRoot,
  isDefault,
  snapshots: snapshotsSeed,
  schedules: schedulesSeed,
}: {
  projectId: string;
  branchId: string;
  isRoot: boolean;
  isDefault: boolean;
  snapshots: LiveSeed<SnapshotRow>;
  schedules: LiveSeed<SnapshotScheduleRow>;
}) {
  const live = useProjectLive();
  const snapshotsCollection = useSnapshots(snapshotsSeed);
  const schedulesCollection = useSnapshotSchedules(schedulesSeed);
  const snapshots = useLiveQuery((q) => q.from({ s: snapshotsCollection }));
  const schedules = useLiveQuery({
    query: (q) => q.from({ s: schedulesCollection }).where(({ s }) => eq(s.branch_id, branchId)),
  });
  const branches = useLiveQuery((q) => q.from({ b: live.branches }));
  const branchName = new Map(branches.data.map((b) => [b.id, b.name]));
  const items = snapshots.data
    .map((row) => row.data)
    // Snapshots outlive their source branch; those land on the default branch
    // so they stay restorable and deletable.
    .filter((s) => s.source_branch_id === branchId || (isDefault && !branchName.has(s.source_branch_id ?? "")))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({
      id: s.id,
      name: s.name,
      sourceBranchId: s.source_branch_id ?? null,
      sourceBranchName: s.source_branch_id ? (branchName.get(s.source_branch_id) ?? s.source_branch_id) : "—",
      createdAt: s.created_at,
      expiresAt: s.expires_at ?? null,
    }));
  const schedule = scheduleChoice(schedules.data[0]?.data[0]?.frequency);
  return (
    <div className="space-y-4">
      <LiveStatus queries={[snapshots, schedules, branches]} />
      <CreateSnapshotCard
        key={schedule}
        projectId={projectId}
        branchId={branchId}
        snapshotCount={items.length}
        schedule={schedule}
        canSnapshot={isRoot}
      />
      <SnapshotList projectId={projectId} snapshots={items} />
    </div>
  );
}
