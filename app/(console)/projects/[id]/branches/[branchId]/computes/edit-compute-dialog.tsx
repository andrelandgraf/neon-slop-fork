"use client";
import { useState, useTransition } from "react";
import { Info, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  createReadReplicaAction,
  updateEndpointAutoscalingAction,
} from "@/app/actions";

/** The autoscaling stops the Console's slider offers. */
const CU_STEPS = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16] as const;

function nearestIndex(value: number): number {
  let best = 0;
  for (let i = 1; i < CU_STEPS.length; i++) {
    if (Math.abs(CU_STEPS[i] - value) < Math.abs(CU_STEPS[best] - value)) best = i;
  }
  return best;
}

function cuLabel(cu: number): string {
  return cu < 1 ? String(cu).replace(/^0/, "") : String(cu);
}

interface ComputeDraft {
  id: string;
  name: string | null;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  suspend_timeout_seconds: number;
}

/**
 * The Console's compute drawer, for editing a compute or adding a read
 * replica (no `endpoint`).
 */
export function EditComputeDialog({
  open,
  onOpenChange,
  projectId,
  branchId,
  endpoint,
  title,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projectId: string;
  branchId?: string;
  endpoint?: ComputeDraft;
  title: string;
  onDelete?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        {open && (
          <ComputeForm
            projectId={projectId}
            branchId={branchId}
            endpoint={endpoint}
            title={title}
            onDelete={onDelete}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Dialog>
  );
}

function ComputeForm({
  projectId,
  branchId,
  endpoint,
  title,
  onDelete,
  onDone,
}: {
  projectId: string;
  branchId?: string;
  endpoint?: ComputeDraft;
  title: string;
  onDelete?: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(endpoint?.name ?? "");
  const [minIdx, setMinIdx] = useState(nearestIndex(endpoint?.autoscaling_limit_min_cu ?? 0.25));
  const [maxIdx, setMaxIdx] = useState(nearestIndex(endpoint?.autoscaling_limit_max_cu ?? 2));
  const [scaleToZero, setScaleToZero] = useState(
    (endpoint?.suspend_timeout_seconds ?? 0) >= 0
  );
  const [pending, startTransition] = useTransition();
  const min = CU_STEPS[minIdx];
  const max = CU_STEPS[maxIdx];
  const initialScaleToZero = (endpoint?.suspend_timeout_seconds ?? 0) >= 0;

  function save() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("minCu", String(min));
    fd.set("maxCu", String(max));
    fd.set("name", name.trim());
    if (scaleToZero !== initialScaleToZero) {
      fd.set("suspendChanged", "1");
      // 0 is the project default (5 minutes); -1 never suspends.
      fd.set("suspendSeconds", String(scaleToZero ? 0 : -1));
    }
    startTransition(async () => {
      let result;
      if (endpoint) {
        fd.set("endpointId", endpoint.id);
        result = await updateEndpointAutoscalingAction(fd);
      } else {
        fd.set("branchId", branchId ?? "");
        if (!scaleToZero) fd.set("suspendSeconds", "-1");
        result = await createReadReplicaAction(fd);
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(endpoint ? "Compute settings saved" : "Read replica created");
      onDone();
    });
  }

  const last = CU_STEPS.length - 1;
  return (
    <>
      <div className="border-panel-border border-b px-5 py-4">
        <DialogTitle className="font-semibold text-lg">{title}</DialogTitle>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="space-y-1.5">
          <label htmlFor="compute-name" className="font-semibold text-sm">
            Name
          </label>
          <Input
            id="compute-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your compute (Optional)"
          />
        </div>
        <div className="space-y-3 border-panel-border border-t pt-5">
          <h3 className="font-semibold text-base">Autoscaling</h3>
          <p className="text-sm">Configure the autoscaling range</p>
          <div className="relative pt-1 pb-5">
            <div className="relative h-1.5 rounded-full bg-muted">
              <div
                className="absolute h-1.5 rounded-full bg-foreground"
                style={{ left: `${(minIdx / last) * 100}%`, right: `${100 - (maxIdx / last) * 100}%` }}
              />
            </div>
            {(
              [
                [minIdx, (v: number) => { setMinIdx(v); if (v > maxIdx) setMaxIdx(v); }, "Minimum compute units"],
                [maxIdx, (v: number) => { setMaxIdx(v); if (v < minIdx) setMinIdx(v); }, "Maximum compute units"],
              ] as const
            ).map(([value, onChange, label]) => (
              <input
                key={label}
                type="range"
                min={0}
                max={last}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={label}
                className="neon-range pointer-events-none absolute inset-x-0 top-0 w-full [&::-webkit-slider-thumb]:pointer-events-auto"
              />
            ))}
            <div className="absolute inset-x-0 top-4 flex justify-between font-mono text-[11px] text-muted-foreground">
              {CU_STEPS.map((cu, i) => (
                <span key={cu} className={i === minIdx || i === maxIdx ? "font-semibold text-foreground" : ""}>
                  {cuLabel(cu)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Scale from</div>
              <div className="font-semibold">{min} CU (~{min * 4} GB RAM)</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Scale up to</div>
              <div className="font-semibold">{max} CU (~{max * 4} GB RAM)</div>
            </div>
          </div>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Users className="size-3.5" />
            Connection limits grow with compute size.{" "}
            <a
              className="underline"
              href="https://neon.com/docs/connect/connection-pooling"
              target="_blank"
              rel="noreferrer"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="space-y-3 border-panel-border border-t pt-5">
          <h3 className="font-semibold text-base">Scale to zero</h3>
          <label className="flex items-center gap-2 font-semibold text-sm">
            <Switch checked={scaleToZero} onCheckedChange={setScaleToZero} />
            Scale to zero after 5 minutes of inactivity
          </label>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Info className="size-3.5" />
            Compute activation takes only a few hundred milliseconds.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-panel-border border-t px-5 py-4">
        {endpoint && onDelete ? (
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {endpoint ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </>
  );
}
