"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { useShellCollections } from "@/components/live/live-root";
import { formatBytes, formatDate } from "@/lib/format";

export function BillingSummary() {
  const { projects: collection } = useShellCollections();
  const { data: projects } = useLiveQuery((q) => q.from({ project: collection }));
  const computeHours = projects.reduce((s, p) => s + p.compute_time_seconds, 0) / 3600;
  const transfer = projects.reduce((s, p) => s + p.data_transfer_bytes, 0);
  const byTime = (a: Date, b: Date) => a.getTime() - b.getTime();
  const periodStart = projects.map((p) => p.consumption_period_start).sort(byTime)[0];
  const periodEnd = projects.map((p) => p.consumption_period_end).sort(byTime)[0];
  return (
    <>
      <section className="rounded-[3px] border border-panel-border p-5">
        <h2 className="font-semibold text-lg">This month&apos;s summary</h2>
        {periodStart && (
          <p className="text-sm">
            Current billing period: {formatDate(periodStart)} to {formatDate(periodEnd)}
          </p>
        )}
        <div className="mt-4 text-muted-foreground text-xs uppercase">Plan</div>
        <div className="font-semibold text-xl">Free</div>
      </section>
      <section className="rounded-[3px] border border-panel-border p-5">
        <h2 className="mb-3 font-semibold text-lg">Usage</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Compute</dt>
            <dd className="text-lg">{computeHours.toFixed(2)} hours</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Network transfer</dt>
            <dd className="text-lg">{formatBytes(transfer)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Projects</dt>
            <dd className="text-lg">{projects.length}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
