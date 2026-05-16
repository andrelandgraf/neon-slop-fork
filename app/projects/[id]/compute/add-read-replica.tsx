"use client";
import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { createReadReplicaAction } from "@/app/actions";

const CU_VALUES = [0.25, 0.5, 1, 2, 3, 4, 6, 7, 8, 10, 14] as const;

/**
 * `Add read replica`
 *
 * Spawns a new `read_only` compute endpoint on the active branch via
 * `createProjectEndpoint`. Read replicas share the branch's data with
 * the primary, but get their own connection string + autoscaling
 * envelope so analytics / search workloads don't compete with the
 * write path. Defaults to the same min/max/suspend the project's
 * primary uses (0.25 / 0.25 / 5 min), but it's all editable up front.
 */
export function AddReadReplica({
  projectId,
  branchId,
  branchName,
  replicaCount,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
  replicaCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [minCu, setMinCu] = useState(0.25);
  const [maxCu, setMaxCu] = useState(0.25);
  const [suspendSeconds, setSuspendSeconds] = useState(300);
  const [pending, startTransition] = useTransition();

  function reset() {
    setMinCu(0.25);
    setMaxCu(0.25);
    setSuspendSeconds(300);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createReadReplicaAction(fd);
      if (res.ok) {
        toast.success("Read replica provisioning…");
        setOpen(false);
        reset();
      } else {
        const friendly =
          /not supported.*plan|requires.*plan|read.?only.*not allowed/i.test(
            res.error
          )
            ? "Read replicas require a paid Neon plan."
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
        <Button>
          <Plus className="h-4 w-4" />
          Add read replica
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a read replica</DialogTitle>
            <DialogDescription>
              A read-only compute on branch{" "}
              <span className="font-mono">{branchName}</span>. Replicas share
              storage with the primary endpoint but scale independently and
              have their own connection string.{" "}
              {replicaCount > 0 && (
                <span className="text-foreground">
                  This will be replica #{replicaCount + 1}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="branchId" value={branchId} />
          <div className="grid grid-cols-2 gap-3 my-3">
            <CuField
              label="Min CU"
              name="minCu"
              value={minCu}
              onChange={setMinCu}
            />
            <CuField
              label="Max CU"
              name="maxCu"
              value={maxCu}
              onChange={setMaxCu}
            />
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="replica-suspend">Suspend after (seconds)</Label>
              <input
                id="replica-suspend"
                name="suspendSeconds"
                type="number"
                min={0}
                step={60}
                value={suspendSeconds}
                onChange={(e) => setSuspendSeconds(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                0 means never suspend. Default is 300 (5 minutes of
                inactivity). Suspended replicas wake on the next query.
              </p>
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
            <Button type="submit" disabled={pending || minCu > maxCu}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? "Creating…" : "Add replica"}
            </Button>
          </DialogFooter>
          {minCu > maxCu && (
            <p className="mt-2 text-[12px] text-destructive">
              Min CU must be ≤ Max CU.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CuField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Label>{label}</Label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
      >
        {CU_VALUES.map((cu) => (
          <option key={cu} value={cu}>
            {cu}
          </option>
        ))}
      </select>
    </label>
  );
}
