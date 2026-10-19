"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { createRealtimeClient, type RealtimeClient } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery, type UseLiveQueryUtils } from "@neon/realtime-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/neon-ui/empty-state";
import { PAGE_SIZES, rowKey, type PageSize, type TableRow } from "@/lib/tables/preview-sql";
import { renewTableRows, type TableRowsRenewal } from "@/lib/tables/renew";
import { cellText, textParsers } from "@/lib/tables/text-values";
import type { TableLive } from "@/lib/tables/live";
import { TablePreviewActions } from "./table-preview-actions";

export interface TablePreviewProps {
  renewal: TableRowsRenewal;
  columns: { name: string; typeOid: number }[];
  rows: TableRow[];
  primaryKey: string[];
  live: TableLive;
  realtimeHref: string;
}

/** One page of a table: live when the branch's Realtime allows it, otherwise as the server read it. */
export function TablePreview(props: TablePreviewProps) {
  const { live } = props;
  if (live.kind !== "ready") {
    return <PreviewBody {...props} rows={props.rows} notice={<NotLive live={live} realtimeHref={props.realtimeHref} />} />;
  }
  return (
    <LivePreview
      // A different tenant endpoint, database or page needs a fresh client and subscription.
      key={`${live.url}|${props.renewal.databaseName}|${live.sealedQuery.queryFingerprint}`}
      {...props}
      live={live}
    />
  );
}

type ReadyLive = Extract<TableLive, { kind: "ready" }>;

const subscribeNever = () => () => {};

function originAllowed(allowedOrigins: string[], origin: string): boolean {
  return allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function LivePreview(props: TablePreviewProps & { live: ReadyLive }) {
  const { live } = props;
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => null);
  const allowed = origin !== null && originAllowed(live.allowedOrigins, origin);
  const [client, setClient] = useState<RealtimeClient | null>(null);
  // The client owns a WebSocket, so it's created and closed with the effect.
  // Creating it during render would leave a closed client after Strict Mode
  // runs the effect's cleanup and setup twice.
  useEffect(() => {
    if (!allowed) return;
    const created = createRealtimeClient({ url: live.url, parsers: textParsers });
    setClient(created);
    return () => {
      created.close();
      setClient(null);
    };
  }, [allowed, live.url]);

  if (origin !== null && !allowed) {
    return (
      <PreviewBody
        {...props}
        rows={props.rows}
        notice={
          <Notice>
            Realtime on this branch accepts connections from {live.allowedOrigins.join(", ")} only, so rows
            don&apos;t update live here.
          </Notice>
        }
      />
    );
  }
  if (!client) return <PreviewBody {...props} rows={props.rows} indicator={<LiveState status="connecting" />} />;
  return (
    <RealtimeProvider client={client}>
      <SubscribedPreview {...props} />
    </RealtimeProvider>
  );
}

// The hook retries a rejected renewal every second; a promise that never
// settles ends renewals, and the rows stay as they were last synced.
const endRenewals = () => new Promise<never>(() => {});

function SubscribedPreview(props: TablePreviewProps & { live: ReadyLive }) {
  const { renewal } = props;
  const [stopped, setStopped] = useState<string | null>(null);
  const utils = useRef<UseLiveQueryUtils<TableRow> | null>(null);
  const refreshQuery = useCallback(async () => {
    // A subscription in `error` stays there, so renewing it can't help.
    if (utils.current?.getState().status === "error") return endRenewals();
    const result = await renewTableRows(renewal);
    if (result.kind === "renewed") return result.sealedQuery;
    setStopped(result.message);
    return endRenewals();
  }, [renewal]);
  const query = useLiveQuery(props.live.sealedQuery, { refreshQuery, initialData: props.rows });
  useEffect(() => {
    utils.current = query.utils;
  }, [query.utils]);
  const failure = stopped ?? (query.status === "error" ? query.error.message : null);
  return (
    <PreviewBody
      {...props}
      rows={query.data ?? props.rows}
      isLive={query.status === "live" && !stopped}
      indicator={failure === null ? <LiveState status={query.status} /> : null}
      notice={failure === null ? null : <Stopped message={failure} />}
    />
  );
}

