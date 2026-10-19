import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { neon } from "@/lib/neon";
import { loadOrgProjects } from "@/lib/project-context";
import { requireTenant } from "@/lib/tenancy";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const tenant = await requireTenant("/org/billing");
  const listed = await loadOrgProjects(tenant.activeOrg.id);
  const projects = await Promise.all(listed.map((p) => neon.getProject(p.id).then((r) => r.data.project)));
  const computeHours = projects.reduce((s, p) => s + p.compute_time_seconds, 0) / 3600;
  const transfer = projects.reduce((s, p) => s + p.data_transfer_bytes, 0);
  const periodStart = projects.map((p) => p.consumption_period_start).sort()[0];
  const periodEnd = projects.map((p) => p.consumption_period_end).sort()[0];

  return (
    <PageBody>
      <PageHeader title="Billing" />
      <div className="max-w-[860px] space-y-6">
        <div className="flex gap-2 rounded-[3px] border border-link/30 bg-link/5 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-link" />
          Billing isn&apos;t part of this clone. Projects run in the clone&apos;s shared
          Neon organization under demo limits; the numbers below are this
          organization&apos;s usage from the Neon API.
        </div>
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
      </div>
    </PageBody>
  );
}
