"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Globe, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BucketRowActions } from "./bucket-row-actions";
import { useLiveQuery } from "@tanstack/react-db";
import { useBuckets } from "@/components/live/project-live";
import { LiveStatus } from "@/components/live/live-status";
import { LocalTime } from "@/components/local-time";
import type { LiveSeed } from "@/lib/live/load";
import type { BucketRow as BucketLiveRow } from "@/lib/live/queries";

export function BucketTable({
  projectId,
  branchId,
  buckets: seed,
  actions,
}: {
  projectId: string;
  branchId: string;
  buckets: LiveSeed<BucketLiveRow>;
  actions: React.ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const collection = useBuckets(branchId, seed);
  const live = useLiveQuery((q) => q.from({ bucket: collection }).orderBy(({ bucket }) => bucket.name, "asc"));
  const buckets = live.data.map((b) => ({ name: b.name, public: b.access_level === "public_read", createdAt: b.created_at }));
  const visible = buckets.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));
  const base = `/projects/${projectId}/branches/${branchId}/storage`;

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <label className="flex h-8 w-[300px] items-center gap-2 rounded-[3px] border border-panel-border px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buckets"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <LiveStatus queries={[live]} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Refresh" onClick={() => router.refresh()}>
            <RefreshCw className="size-3.5" />
          </Button>
          {actions}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            <th className="px-3 py-2.5 font-semibold">Name</th>
            <th className="w-40 px-3 py-2.5 font-semibold">Visibility</th>
            <th className="w-36 px-3 py-2.5 font-semibold">Created</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {visible.map((bucket) => {
            const href = `${base}/${encodeURIComponent(bucket.name)}`;
            return (
              <tr key={bucket.name} className="border-panel-border border-b">
                <td className="px-3 py-2.5">
                  <Link href={href} className="inline-flex items-center gap-2 font-mono hover:underline">
                    <Archive className="size-3.5 text-muted-foreground" />
                    {bucket.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    {bucket.public ? <Globe className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                    {bucket.public ? "Public" : "Private"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <LocalTime date={bucket.createdAt} format={(d) => d.toLocaleDateString("en-US")} />
                </td>
                <td className="px-2 py-2.5 text-right">
                  <BucketRowActions
                    projectId={projectId}
                    branchId={branchId}
                    bucketName={bucket.name}
                    href={href}
                  />
                </td>
              </tr>
            );
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                {buckets.length === 0 ? "No buckets yet." : "No buckets match your search."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
