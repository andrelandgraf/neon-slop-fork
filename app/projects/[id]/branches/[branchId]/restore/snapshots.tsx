"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, EllipsisVertical, GitBranch, Hourglass, Info, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionDialog } from "@/components/action-dialog";
import { relativeTime } from "@/lib/utils";
import {
  createSnapshotNowAction,
  setSnapshotScheduleAction,
  type ScheduleChoice,
} from "@/lib/snapshots/actions";
import {
  deleteSnapshotAction,
  renameSnapshotAction,
  restoreSnapshotInPlaceAction,
  restoreSnapshotPreviewAction,
} from "@/app/actions";

export interface SnapshotItem {
  id: string;
  name: string;
  sourceBranchName: string;
  sourceBranchId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const SCHEDULE_LABELS: Record<ScheduleChoice, string> = {
  none: "No schedule",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function CreateSnapshotCard({
  projectId,
  branchId,
  snapshotCount,
  schedule,
  canSnapshot,
}: {
  projectId: string;
  branchId: string;
  snapshotCount: number;
  schedule: ScheduleChoice;
  canSnapshot: boolean;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [choice, setChoice] = useState<ScheduleChoice>(schedule);
  const [pending, startTransition] = useTransition();
  const summary = `${snapshotCount === 0 ? "No snapshots" : `${snapshotCount} snapshot${snapshotCount === 1 ? "" : "s"} created`}${
    schedule === "none" ? ", no schedule set" : `. ${SCHEDULE_LABELS[schedule]} schedule.`
  }`;

  return (
    <div className="flex items-center gap-4 rounded-[3px] border border-panel-border border-dashed px-5 py-4">
      <Camera className="size-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-semibold text-sm">Create snapshot</div>
        <div className="text-muted-foreground text-xs">
          Save copies you can instantly restore from later. {summary}
          {!canSnapshot && " Snapshots can only be taken of root branches."}
        </div>
      </div>
      <Button variant="outline" onClick={() => setScheduleOpen(true)} disabled={!canSnapshot}>
        Edit schedule
      </Button>
      <Button
        variant="outline"
        disabled={pending || !canSnapshot}
        onClick={() =>
          startTransition(async () => {
            const result = await createSnapshotNowAction(projectId, branchId);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Snapshot was successfully created");
            toast.success(`Snapshot captured in ${(result.elapsedMs / 1000).toFixed(2)} sec 🔥`);
          })
        }
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Create
      </Button>
      <ActionDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Edit backup schedule"
        confirmLabel="Update schedule"
        successMessage="Backup schedule updated"
        onConfirm={() => setSnapshotScheduleAction(projectId, branchId, choice)}
      >
        <div className="space-y-3">
          <p className="text-sm">Define how often to automatically create snapshots</p>
          <NativeSelect
            value={choice}
            onChange={(e) => {
              const next = (Object.keys(SCHEDULE_LABELS) as ScheduleChoice[]).find((k) => k === e.target.value);
              if (next) setChoice(next);
            }}
            wrapperClassName="w-40"
          >
            {(Object.keys(SCHEDULE_LABELS) as ScheduleChoice[]).map((k) => (
              <option key={k} value={k}>
                {SCHEDULE_LABELS[k]}
              </option>
            ))}
          </NativeSelect>
          {choice === "none" && (
            <div className="flex items-center gap-2 rounded-[3px] border border-link/30 bg-link/5 px-3 py-2.5 text-sm">
              <Info className="size-4 text-link" />
              No snapshots will be created until you set a schedule.
            </div>
          )}
        </div>
      </ActionDialog>
    </div>
  );
}

export function SnapshotList({
  projectId,
  snapshots,
}: {
  projectId: string;
  snapshots: SnapshotItem[];
}) {
  if (snapshots.length === 0) return null;
  return (
    <div className="space-y-2">
      {snapshots.map((s) => (
        <SnapshotRow key={s.id} projectId={projectId} snapshot={s} />
      ))}
    </div>
  );
}

function SnapshotRow({ projectId, snapshot }: { projectId: string; snapshot: SnapshotItem }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"one" | "multi" | "rename" | "delete" | null>(null);
  const [name, setName] = useState(snapshot.name);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <div className="flex items-center gap-4 rounded-[3px] border border-panel-border px-5 py-3.5">
      <Camera className="size-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="truncate">{snapshot.name}</span>
          <button type="button" aria-label="Rename snapshot" onClick={() => setDialog("rename")} className="text-muted-foreground hover:text-foreground">
            <Pencil className="size-3" />
          </button>
        </div>
        <div className="mt-0.5 flex items-center gap-4 text-muted-foreground text-xs">
          <span className="flex items-center gap-1 font-mono">
            <GitBranch className="size-3" />
            {snapshot.sourceBranchName}
          </span>
          <span>{relativeTime(snapshot.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Hourglass className="size-3" />
            Expires on: {snapshot.expiresAt ? new Date(snapshot.expiresAt).toLocaleDateString("en-US") : "never"}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="brand">
            Restore <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onSelect={() => setDialog("one")} className="flex-col items-start" disabled={!snapshot.sourceBranchId}>
            <span className="font-semibold">One-step restore</span>
            <span className="text-muted-foreground text-xs">
              Instantly restore data from the snapshot. The branch name and
              connection string stay the same — only the branch ID will change.
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("multi")} className="flex-col items-start">
            <span className="font-semibold">Multi-step restore</span>
            <span className="text-muted-foreground text-xs">
              Create a new branch using the snapshot. Choose this option if you
              want to inspect the restored data before switching over to the new branch.
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Snapshot actions" className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted">
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("rename")}>Rename</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDialog("delete")}>
            Delete snapshot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ActionDialog
        open={dialog === "one"}
        onOpenChange={close}
        title="Restore branch from snapshot?"
        description={`${snapshot.sourceBranchName} is replaced with the data in this snapshot. Its name and connection string stay the same; the branch ID changes. Active connections are briefly interrupted.`}
        confirmLabel="Restore"
        destructive
        successMessage="Branch restored from snapshot"
        onConfirm={async () => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("snapshotId", snapshot.id);
          fd.set("targetBranchId", snapshot.sourceBranchId ?? "");
          const result = await restoreSnapshotInPlaceAction(fd);
          if (result.ok) router.push(`/projects/${projectId}`);
          return result;
        }}
      />
      <ActionDialog
        open={dialog === "multi"}
        onOpenChange={close}
        title="Create a branch from this snapshot?"
        description="A new branch holds the snapshot's data. Inspect it, then switch your app over when you're ready."
        confirmLabel="Create branch"
        successMessage="Branch created from snapshot"
        onConfirm={async () => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("snapshotId", snapshot.id);
          const result = await restoreSnapshotPreviewAction(fd);
          if (result.ok) router.push(`/projects/${projectId}/branches`);
          return result;
        }}
      />
      <Dialog open={dialog === "rename"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`snapshot-${snapshot.id}`}>Name</Label>
            <Input id={`snapshot-${snapshot.id}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={async () => {
                const result = await renameSnapshotAction(projectId, snapshot.id, name);
                if (!result.ok) return toast.error(result.error);
                toast.success("Snapshot renamed");
                setDialog(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ActionDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title="Delete snapshot?"
        description="The snapshot is permanently deleted. Branches restored from it are unaffected."
        confirmLabel="Delete"
        destructive
        successMessage="Snapshot deleted"
        onConfirm={() => deleteSnapshotAction(projectId, snapshot.id)}
      />
    </div>
  );
}
