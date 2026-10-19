"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { useProjectLive } from "@/components/live/project-live";
import { LiveStatus } from "@/components/live/live-status";
import { LocalTime } from "@/components/local-time";

const opTime = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The project's newest operations that touch this branch (or no branch), live as they run. */
export function OperationsTable({ branchId }: { branchId: string }) {
  const live = useProjectLive();
  const query = useLiveQuery((q) => q.from({ op: live.operations }).orderBy(({ op }) => op.created_at, "desc"));
  const { data } = query;
  const operations = data.filter((op) => !op.branch_id || op.branch_id === branchId);
  return (
    <>
    <LiveStatus queries={[query]} />
    <div className="overflow-x-auto rounded-[3px] border border-panel-border">
      <table className="w-full text-sm">
        <thead className="bg-table-head text-left">
          <tr>
            {["Operation", "Compute", "Operation status", "Duration", "Date"].map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => (
            <tr key={op.id} className="border-panel-border border-t align-top">
              <td className="px-4 py-2">{op.action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</td>
              <td className="px-4 py-2">{op.endpoint_id ?? ""}</td>
              <td className="px-4 py-2">{op.status === "finished" ? "OK" : op.status}</td>
              <td className="px-4 py-2">
                {op.total_duration_ms >= 1000 ? `${Math.round(op.total_duration_ms / 1000)} s` : `${op.total_duration_ms} ms`}
              </td>
              <td className="px-4 py-2 font-mono text-xs">
                <LocalTime date={op.created_at} format={opTime} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
