"use client";
import { useState, useTransition } from "react";
import {
  Camera,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  PencilLine,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createSnapshotAction,
  deleteSnapshotAction,
  renameSnapshotAction,
  restoreSnapshotInPlaceAction,
  restoreSnapshotPreviewAction,
} from "@/app/actions";

interface Snapshot {
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

interface BranchOpt {
  id: string;
  name: string;
  default: boolean;
  parent_id: string | null;
}

/**
 * `SnapshotsPanel`
 *
 * One-stop UI for Neon's Beta Snapshot API:
 *
 * - **Create** a snapshot from a root branch (optional name + expiry).
 * - **Preview-restore** a snapshot to a fresh branch so the user can
 *   diff it against `main` without disturbing the live data; the new
 *   branch ends up in `/branches` and gets its own endpoint.
 * - **In-place restore** a snapshot onto its source branch with
 *   `finalize_restore: true` — moves the existing compute endpoint to
 *   the new branch so the connection string stays stable. The old
 *   branch is renamed `<name> (old)` and stays around until the user
 *   cleans it up.
 * - **Rename / Delete** existing snapshots.
 *
 * All actions return `{ ok }` / `{ ok: false, error }` so the upstream
 * "max snapshots exceeded" plan-limit message can be rendered inline
 * — Next masks raw server-action throws in production.
 */
export function SnapshotsPanel({
  projectId,
  snapshots,
  branches,
  rootBranchIds,
}: {
  projectId: string;
  snapshots: Snapshot[];
  branches: BranchOpt[];
  rootBranchIds: string[];
}) {
  const rootBranches = branches.filter((b) => rootBranchIds.includes(b.id));
  const branchById = new Map(branches.map((b) => [b.id, b]));

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
          <Camera className="h-4 w-4" />
        </div>
        <div className="flex-1 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="font-semibold">Snapshots</div>
              <Badge variant="muted">Beta</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Capture point-in-time versions of any root branch. Restore
              in place to roll the active branch back (connection string
              stays the same) or to a preview branch to compare.
            </p>
          </div>
          <CreateSnapshotDialog
            projectId={projectId}
            rootBranches={rootBranches}
          />
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="border rounded-md py-10 text-center text-sm text-muted-foreground">
          <Camera className="h-6 w-6 mx-auto mb-2 opacity-30" />
          No snapshots yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Source branch</th>
                <th className="py-2 font-medium">Captured</th>
                <th className="py-2 font-medium">Expires</th>
                <th className="py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <SnapshotRow
                  key={s.id}
                  projectId={projectId}
                  snapshot={s}
                  sourceBranchName={
                    s.source_branch_id
                      ? branchById.get(s.source_branch_id)?.name ?? s.source_branch_id
                      : "—"
                  }
                  branches={branches}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SnapshotRow({
  projectId,
  snapshot,
  sourceBranchName,
  branches,
}: {
  projectId: string;
  snapshot: Snapshot;
  sourceBranchName: string;
  branches: BranchOpt[];
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-3 align-top">
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">
            {snapshot.name || "(unnamed)"}
          </span>
          {snapshot.manual === false && (
            <Badge variant="muted" className="shrink-0">
              Scheduled
            </Badge>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
          {snapshot.id}
        </div>
      </td>
      <td className="py-3 pr-3 text-muted-foreground font-mono text-xs truncate align-middle">
        {sourceBranchName}
      </td>
      <td className="py-3 pr-3 text-muted-foreground text-xs whitespace-nowrap align-middle">
        {new Date(snapshot.created_at).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="py-3 pr-3 text-muted-foreground text-xs whitespace-nowrap align-middle">
        {snapshot.expires_at
          ? new Date(snapshot.expires_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "—"}
      </td>
      <td className="py-3 align-middle text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <RestoreSnapshotButton
            projectId={projectId}
            snapshot={snapshot}
            branches={branches}
          />
          <SnapshotRowMenu
            projectId={projectId}
            snapshotId={snapshot.id}
            currentName={snapshot.name}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Kebab menu for the less-frequent snapshot ops (rename, delete).
 * Keeps the action cell narrow so the time columns don't have to
 * truncate on a max-w-4xl page.
 */
function SnapshotRowMenu({
  projectId,
  snapshotId,
  currentName,
}: {
  projectId: string;
  snapshotId: string;
  currentName: string;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Snapshot actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setRenameOpen(true);
            }}
          >
            <PencilLine className="h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameSnapshotDialog
        projectId={projectId}
        snapshotId={snapshotId}
        currentName={currentName}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteSnapshotDialog
        projectId={projectId}
        snapshotId={snapshotId}
        name={currentName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function CreateSnapshotDialog({
  projectId,
  rootBranches,
}: {
  projectId: string;
  rootBranches: BranchOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(
    rootBranches.find((b) => b.default)?.id ?? rootBranches[0]?.id ?? ""
  );
  const [name, setName] = useState(`snapshot-${todayIso()}`);
  const [expiresAt, setExpiresAt] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName(`snapshot-${todayIso()}`);
    setExpiresAt("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSnapshotAction(fd);
      if (res.ok) {
        toast.success("Snapshot scheduled. It’ll appear once the op finishes.");
        setOpen(false);
        reset();
      } else {
        const friendly = /max\s+(manual\s+)?snapshots|exceeds.*snapshot/i.test(
          res.error
        )
          ? "Snapshot limit reached. Free plans allow 1 manual snapshot; paid plans allow 10."
          : res.error;
        toast.error(friendly);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={rootBranches.length === 0}>
          <Plus className="h-4 w-4" />
          Create snapshot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create snapshot</DialogTitle>
            <DialogDescription>
              Captures the current state of a root branch. Snapshots can be
              restored in place (preserving the connection string) or to a
              fresh preview branch.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-3 my-3">
            <div className="space-y-1.5">
              <Label htmlFor="snapshot-branch">Source branch</Label>
              <select
                id="snapshot-branch"
                name="branchId"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {rootBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.default ? " (default)" : ""}
                  </option>
                ))}
              </select>
              {rootBranches.length === 0 && (
                <p className="text-[11px] text-destructive">
                  No root branches in this project — snapshots can only be
                  taken from a branch with no parent.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snapshot-name">Name</Label>
              <Input
                id="snapshot-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="snapshot-2026-05-16"
                maxLength={128}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snapshot-expires">Auto-delete at (optional)</Label>
              <Input
                id="snapshot-expires"
                name="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                Leave blank to keep until you delete it manually.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !branchId}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? "Capturing…" : "Create snapshot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Restore (preview / in-place)
// ---------------------------------------------------------------------------

function RestoreSnapshotButton({
  projectId,
  snapshot,
  branches,
}: {
  projectId: string;
  snapshot: Snapshot;
  branches: BranchOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"preview" | "in-place">("preview");
  const [branchName, setBranchName] = useState(
    `from-${snapshot.name || snapshot.id}`
  );
  const [targetBranchId, setTargetBranchId] = useState(
    snapshot.source_branch_id ??
      branches.find((b) => b.default)?.id ??
      branches[0]?.id ??
      ""
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    fd.set("snapshotId", snapshot.id);
    startTransition(async () => {
      const action =
        mode === "preview"
          ? restoreSnapshotPreviewAction
          : restoreSnapshotInPlaceAction;
      const res = await action(fd);
      if (res.ok) {
        toast.success(
          mode === "preview"
            ? "Preview branch created — see Branches."
            : "Rollback initiated. The old branch is preserved with “(old)” suffix."
        );
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Restore “{snapshot.name || snapshot.id}”</DialogTitle>
            <DialogDescription>
              Pick a mode. Preview keeps the live database untouched and
              creates a fresh branch you can connect to. Rollback replaces
              the live branch in place and keeps the same connection string.
            </DialogDescription>
          </DialogHeader>
          <div className="my-3 space-y-3">
            <fieldset className="grid grid-cols-2 gap-2 text-sm">
              <ModeOption
                label="Preview"
                description="New branch, separate compute, can be deleted."
                value="preview"
                selected={mode === "preview"}
                onClick={() => setMode("preview")}
                icon={<Eye className="h-3.5 w-3.5" />}
              />
              <ModeOption
                label="Rollback (in place)"
                description="Replaces target branch; preserves connection string."
                value="in-place"
                selected={mode === "in-place"}
                onClick={() => setMode("in-place")}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              />
            </fieldset>

            {mode === "preview" ? (
              <div className="space-y-1.5">
                <Label htmlFor="restore-branch-name">New branch name</Label>
                <Input
                  id="restore-branch-name"
                  name="name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="from-snapshot"
                  maxLength={128}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="restore-target-branch">Target branch</Label>
                <select
                  id="restore-target-branch"
                  name="targetBranchId"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.default ? " (default)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  The current target branch will be orphaned with “(old)”
                  appended. The compute endpoint moves to the restored
                  branch — connection string stays stable.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending
                ? mode === "preview"
                  ? "Creating preview…"
                  : "Restoring…"
                : mode === "preview"
                  ? "Create preview branch"
                  : "Confirm rollback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  label,
  description,
  value,
  selected,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  value: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      data-value={value}
      className={`text-left rounded-md border px-3 py-2 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted"
      }`}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
        {description}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

function RenameSnapshotDialog({
  projectId,
  snapshotId,
  currentName,
  open,
  onOpenChange,
}: {
  projectId: string;
  snapshotId: string;
  currentName: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await renameSnapshotAction(projectId, snapshotId, name);
      if (res.ok) {
        toast.success("Snapshot renamed.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setName(currentName);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename snapshot</DialogTitle>
            <DialogDescription>
              Snapshot names are free-form — useful for marking releases
              (e.g. <code className="text-xs">v1.2.0</code>) or experiments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 my-3">
            <Label htmlFor="rename-snapshot">Name</Label>
            <Input
              id="rename-snapshot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={128}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

function DeleteSnapshotDialog({
  projectId,
  snapshotId,
  name,
  open,
  onOpenChange,
}: {
  projectId: string;
  snapshotId: string;
  name: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteSnapshotAction(projectId, snapshotId);
      if (res.ok) {
        toast.success(`Deleted “${name}”.`);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete snapshot “{name || snapshotId}”?</DialogTitle>
          <DialogDescription>
            Snapshots can&apos;t be recovered after deletion. Restoring a
            snapshot to a branch is a separate operation; this only removes
            the snapshot record + its storage.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function todayIso(): string {
  // YYYY-MM-DD in the user's local timezone — purely a friendly default
  // for the snapshot name. The actual snapshot is timestamped by Neon.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
