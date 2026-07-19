"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateComputeDefaultsAction } from "@/app/actions";

const CU_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 7, 8, 10, 14] as const;
const DEFAULT_SUSPEND_SECONDS = 300; // Neon docs: 5 minutes.

function nearestIndex(value: number): number {
  let best = 0;
  let dist = Math.abs(CU_STEPS[0] - value);
  for (let i = 1; i < CU_STEPS.length; i++) {
    const d = Math.abs(CU_STEPS[i] - value);
    if (d < dist) {
      best = i;
      dist = d;
    }
  }
  return best;
}

function formatSuspend(seconds: number): string {
  if (seconds === 0) return "default";
  if (seconds === -1) return "never";
  if (seconds % 60 === 0) {
    const mins = seconds / 60;
    return `${mins} minute${mins === 1 ? "" : "s"}`;
  }
  return `${seconds}s`;
}

export function ComputeDefaultsCard({
  projectId,
  minCu,
  maxCu,
  suspendSeconds,
}: {
  projectId: string;
  minCu: number;
  maxCu: number;
  suspendSeconds: number;
}) {
  const [open, setOpen] = useState(false);
  const suspendLabel =
    suspendSeconds === 0
      ? "5 minutes (default)"
      : suspendSeconds === -1
      ? "Never"
      : formatSuspend(suspendSeconds);
  const cuLabel = minCu === maxCu ? `${minCu} CU` : `${minCu} – ${maxCu} CU`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These defaults will be used as the initial settings for any primary or
        read replica computes you create. Modifying these defaults does not
        alter the settings of any existing computes.
      </p>
      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[120px_1fr]">
        <dt className="font-semibold">Compute size:</dt>
        <dd className="font-mono">{cuLabel}</dd>
        <dt className="font-semibold">Scale to zero:</dt>
        <dd className="font-mono">{suspendLabel}</dd>
      </dl>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Modify defaults
      </Button>

      <ComputeDefaultsDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        minCu={minCu}
        maxCu={maxCu}
        suspendSeconds={suspendSeconds}
      />
    </div>
  );
}

function ComputeDefaultsDialog({
  open,
  onOpenChange,
  projectId,
  minCu,
  maxCu,
  suspendSeconds,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projectId: string;
  minCu: number;
  maxCu: number;
  suspendSeconds: number;
}) {
  const initialMin = useMemo(() => nearestIndex(minCu), [minCu]);
  const initialMax = useMemo(() => nearestIndex(maxCu), [maxCu]);
  const [minIdx, setMinIdx] = useState(initialMin);
  const [maxIdx, setMaxIdx] = useState(initialMax);
  const [suspend, setSuspend] = useState(
    suspendSeconds === 0 ? DEFAULT_SUSPEND_SECONDS : suspendSeconds
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setMinIdx(initialMin);
      setMaxIdx(initialMax);
      setSuspend(suspendSeconds === 0 ? DEFAULT_SUSPEND_SECONDS : suspendSeconds);
    }
  }, [open, initialMin, initialMax, suspendSeconds]);

  const min = CU_STEPS[minIdx];
  const max = CU_STEPS[maxIdx];
  const suspendDirty = suspend !== (suspendSeconds === 0 ? DEFAULT_SUSPEND_SECONDS : suspendSeconds);
  const dirty = min !== minCu || max !== maxCu || suspendDirty;

  function onMinChange(next: number) {
    setMinIdx(next);
    if (next > maxIdx) setMaxIdx(next);
  }
  function onMaxChange(next: number) {
    setMaxIdx(next);
    if (next < minIdx) setMinIdx(next);
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("minCu", String(min));
    fd.set("maxCu", String(max));
    fd.set("suspendChanged", suspendDirty ? "1" : "0");
    fd.set("suspendSeconds", String(suspend));
    startTransition(async () => {
      const res = await updateComputeDefaultsAction(fd);
      if (res.ok) {
        toast.success("Compute defaults updated.");
        onOpenChange(false);
        return;
      }
      const friendly = /modifying.+suspend interval|not permitted on this account|cu count is greater than/i.test(
        res.error
      )
        ? "These defaults exceed your plan. Lower the values or upgrade your Neon plan."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change default compute settings</DialogTitle>
          <DialogDescription>
            New endpoints will inherit these values. Existing computes are
            unaffected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-semibold">Compute size range</div>
              <div className="font-mono text-xs text-muted-foreground">
                {min === max
                  ? `Fixed size: ${min} CU (~${(min * 4).toFixed(min < 1 ? 2 : 0)} GB RAM)`
                  : `${min} – ${max} CU`}
              </div>
            </div>
            <DualSlider
              minIdx={minIdx}
              maxIdx={maxIdx}
              onMin={onMinChange}
              onMax={onMaxChange}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-semibold">Scale to zero</div>
              <div className="font-mono text-xs text-muted-foreground">
                after {formatSuspend(suspend)} of inactivity
              </div>
            </div>
            <input
              type="number"
              min={60}
              step={60}
              value={suspend}
              onChange={(e) => setSuspend(Number(e.target.value))}
              className="mt-2 w-[180px] h-9 rounded-md border bg-background px-3 text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              In seconds. Set to <code className="font-mono">-1</code> to never
              suspend (paid plans only).
            </p>
          </div>

          <div className="rounded-md border border-yellow-400/40 bg-yellow-50 px-3 py-2 text-[12px] text-yellow-900 flex gap-2 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            These defaults will be used as the initial settings for any
            primary or read replica computes you create. Modifying these
            defaults does not alter the settings of any existing computes.
          </div>
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
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !dirty}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DualSlider({
  minIdx,
  maxIdx,
  onMin,
  onMax,
}: {
  minIdx: number;
  maxIdx: number;
  onMin: (i: number) => void;
  onMax: (i: number) => void;
}) {
  const last = CU_STEPS.length - 1;
  const minPct = (minIdx / last) * 100;
  const maxPct = (maxIdx / last) * 100;
  return (
    <div className="relative pt-3 pb-7">
      <div className="relative h-1 rounded bg-muted">
        <div
          className="absolute h-1 rounded bg-foreground"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={minIdx}
        onChange={(e) => onMin(Number(e.target.value))}
        aria-label="Minimum compute units"
        className="absolute inset-x-0 top-2 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground"
      />
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={maxIdx}
        onChange={(e) => onMax(Number(e.target.value))}
        aria-label="Maximum compute units"
        className="absolute inset-x-0 top-2 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground"
      />
      <div className="absolute inset-x-0 top-6 flex justify-between text-[10px] text-muted-foreground">
        {CU_STEPS.map((cu) => (
          <span key={cu}>{cu}</span>
        ))}
      </div>
    </div>
  );
}
