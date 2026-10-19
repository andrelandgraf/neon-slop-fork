"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { PageBody } from "@/components/page-header";
import { useCustomDomains, useFunctions, useTriggers } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { CustomDomainRow, FunctionRow, TriggerRow } from "@/lib/live/queries";
import { FunctionCard, type FunctionSummary } from "./function-card";

/** The branch's functions with their triggers and domains, or the empty state while there are none; live. */
export function LiveFunctions({
  projectId,
  branchId,
  functions: functionsSeed,
  triggers: triggersSeed,
  domains: domainsSeed,
  empty,
  header,
}: {
  projectId: string;
  branchId: string;
  functions: LiveSeed<FunctionRow>;
  triggers: LiveSeed<TriggerRow>;
  domains: LiveSeed<CustomDomainRow>;
  empty: React.ReactNode;
  header: React.ReactNode;
}) {
  const functionsCollection = useFunctions(branchId, functionsSeed);
  const triggersCollection = useTriggers(branchId, triggersSeed);
  const domainsCollection = useCustomDomains(branchId, domainsSeed);
  const functions = useLiveQuery((q) => q.from({ fn: functionsCollection }).orderBy(({ fn }) => fn.id, "asc"));
  const triggers = useLiveQuery((q) => q.from({ t: triggersCollection }));
  const domains = useLiveQuery((q) => q.from({ d: domainsCollection }));
  const queries = [functions, triggers, domains];

  if (functions.data.length === 0) {
    return (
      <>
        <LiveStatus queries={queries} />
        {empty}
      </>
    );
  }
  const summaries: FunctionSummary[] = functions.data.map(({ data: fn }) => {
    const deployment = fn.active_deployment ?? fn.current_deployment;
    return {
      slug: fn.slug,
      status: deployment?.status ?? "pending",
      lastDeployed: deployment?.created_at ?? null,
      invocationUrl: fn.invocation_url,
      triggers: triggers.data
        .map((row) => row.data)
        .filter((t) => t.function_slug === fn.slug)
        .map((t) =>
          t.type === "schedule"
            ? {
                id: t.trigger_id,
                name: t.name,
                type: t.type,
                functionPath: t.function_path,
                cron: t.schedule.cron,
                enabled: t.enabled,
                inherited: t.inherited,
                nextRunAt: t.next_run_at,
              }
            : {
                id: t.trigger_id,
                name: t.name,
                type: t.type,
                functionPath: t.function_path,
                bucketName: t.storage_object_created.bucket_name,
                prefix: t.storage_object_created.prefix ?? "",
                enabled: t.enabled,
                inherited: t.inherited,
                nextRunAt: null,
              }
        ),
      domains: domains.data
        .map((row) => row.data)
        .filter((d) => d.entity_type === "function" && d.entity_id === fn.slug)
        .map((d) => ({ domain: d.domain, status: d.status })),
    };
  });
  return (
    <PageBody>
      {header}
      <div className="mt-3 space-y-3">
        <LiveStatus queries={queries} />
        {summaries.map((fn) => (
          <FunctionCard key={fn.slug} projectId={projectId} branchId={branchId} fn={fn} />
        ))}
      </div>
    </PageBody>
  );
}
