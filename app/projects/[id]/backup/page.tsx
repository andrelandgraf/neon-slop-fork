import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mock } from "@/components/ui/mock";
import { History, RotateCcw, Camera } from "lucide-react";
import { RestoreForm } from "./restore-form";

export const dynamic = "force-dynamic";

export default async function BackupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pRes, bRes] = await Promise.all([
    neon.getProject(id),
    neon.listProjectBranches({ projectId: id }),
  ]);
  const project = pRes.data.project;
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];

  const retentionDays = Math.round(
    (project.history_retention_seconds ?? 86400) / 86400
  );

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Backup &amp; Restore</h1>
        <Mock inline label="Embedded view toggle is mocked">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Embedded view</span>
            <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-emerald-500">
              <span className="inline-block h-3 w-3 translate-x-[14px] rounded-full bg-white shadow" />
            </span>
          </label>
        </Mock>
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
              .{" "}
              <a
                href="https://neon.com/docs/manage/branches#restore-a-branch"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Configure
              </a>
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

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
            <Camera className="h-4 w-4" />
          </div>
          <div className="flex-1 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-semibold">Create snapshot</div>
                <Badge variant="muted">Beta</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Save a snapshot you can restore later. (Snapshot API is in
                early access — surfaced here read-only in this clone.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Mock inline>
                <Button variant="outline" size="sm">
                  Edit schedule
                </Button>
              </Mock>
              <Mock inline>
                <Button size="sm">Create</Button>
              </Mock>
            </div>
          </div>
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Restoring writes the current branch state to a preserve branch (named
        below) before resetting head to the chosen point — Neon&apos;s{" "}
        <a
          href="https://api-docs.neon.tech/reference/restoreprojectbranch"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          BranchRestore
        </a>{" "}
        endpoint.
      </p>
    </div>
  );
}
