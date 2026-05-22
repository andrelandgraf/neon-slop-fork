"use client";
import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { updateMaintenanceWindowAction } from "@/app/actions";

const WEEKDAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 7, label: "Sun" },
] as const;

interface MaintenanceWindowInput {
  weekdays: number[];
  start_time: string;
  end_time: string;
}

/**
 * Maintenance window editor. Neon uses this window to schedule
 * compute restarts for Postgres version updates & security patches.
 * Free plan ignores any custom window and rejects the update with
 * a plan-limit error — which we surface inline rather than disabling
 * the form (we can't reliably tell from the API what plan the org
 * is on without a separate call).
 */
export function UpdatesCard({
  projectId,
  initial,
}: {
  projectId: string;
  initial: MaintenanceWindowInput | null;
}) {
  const [enabled, setEnabled] = useState(
    initial !== null && initial.weekdays.length > 0
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.weekdays ?? [3]
  );
  const [startTime, setStartTime] = useState(initial?.start_time ?? "02:00");
  const [endTime, setEndTime] = useState(initial?.end_time ?? "04:00");
  const [pending, startTransition] = useTransition();

  function toggleDay(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    if (enabled) fd.set("enabled", "on");
    fd.set("startTime", startTime);
    fd.set("endTime", endTime);
    for (const w of weekdays) fd.append("weekdays", String(w));
    startTransition(async () => {
      const res = await updateMaintenanceWindowAction(fd);
      if (res.ok) {
        toast.success(
          enabled
            ? "Maintenance window updated."
            : "Maintenance window cleared."
        );
        return;
      }
      const friendly = /maintenance.+(window|requires|not allowed)/i.test(res.error)
        ? "Custom maintenance windows require a paid Neon plan."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Keep your computes up to date with the latest Postgres version
        updates, security patches, and Neon features. Updates require a brief
        restart of your project&apos;s computes.{" "}
        <a
          href="https://neon.com/docs/manage/projects#about-updates"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Learn more <ExternalLink className="h-3 w-3" />
        </a>
      </p>
      <p className="text-sm text-muted-foreground">
        On the Free Plan, Neon schedules updates as needed, typically
        completing in just a few seconds. For more control over when updates
        occur, upgrade your plan and set a specific time window below.
      </p>

      <div className="flex items-center gap-3">
        <Switch
          id="maintenance-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <label htmlFor="maintenance-toggle" className="text-sm">
          Schedule updates inside a maintenance window (UTC)
        </label>
      </div>

      <div
        className={cn(
          "space-y-3 rounded-md border bg-muted/30 p-3",
          !enabled && "opacity-50 pointer-events-none"
        )}
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Weekdays
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = weekdays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Start (UTC)
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm font-mono"
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              End (UTC)
            </div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <Button onClick={handleSave} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enabled ? "Save window" : "Clear window"}
        </Button>
      </div>
    </div>
  );
}
