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

function defaultIso(): string {
  const d = new Date(Date.now() - 5 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function RestoreForm({
  projectId,
  branchId,
  branchName,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
}) {
  const [timestamp, setTimestamp] = useState(defaultIso());
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const iso = new Date(timestamp).toISOString();
    const preserveName = `${branchName}_old_${new Date().toISOString().slice(0, 19)}`;
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

  // Pre-computed in render so the helper line stays in lockstep with
  // the picker without any extra state — the input value is local UI
  // state already.
  let utc = "";
  try {
    utc = new Date(timestamp).toISOString();
  } catch {
    utc = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label>Source branch</Label>
          <Input value={branchName} disabled readOnly className="h-8 min-w-[300px]" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Point in time</Label>
          <Input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="h-8 min-w-[220px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled
            title="Preview-before-restore needs a temporary endpoint on the historic LSN — not yet exposed via the public API."
          >
            Preview data
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!branchId}>Restore</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Restore branch to {timestamp}?</DialogTitle>
                  <DialogDescription>
                    {branchName} is restored to this point in time. Its current
                    state is saved as a backup branch named{" "}
                    <code className="font-mono">{branchName}_old_&lt;timestamp&gt;</code>.
                    Connections are briefly interrupted while the restore completes.
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
      </div>
      <p className="text-[11px] text-muted-foreground">
        {Intl.DateTimeFormat().resolvedOptions().timeZone}
        {utc && ` · UTC: ${utc}`}
      </p>
    </div>
  );
}