function LiveState({ status }: { status: "connecting" | "live" | "stale" | "closed" | "error" }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" />
        Live
      </span>
    );
  }
  if (status === "closed" || status === "error") return null;
  return <span className="text-xs text-muted-foreground">{status === "stale" ? "Reconnecting…" : "Connecting…"}</span>;
}

function Stopped({ message }: { message: string }) {
  return (
    <span role="alert" className="flex items-center gap-2 text-destructive text-xs">
      Live updates stopped: {message}
      <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1 font-semibold underline">
        <RotateCw className="size-3" />
        Reload
      </button>
    </span>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function NotLive({ live, realtimeHref }: { live: Exclude<TableLive, ReadyLive>; realtimeHref: string }) {
  switch (live.kind) {
    case "unsupported":
      return <Notice>Realtime isn&apos;t available in this project&apos;s region, so rows don&apos;t update live.</Notice>;
    case "off":
      return (
        <Notice>
          Realtime is off on this branch.{" "}
          <Link href={realtimeHref} className="font-semibold text-link">
            Turn it on
          </Link>{" "}
          to see rows change live.
        </Notice>
      );
    case "pending":
      return <Notice>Realtime is being set up on this branch. Reload in a moment to see rows change live.</Notice>;
    case "no-primary-key":
      return <Notice>Rows update live only for tables with a primary key.</Notice>;
    case "error":
      return <Notice>Live updates are unavailable: {live.message}</Notice>;
  }
}

function pageHref(renewal: TableRowsRenewal, page: number, pageSize: PageSize): string {
  const params = new URLSearchParams();
  params.set("table", renewal.table);
  params.set("schema", renewal.schema);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `?${params.toString()}`;
}

interface PreviewBodyProps {
  renewal: TableRowsRenewal;
  columns: { name: string; typeOid: number }[];
  primaryKey: string[];
  rows: readonly TableRow[];
  indicator?: React.ReactNode;
  notice?: React.ReactNode;
  isLive?: boolean;
}

function PreviewBody({ renewal, columns, rows, primaryKey, indicator, notice, isLive = false }: PreviewBodyProps) {
  const { schema, table, page, pageSize } = renewal;
  const types = new Map(columns.map((c) => [c.name, c.typeOid]));
  const keyOf = (row: TableRow, index: number) => (primaryKey.length > 0 ? rowKey(row, primaryKey) : String(index));
  return (
    <>
      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm">
            {schema}.{table}
          </div>
          {indicator}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "row" : "rows"} on this page
          </div>
          <TablePreviewActions columns={columns.map((c) => c.name)} rows={rows} showRefresh={!isLive} />
        </div>
      </div>
      {notice && <div className="border-b px-4 py-2">{notice}</div>}
      {rows.length === 0 ? (
        <EmptyState variant="bare" size="md" title="Table is empty" description="No rows on this page yet." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                {columns.map((c) => (
                  <th key={c.name} className="whitespace-nowrap bg-table-head px-3 py-2 text-left font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={keyOf(row, i)} className="border-b last:border-b-0 hover:bg-muted/30">
                  {columns.map((c) => {
                    const text = cellText(row[c.name], types.get(c.name));
                    return (
                      <td key={c.name} className="px-3 py-1.5 font-mono text-[12px] align-top max-w-[260px] truncate" title={text}>
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Rows per page</span>
          {PAGE_SIZES.map((size) => (
            <Link
              key={size}
              href={pageHref(renewal, 1, size)}
              className={
                size === pageSize
                  ? "rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
                  : "rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted"
              }
            >
              {size}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {page > 1 ? (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={pageHref(renewal, page - 1, pageSize)} />}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          )}
          {rows.length === pageSize ? (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={pageHref(renewal, page + 1, pageSize)} />}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
