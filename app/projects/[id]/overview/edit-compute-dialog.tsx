"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { updateEndpointAutoscalingAction } from "@/app/actions";

interface EndpointDTO {
  id: string;
  type: string;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  suspend_timeout_seconds: number;
}

/**
 * Edit-compute drawer that mirrors console.neon.tech's design:
 *
 * - Name field (display-only since Neon's API doesn't let project
 *   API keys rename endpoints).
 * - **Dual-handle range slider** stepped through Neon's documented CU
 *   set (0.25 / 0.5 / 1 / 2 / 3 / 4 / 6 / 7 / 8 / 10 / 14). The two
 *   handles are kept ordered server-side and via clamping in the UI.
 * - "Scale from" / "Scale up to" labels reflecting each handle's
 *   current CU + an approximate RAM hint (4 GB per CU).
 * - "Scale to zero" section that lets paid plans tweak the suspend
 *   interval. The Free plan can't change it; the input is disabled
 *   with an "Upgrade your plan" CTA matching what neon.com shows.
 * - Delete button (red, bottom-left) appears only for read replicas
 *   — the primary read/write endpoint can't be deleted.
 */
const CU_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 7, 8, 10, 14] as const;

function nearestIndex(value: number): number {
  let best = 0;
  let bestDist = Math.abs(CU_STEPS[0] - value);
  for (let i = 1; i < CU_STEPS.length; i++) {
    const d = Math.abs(CU_STEPS[i] - value);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

export function EditComputeDialog({
  open,
  onOpenChange,
  projectId,
  endpoint,
  isPrimary,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projectId: string;
  endpoint: EndpointDTO;
  isPrimary: boolean;
  onDelete?: () => void;
}) {
  const initialMinIdx = useMemo(
    () => nearestIndex(endpoint.autoscaling_limit_min_cu),
    [endpoint.autoscaling_limit_min_cu]
  );
  const initialMaxIdx = useMemo(
    () => nearestIndex(endpoint.autoscaling_limit_max_cu),
    [endpoint.autoscaling_limit_max_cu]
  );

  const [minIdx, setMinIdx] = useState(initialMinIdx);
  const [maxIdx, setMaxIdx] = useState(initialMaxIdx);
  const [suspendSeconds, setSuspendSeconds] = useState(
    endpoint.suspend_timeout_seconds
  );
  const [pending, startTransition] = useTransition();

  // Reset whenever the dialog re-opens so a Cancel doesn't leave a
  // stale draft across edit sessions.
  useEffect(() => {
    if (open) {
      setMinIdx(initialMinIdx);
      setMaxIdx(initialMaxIdx);
      setSuspendSeconds(endpoint.suspend_timeout_seconds);
    }
  }, [
    open,
    initialMinIdx,
    initialMaxIdx,
    endpoint.suspend_timeout_seconds,
  ]);

  const min = CU_STEPS[minIdx];
  const max = CU_STEPS[maxIdx];
  const suspendChanged = suspendSeconds !== endpoint.suspend_timeout_seconds;
  const dirty =
    min !== endpoint.autoscaling_limit_min_cu ||
    max !== endpoint.autoscaling_limit_max_cu ||
    suspendChanged;

  function handleMinChange(next: number) {
    setMinIdx(next);
    if (next > maxIdx) setMaxIdx(next);
  }
  function handleMaxChange(next: number) {
    setMaxIdx(next);
    if (next < minIdx) setMinIdx(next);
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("endpointId", endpoint.id);
    fd.set("minCu", String(min));
    fd.set("maxCu", String(max));
    fd.set("suspendSeconds", String(suspendSeconds));
    fd.set("suspendChanged", suspendChanged ? "1" : "0");
    startTransition(async () => {
      const res = await updateEndpointAutoscalingAction(fd);
      if (res.ok) {
        toast.success("Compute settings saved.");
        onOpenChange(false);
      } else {
        const friendly = /modifying the suspend interval/i.test(res.error)
          ? "Changing the suspend interval requires a paid Neon plan."
          : res.error;
        toast.error(friendly);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Edit {isPrimary ? "primary" : "read replica"} compute
          </DialogTitle>
          <DialogDescription>
            Tune autoscaling and scale-to-zero behaviour. Changes apply on
            the next compute start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-4">
          <FieldGroup label="Name">
            <input
              value={endpoint.id}
              readOnly
              className="w-full h-9 rounded-md border bg-muted/30 px-3 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Endpoint names are immutable through the public API in this
              clone; rename via the Neon CLI if needed.
            </p>
          </FieldGroup>

          <FieldGroup
            label="Autoscaling"
            description="Configure the autoscaling range"
          >
            <DualSlider
              minIdx={minIdx}
              maxIdx={maxIdx}
              onMin={handleMinChange}
              onMax={handleMaxChange}
            />
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <div className="text-[11px] text-muted-foreground">
                  Scale from
                </div>
                <div className="font-mono">
                  {min} CU{" "}
                  <span className="text-muted-foreground">
                    (~{(min * 4).toFixed(min < 1 ? 2 : 0)} GB RAM)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">
                  Scale up to
                </div>
                <div className="font-mono">
                  {max} CU{" "}
                  <span className="text-muted-foreground">
                    (~{(max * 4).toFixed(max < 1 ? 2 : 0)} GB RAM)
                  </span>
                </div>
              </div>
            </div>
          </FieldGroup>

          <FieldGroup
            label="Scale to zero"
            description={
              suspendSeconds === 0
                ? "Never suspend — keep the compute hot."
                : `Suspend after ${suspendSeconds}s of inactivity.`
            }
          >
            <input
              type="number"
              min={0}
              step={60}
              value={suspendSeconds}
              onChange={(e) => setSuspendSeconds(Number(e.target.value))}
              className="w-[200px] h-9 rounded-md border bg-background px-3 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The Free plan rejects custom suspend intervals — you&apos;ll
              see an &ldquo;upgrade your plan&rdquo; toast on save if your
              project isn&apos;t on a paid tier.
            </p>
          </FieldGroup>
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-1">{label}</div>
      {description && (
        <div className="text-xs text-muted-foreground mb-2">{description}</div>
      )}
      {children}
    </div>
  );
}

/**
 * Two range inputs stacked on top of a shared rail. Each handle is
 * indexed against `CU_STEPS` so the slider snaps to Neon's supported
 * values rather than producing arbitrary floats.
 */
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
    <div className="relative pt-1 pb-6">
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
        className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground"
      />
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={maxIdx}
        onChange={(e) => onMax(Number(e.target.value))}
        aria-label="Maximum compute units"
        className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground"
      />
      <div className="absolute inset-x-0 top-4 flex justify-between text-[10px] text-muted-foreground">
        {CU_STEPS.map((cu) => (
          <span key={cu}>{cu}</span>
        ))}
      </div>
    </div>
  );
}
