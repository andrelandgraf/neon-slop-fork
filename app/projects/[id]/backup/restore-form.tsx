"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restoreToTimestampAction } from "@/app/actions";

interface BranchOpt {
  id: string;
  name: string;
  default: boolean;
}

function defaultIso(): string {
  const d = new Date(Date.now() - 5 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function RestoreForm({
  projectId,
  branches,
  retentionDays,
}: {
  projectId: string;
  branches: BranchOpt[];
  retentionDays: number;
}) {
  const [branchId, setBranchId] = useState(
    branches.find((b) => b.default)?.id ?? branches[0]?.id ?? ""
  );
  const [timestamp, setTimestamp] = useState(defaultIso());
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const iso = new Date(timestamp).toISOString();
    const preserveName = `before-restore-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19)}`;
    try {
      await restoreToTimestampAction(projectId, branchId, iso, preserveName);
      toast.success("Restore initiated. The previous state is saved.");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to restore branch."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Source branch
        </Label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm min-w-[180px]"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.default ? " (default)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Point in time
        </Label>
        <Input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="h-9 min-w-[200px]"
        />
        <span className="text-[10px] text-muted-foreground">
          Anywhere in the last {retentionDays} day
          {retentionDays === 1 ? "" : "s"} (UTC: {new Date(timestamp).toISOString()})
        </span>
      </div>
      <Mock inline>
        <Button variant="outline">Preview data</Button>
      </Mock>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button disabled={!branchId}>Restore</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Restore branch to {timestamp}?</DialogTitle>
              <DialogDescription>
                The current branch state will be preserved under a new branch
                so this action is reversible. Reads from existing endpoints
                may briefly fail while the restore completes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Restoring…" : "Confirm restore"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Mock({ inline, children }: { inline?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={inline ? "inline-flex" : "block"}
      title="Preview is mocked — the action below uses the real Neon API"
    >
      {children}
    </span>
  );
}
