import Link from "next/link";
import { History } from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { loadBranch } from "@/lib/project-context";
import { formatHistoryRetention } from "@/lib/format";
import { RestoreForm } from "./restore-form";
import { LiveSnapshots } from "./live-snapshots";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";

export const dynamic = "force-dynamic";


export default async function RestorePage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch } = await loadBranch(projectId, branchId);
  await ensureMirrored({ kind: "extras", projectId });
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId };
  const [snapshots, schedules] = await Promise.all([loadLive("snapshots", live), loadLive("snapshot-schedules", live)]);

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
      <LiveSnapshots
        projectId={projectId}
        branchId={branchId}
        isRoot={!branch.parent_id}
        isDefault={branch.default}
        snapshots={snapshots}
        schedules={schedules}
      />
    </PageBody>
  );
}
