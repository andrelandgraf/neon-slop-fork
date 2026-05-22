"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateHistoryWindowAction } from "@/app/actions";

const STEPS = [0, 1, 6, 12, 24, 72, 168, 336, 720] as const;

function nearestStep(hours: number): number {
  let best = 0;
  let dist = Math.abs(STEPS[0] - hours);
  for (let i = 1; i < STEPS.length; i++) {
    const d = Math.abs(STEPS[i] - hours);
    if (d < dist) {
      best = i;
      dist = d;
    }
  }
  return best;
}

function formatHours(hours: number): string {
  if (hours === 0) return "Off";
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return `${days}d`;
}

/**
 * History window: how long Neon retains the WAL for instant restore
 * & branch-from-past. API field: `history_retention_seconds`, capped
 * at 30 days (2592000s) — Free plan in practice caps at 24h and
 * rejects higher values with a plan-limit error we surface inline.
 */
export function HistoryWindowCard({
  projectId,
  initialHours,
}: {
  projectId: string;
  initialHours: number;
}) {
  const [stepIdx, setStepIdx] = useState(() => nearestStep(initialHours));
  const [pending, startTransition] = useTransition();
  const hours = STEPS[stepIdx];
  const dirty = hours !== initialHours;

  function handleSave() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("hours", String(hours));
    startTransition(async () => {
      const res = await updateHistoryWindowAction(fd);
      if (res.ok) {
        toast.success(
          hours === 0
            ? "History window disabled."
            : `History window set to ${formatHours(hours)}.`
        );
        return;
      }
      const friendly = /history_retention_seconds/i.test(res.error)
        ? "Your Neon plan doesn't allow that long a history window."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose how long to keep a change history. Used for instant restore,
        time travel, and branching from past states.{" "}
        <a
          href="https://neon.com/docs/introduction/branching"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          View your current history storage.
        </a>
      </p>

      <div className="relative pt-4 pb-7">
        <div className="relative h-1 rounded bg-muted">
          <div
            className="absolute h-1 rounded bg-foreground"
            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={STEPS.length - 1}
          step={1}
          value={stepIdx}
          onChange={(e) => setStepIdx(Number(e.target.value))}
          aria-label="History retention in hours"
          className="absolute inset-x-0 top-3 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground"
        />
        <div className="absolute inset-x-0 top-7 flex justify-between text-[10px] text-muted-foreground">
          {STEPS.map((h) => (
            <span key={h}>{formatHours(h)}</span>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Need a larger restore window? Upgrade your Neon plan to get up to 30
        days.
      </p>

      <div>
        <Button onClick={handleSave} disabled={pending || !dirty}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
