"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addAuthTrustedDomainAction,
  removeAuthTrustedDomainAction,
  setAuthAllowLocalhostAction,
} from "@/app/actions";

/**
 * "Domains" card — the redirect-URI whitelist + allow-localhost toggle.
 *
 * Localhost is a single boolean on the auth provider; the trusted-domain
 * list is a separate REST resource we patch with add/delete calls. We
 * fire those individually rather than diffing because the upstream API
 * doesn't have a bulk PUT — Neon expects one mutation per domain.
 */
export function DomainsCard({
  projectId,
  branchId,
  domains,
  allowLocalhost,
}: {
  projectId: string;
  branchId: string;
  domains: string[];
  allowLocalhost: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [localhost, setLocalhost] = useState(allowLocalhost);
  const [localhostPending, setLocalhostPending] = useState(false);

  // Sync local state when the server prop changes after a `router.refresh()`.
  // The upstream auth API silently keeps `allow_localhost=true` until a user
  // exists, so re-rendering with the canonical value is the only way to
  // avoid a stale "off" state in the UI after the refresh.
  useEffect(() => {
    setLocalhost(allowLocalhost);
  }, [allowLocalhost]);

  async function onLocalhostChange(next: boolean) {
    setError(null);
    setLocalhostPending(true);
    const previous = localhost;
    setLocalhost(next);
    const result = await setAuthAllowLocalhostAction(projectId, branchId, next);
    if (!result.ok) {
      setError(result.error);
      setLocalhost(previous);
    }
    setLocalhostPending(false);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Domains</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Enter trusted domains for authentication redirects (e.g., SSO). Your app
        will only redirect to domains on this list. All others will be blocked.
      </p>

      <form
        action={async (formData: FormData) => {
          setError(null);
          const result = await addAuthTrustedDomainAction(formData);
          if (!result.ok) setError(result.error);
        }}
        className="space-y-2 mb-4"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />
        <Label htmlFor="domain">Add new domain</Label>
        <div className="flex gap-2">
          <Input
            id="domain"
            name="domain"
            type="url"
            required
            placeholder="https://example.com"
            className="flex-1"
          />
          <SubmitButton variant="outline" pendingLabel="Adding…">
            <Plus className="h-3.5 w-3.5" />
            Add domain
          </SubmitButton>
        </div>
      </form>

      {domains.length > 0 && (
        <div className="space-y-1 mb-4">
          {domains.map((d) => (
            <div
              key={d}
              className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
            >
              <code className="font-mono text-xs">{d}</code>
              <form
                action={async () => {
                  setError(null);
                  const result = await removeAuthTrustedDomainAction(
                    projectId,
                    branchId,
                    d
                  );
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                }}
              >
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  pendingLabel="…"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 pt-3 border-t">
        <div className="text-sm">
          <div className="font-medium">Allow Localhost</div>
          <p className="text-xs text-muted-foreground">
            Allow authentication requests from localhost. Only enable this for
            local development, as it can reduce your security in production
            environments.
          </p>
        </div>
        <Switch
          checked={localhost}
          onCheckedChange={onLocalhostChange}
          disabled={localhostPending}
          aria-label="Allow Localhost"
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="font-mono">{error}</div>
        </div>
      )}
    </Card>
  );
}
