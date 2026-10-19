"use client";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useCustomDomains, useFunctions } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { CustomDomainRow, FunctionRow } from "@/lib/live/queries";

export function LiveCustomDomains({
  branchId,
  functions: functionsSeed,
  domains: domainsSeed,
}: {
  branchId: string;
  functions: LiveSeed<FunctionRow>;
  domains: LiveSeed<CustomDomainRow>;
}) {
  const functionRows = useFunctions(branchId, functionsSeed);
  const domainRows = useCustomDomains(branchId, domainsSeed);
  const functions = useLiveQuery({
    query: (q) => q.from({ f: functionRows }).where(({ f }) => eq(f.branch_id, branchId)),
  });
  const domains = useLiveQuery({
    query: (q) =>
      q
        .from({ d: domainRows })
        .where(({ d }) => eq(d.branch_id, branchId))
        .orderBy(({ d }) => d.domain),
  });
  return (
    <>
      <LiveStatus queries={[functions, domains]} />
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            {["Domain", "Function", "CNAME target", "Status"].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {domains.data.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                {functions.data.length === 0
                  ? "No functions in this branch"
                  : "No custom domains yet. Add one from a function's card on the Functions page."}
              </td>
            </tr>
          )}
          {domains.data.map(({ data: d }) => (
            <tr key={d.domain} className="border-panel-border border-b">
              <td className="px-3 py-2.5 font-mono text-xs">{d.domain}</td>
              <td className="px-3 py-2.5">{d.entity_id}</td>
              <td className="px-3 py-2.5 font-mono text-xs">{d.cname_target}</td>
              <td className="px-3 py-2.5">{d.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
