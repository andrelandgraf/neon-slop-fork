import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { requireTenant } from "@/lib/tenancy";
import { BillingSummary } from "./billing-summary";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireTenant("/org/billing");
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
        <BillingSummary />
      </div>
    </PageBody>
  );
}
