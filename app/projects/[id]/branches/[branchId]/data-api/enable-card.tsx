"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Switch } from "@/components/ui/switch";
import { Database, AlertCircle } from "lucide-react";
import { enableDataApiAction } from "@/app/actions";

/**
 * "Enable Data API" empty state. Mirrors the upstream console: two
 * opt-in toggles (default both on) and a single primary button. The
 * Switch component fires onChange callbacks for the UI; we mirror the
 * value into a hidden `<input>` so the value rides along with the form
 * submit. The form is a `use client` boundary so we can render the
 * action's result inline as an error.
 */
export function EnableDataApiCard({
  projectId,
  branchId,
  databaseName,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
}) {
  const [useNeonAuth, setUseNeonAuth] = useState(true);
  const [grantPublic, setGrantPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Enable Neon Data API</h2>
          <p className="text-sm text-muted-foreground">
            Auto-generated PostgREST endpoints for{" "}
            <code className="text-xs">{databaseName}</code>.
          </p>
        </div>
      </div>

      <form
        action={async (formData: FormData) => {
          const result = await enableDataApiAction(formData);
          if (!result.ok) setError(result.error);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />
        <input type="hidden" name="databaseName" value={databaseName} />
        <input
          type="hidden"
          name="useNeonAuth"
          value={useNeonAuth ? "on" : "off"}
        />
        <input
          type="hidden"
          name="grantPublicSchemaAccess"
          value={grantPublic ? "on" : "off"}
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <Switch
            checked={useNeonAuth}
            onCheckedChange={setUseNeonAuth}
            aria-label="Use Neon Auth"
            className="mt-0.5"
          />
          <div className="text-sm">
            <div className="font-medium">Use Neon Auth</div>
            <p className="text-muted-foreground">
              Manages sign-up, login, and account access for the Data API. It
              issues the JWTs required for API requests.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <Switch
            checked={grantPublic}
            onCheckedChange={setGrantPublic}
            aria-label="Grant public schema access"
            className="mt-0.5"
          />
          <div className="text-sm">
            <div className="font-medium">Grant public schema access</div>
            <p className="text-muted-foreground">
              Applies grants so authenticated users can read and write to tables
              in the public schema. Once enabled, add Row-Level Security (RLS)
              policies to define which rows they can access.
            </p>
          </div>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="font-mono">{error}</div>
          </div>
        )}

        <div className="pt-2">
          <SubmitButton pendingLabel="Enabling…">
            <Database className="h-3.5 w-3.5" />
            Enable Data API
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
