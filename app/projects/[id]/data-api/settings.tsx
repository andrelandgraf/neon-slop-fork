"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DataAPISettings } from "@neondatabase/api-client";
import { updateDataApiSettingsAction } from "@/app/actions";

/**
 * "Settings" tab — the Advanced settings card. The Neon Console
 * groups these fields under one save button; we do the same so a
 * single Patch round-trips every changed field. Anonymous defaults
 * come straight from `DataAPISettings.db_anon_role` ("anonymous"),
 * matching what console.neon.tech ships out of the box.
 */
export function DataApiSettings({
  projectId,
  branchId,
  databaseName,
  settings,
  availableSchemas,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
  settings: DataAPISettings | null;
  availableSchemas: string[] | null;
}) {
  const [feedback, setFeedback] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);
  const [serverTiming, setServerTiming] = useState(
    settings?.server_timing_enabled ?? false
  );

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Advanced settings</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Configure database access, schema exposure, and API behavior.
      </p>

      <form
        action={async (formData) => {
          const result = await updateDataApiSettingsAction(formData);
          setFeedback(result);
        }}
        className="space-y-5"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />
        <input type="hidden" name="databaseName" value={databaseName} />
        <input
          type="hidden"
          name="serverTimingEnabled"
          value={serverTiming ? "on" : "off"}
        />

        <div className="space-y-1">
          <Label htmlFor="schemas">Exposed schemas</Label>
          <Input
            id="schemas"
            name="schemas"
            defaultValue={(settings?.db_schemas ?? ["public"]).join(", ")}
            placeholder="public"
          />
          <p className="text-xs text-muted-foreground">
            Comma- or space-separated list of schemas to expose via the API.
            {availableSchemas && availableSchemas.length > 0 && (
              <>
                {" "}
                Available:{" "}
                <span className="font-mono">{availableSchemas.join(", ")}</span>
                .
              </>
            )}
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="anonRole">Anonymous role</Label>
          <Input
            id="anonRole"
            name="anonRole"
            defaultValue={settings?.db_anon_role ?? "anonymous"}
            placeholder="anonymous"
          />
          <p className="text-xs text-muted-foreground">
            Database role used for unauthenticated requests.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="maxRows">Maximum rows</Label>
          <Input
            id="maxRows"
            name="maxRows"
            type="number"
            min={0}
            defaultValue={settings?.db_max_rows ?? ""}
            placeholder="e.g., 1000"
          />
          <p className="text-xs text-muted-foreground">
            Limit the number of rows returned per request (0 = unlimited).
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="corsOrigins">CORS allowed origins</Label>
          <Input
            id="corsOrigins"
            name="corsOrigins"
            defaultValue={settings?.server_cors_allowed_origins ?? ""}
            placeholder="e.g., https://example.com, https://app.example.com"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of allowed origins for cross-origin requests.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="openapiMode">OpenAPI specification</Label>
          <select
            id="openapiMode"
            name="openapiMode"
            defaultValue={settings?.openapi_mode ?? "disabled"}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="disabled">Disabled</option>
            <option value="ignore-privileges">Ignore privileges</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Controls OpenAPI spec generation.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="text-sm">
            <Label className="cursor-pointer">Server timing headers</Label>
            <p className="text-xs text-muted-foreground">
              Include timing information in response headers for debugging.
            </p>
          </div>
          <Switch
            checked={serverTiming}
            onCheckedChange={setServerTiming}
            aria-label="Server timing headers"
          />
        </div>

        {feedback && !feedback.ok && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="font-mono">{feedback.error}</div>
          </div>
        )}
        {feedback && feedback.ok && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Settings saved.
          </div>
        )}

        <div className="pt-2">
          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
