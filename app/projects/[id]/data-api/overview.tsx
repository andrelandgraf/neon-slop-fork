"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DataApiReponse, NeonAuthIntegration } from "@neon/sdk";
import { refreshDataApiSchemaCacheAction } from "@/app/actions";

/**
 * Read-only "API" tab. Shows the API URL with a copy button, the
 * Neon Auth status, and a "Refresh schema cache" trigger. We don't
 * surface a connection-test affordance because PostgREST requires a
 * JWT to do anything useful — calling it unauth'd just returns a
 * "no authorization header" 401 that would scare new users.
 */
export function DataApiOverview({
  projectId,
  branchId,
  databaseName,
  dataApi,
  authIntegration,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
  dataApi: DataApiReponse;
  authIntegration: NeonAuthIntegration | null;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function onCopy() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(dataApi.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail silently in some sandboxed iframes
      // (Next dev preview, embed contexts). We don't fall back to
      // an alert because the URL is already visible in the input.
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    const result = await refreshDataApiSchemaCacheAction(
      projectId,
      branchId,
      databaseName
    );
    if (!result.ok) setError(result.error);
    setRefreshing(false);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="text-sm font-semibold">API</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Access your database through auto-generated REST API endpoints.
        </p>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            API URL
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md border bg-muted/30 text-xs font-mono truncate">
              {dataApi.url}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCopy}
              aria-label="Copy API URL"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Badge variant="muted">{dataApi.status ?? "unknown"}</Badge>
            <span>·</span>
            <span>
              Database <code className="font-mono">{databaseName}</code>
            </span>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          To read and write data with the Data API, set up{" "}
          <Link
            href={`/projects/${projectId}/auth?branch=${branchId}`}
            className="text-primary hover:underline"
          >
            authentication
          </Link>{" "}
          and RLS policies.{" "}
          <a
            href="https://neon.tech/docs/data-api/get-started"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Learn more <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-5 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing…" : "Refresh schema cache"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            If you have made changes to the database schema, you can refresh
            the schema cache to apply them immediately.
          </p>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="font-mono">{error}</div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Security</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          To build apps that use the Data API, configure authentication for your
          users and{" "}
          <a
            href="https://neon.tech/docs/guides/neon-rls"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Row-Level Security in Postgres
          </a>
          .
        </p>

        <div
          className={`rounded-md border p-3 ${
            authIntegration
              ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              : "border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {authIntegration ? (
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5 dark:text-emerald-300" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 dark:text-amber-300" />
            )}
            <div className="text-xs flex-1">
              {authIntegration ? (
                <>
                  <div className="font-semibold mb-0.5">Neon Auth is ready</div>
                  <p className="text-muted-foreground">
                    Go to the{" "}
                    <Link
                      href={`/projects/${projectId}/auth?branch=${branchId}`}
                      className="text-primary hover:underline"
                    >
                      Neon Auth
                    </Link>{" "}
                    page for instructions on configuring authentication for
                    your application.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-semibold mb-0.5">
                    Neon Auth is not enabled
                  </div>
                  <p className="text-muted-foreground">
                    Enable Neon Auth on this branch to issue JWTs the Data API
                    can verify.{" "}
                    <Link
                      href={`/projects/${projectId}/auth?branch=${branchId}`}
                      className="text-primary hover:underline"
                    >
                      Go to Neon Auth →
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
