import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Camera } from "lucide-react";
import { RestoreForm } from "./restore-form";
import { SnapshotsPanel } from "./snapshots-panel";

export const dynamic = "force-dynamic";

interface NeonSnapshot {
  id: string;
  name: string;
  lsn?: string;
  timestamp?: string;
  source_branch_id?: string;
  created_at: string;
  expires_at?: string;
  manual?: boolean;
  full_size?: number;
  diff_size?: number;
}

export default async function BackupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pRes, bRes, sRes] = await Promise.all([
    neon.getProject(id),
    neon.listProjectBranches({ projectId: id }),
    // SDK returns `{ snapshots }` only when the endpoint succeeds —
    // on a project that has never created one it may still be 200,
    // but we coerce defensively just in case (the page should still
    // render even if the Beta endpoint goes away on a deploy).
    neon
      .listSnapshots(id)
      .then((r) => r.data.snapshots as NeonSnapshot[])
      .catch(() => [] as NeonSnapshot[]),
  ]);
  const project = pRes.data.project;
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const snapshots = sRes;

  const retentionDays = Math.round(
    (project.history_retention_seconds ?? 86400) / 86400
  );

  // Snapshots are only takeable from root (non-forked) branches. The
  // Neon API rejects non-root snapshot creates with a clear error, but
  // we hide the create button on non-root branches to avoid a confusing
  // 400 round-trip.
  const rootBranchIds = new Set(
    branches.filter((b) => !b.parent_id).map((b) => b.id)
  );

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Backup &amp; Restore</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{project.name}</p>

      <Card className="p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
            <History className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Restore from history</div>
            <p className="text-xs text-muted-foreground mb-3">
              Instantly revert a branch to any point in the last{" "}
              <Badge variant="muted" className="mx-0.5">
                {retentionDays} day{retentionDays === 1 ? "" : "s"}
              </Badge>
              . Restores via{" "}
              <code className="text-[10px] font-mono">
                POST /projects/{`{id}`}/branches/{`{branch}`}/restore
              </code>{" "}
              and preserves the previous state as a renamed branch.
            </p>
            {defaultBranch ? (
              <RestoreForm
                projectId={id}
                branches={branches.map((b) => ({
                  id: b.id,
                  name: b.name,
                  default: b.default,
                }))}
                retentionDays={retentionDays}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No branches available to restore.
              </p>
            )}
          </div>
        </div>
      </Card>

      <SnapshotsPanel
        projectId={id}
        snapshots={snapshots}
        branches={branches.map((b) => ({
          id: b.id,
          name: b.name,
          default: b.default,
          parent_id: b.parent_id ?? null,
        }))}
        rootBranchIds={[...rootBranchIds]}
      />

      <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
        <RotateCcw className="h-3 w-3" />
        Snapshots use the Beta{" "}
        <a
          href="https://api-docs.neon.tech/reference/createsnapshot"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Snapshot API
        </a>
        . Free plans cap manual snapshots at 1; paid plans at 10. Schedule-driven
        snapshots don&apos;t count.
        <Camera className="h-3 w-3 ml-2" />
      </p>
    </div>
  );
}
