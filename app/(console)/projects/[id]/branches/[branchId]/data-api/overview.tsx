"use client";
import { useTransition } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, Loader2, ShieldAlert, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyAction } from "@/components/code-panel";
import { refreshDataApiSchemaCacheAction } from "@/app/actions";

export function DataApiOverview({
  projectId,
  branchId,
  databaseName,
  url,
  authEnabled,
  tables,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
  url: string;
  authEnabled: boolean;
  tables: { total: number; withoutRls: number };
}) {
  const [refreshing, startRefresh] = useTransition();
  const base = `/projects/${projectId}/branches/${branchId}`;

  return (
    <div className="space-y-10">
      <Section
        title="API"
        description="Access your database through auto-generated REST API endpoints."
      >
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">API URL</h3>
          <p className="text-muted-foreground text-xs">
            Provides read-write access to tables without Row Level Security enabled.
          </p>
          <div className="flex items-start justify-between gap-3 rounded-[3px] border border-panel-border bg-muted px-3 py-2.5">
            <code className="break-all font-mono text-xs">{url}</code>
            <CopyAction text={url} label="Copy API URL" iconOnly />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/projects/${projectId}/settings/postgres?branch=${branchId}#data-api`} />}
          >
            Configure Data API
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a href="https://neon.com/docs/data-api/get-started" target="_blank" rel="noreferrer" />
            }
          >
            Open quickstart
          </Button>
          <span className="text-muted-foreground text-xs">
            Connect the Data API to your app with a step-by-step guide.
          </span>
        </div>
        <p className="mt-3 text-muted-foreground text-xs">
          To read and write data with the Data API, set up{" "}
          <Link href={`${base}/auth`} className="text-link">
            authentication
          </Link>{" "}
          and RLS policies.{" "}
          <a
            className="text-link"
            href="https://neon.com/docs/data-api/get-started"
            target="_blank"
            rel="noreferrer"
          >
            Learn more
          </a>
        </p>
        <div className="mt-5 space-y-2">
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={() =>
              startRefresh(async () => {
                const result = await refreshDataApiSchemaCacheAction(projectId, branchId, databaseName);
                if (result.ok) toast.success("Schema cache refreshed");
                else toast.error(result.error);
              })
            }
          >
            {refreshing && <Loader2 className="size-3.5 animate-spin" />}
            Refresh schema cache
          </Button>
          <p className="text-muted-foreground text-xs">
            If you have made changes to the database schema, you can refresh the
            schema cache to apply them immediately.
          </p>
        </div>
      </Section>
      <Section
        title="Security"
        description={
          <>
            To build apps that use the Data API, configure authentication for
            your users and{" "}
            <a
              className="text-link"
              href="https://neon.com/postgresql/postgresql-administration/postgresql-row-level-security"
              target="_blank"
              rel="noreferrer"
            >
              Row-Level Security in Postgres
            </a>
            .
          </>
        }
      >
        <div className="divide-y divide-panel-border rounded-[3px] border border-panel-border">
          <div className="flex items-start gap-3 px-4 py-3">
            {authEnabled ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-semibold">
                {authEnabled ? "Neon Auth is ready" : "Neon Auth is not enabled"}
              </div>
              <p>
                Go to the Neon Auth page for instructions on configuring
                authentication for your application.
              </p>
            </div>
            <Button variant="outline" nativeButton={false} render={<Link href={`${base}/auth`} />}>
              <UserRoundCheck className="size-3.5" />
              Neon Auth
            </Button>
          </div>
          <div className="flex items-start gap-3 px-4 py-3">
            {tables.total > 0 && tables.withoutRls > 0 ? (
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            ) : (
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="text-sm">
              <div className="font-semibold">Protect your data</div>
              <p>
                {tables.total === 0
                  ? "There are no tables in your project yet. When you create tables, be sure to enable "
                  : tables.withoutRls > 0
                    ? `${tables.withoutRls} of ${tables.total} tables don't have `
                    : "All tables have "}
                <a
                  className="text-link"
                  href="https://neon.com/docs/guides/row-level-security"
                  target="_blank"
                  rel="noreferrer"
                >
                  Row-Level Security
                </a>
                {tables.total === 0 ? " to protect your data." : tables.withoutRls > 0 ? " enabled." : " enabled."}
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-10">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
