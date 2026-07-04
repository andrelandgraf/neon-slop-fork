"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NeonAuthIntegration } from "@neon/sdk";

/**
 * Read-only "Project Info" card.
 *
 * Neon's REST API doesn't expose an "auth URL" field directly — the
 * upstream console derives it from the JWKS URL by stripping the well-
 * known path. Neon Auth serves its JWKS at
 * `${base}/.well-known/jwks.json`, so we mirror that derivation here.
 *
 * The application name is managed by the auth provider and isn't surfaced
 * through the public REST API, so we render it read-only — same shape as
 * the upstream console.
 */
export function ProjectInfoCard({
  integration,
}: {
  integration: NeonAuthIntegration;
}) {
  const baseUrl =
    integration.base_url ??
    integration.jwks_url.replace(/\/\.well-known\/jwks\.json$/, "");

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Project Info</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Stable identifiers your client and server SDKs need to connect.
      </p>

      <div className="space-y-3 text-sm">
        <ReadonlyField
          label="Auth Base URL"
          value={baseUrl}
          hint="Used by client SDKs to reach the auth provider."
        />
        <ReadonlyField
          label="JWKS URL"
          value={integration.jwks_url}
          hint="Used by your backend to verify JWTs."
        />
        <ReadonlyField
          label="Database"
          value={integration.db_name}
          hint={`Synced via neon_auth schema on this branch.`}
        />
      </div>
    </Card>
  );
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in sandboxes; the value is visible anyway.
    }
  }
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-md border bg-muted/30 text-xs font-mono break-all">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
