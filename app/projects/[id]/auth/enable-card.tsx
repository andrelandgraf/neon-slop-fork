"use client";
import { useState } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { enableAuthAction } from "@/app/actions";

/**
 * "Enable Neon Auth" empty state. We pre-pick the `stack` provider (the
 * Neon default) and don't expose a provider switcher in the enable form —
 * Better Auth and Mock are special-purpose, and the upstream console
 * defaults to Stack too. Users can transfer to their own Stack/BetterAuth
 * project later via the (legacy) transfer-ownership endpoint.
 */
export function EnableAuthCard({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Enable Neon Auth</h2>
          <p className="text-sm text-muted-foreground">
            Provisions a managed auth provider for this branch and creates the
            <code className="mx-1 text-xs">neon_auth.users_sync</code>
            table in your database.
          </p>
        </div>
      </div>

      <form
        action={async (formData: FormData) => {
          const result = await enableAuthAction(formData);
          if (!result.ok) setError(result.error);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="font-mono">{error}</div>
          </div>
        )}

        <SubmitButton pendingLabel="Enabling…">
          <Lock className="h-3.5 w-3.5" />
          Enable Neon Auth
        </SubmitButton>
      </form>
    </Card>
  );
}
