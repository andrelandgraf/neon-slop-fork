"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NeonAuthWebhookConfig } from "@neon/sdk";
import { updateAuthWebhookConfigAction } from "@/app/actions";

/**
 * Webhooks card.
 *
 * The webhook config is a single PUT — enable + URL + timeout — so we
 * mirror that into one form. Event subscriptions (user.created, etc.)
 * are an array we could surface as checkboxes too, but the upstream
 * console doesn't expose per-event toggles either; the events are
 * implicit on `enabled`. Adding them is a future iteration.
 */
export function WebhooksCard({
  projectId,
  branchId,
  config,
}: {
  projectId: string;
  branchId: string;
  config: NeonAuthWebhookConfig | null;
}) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [feedback, setFeedback] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Webhooks</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Receive HTTP callbacks for authentication events (e.g.,
        <code className="mx-1 text-[11px] font-mono">user.created</code>).
      </p>

      <form
        action={async (formData) => {
          const result = await updateAuthWebhookConfigAction(formData);
          setFeedback(result);
        }}
        className="space-y-3"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />
        <input
          type="hidden"
          name="enabled"
          value={enabled ? "on" : "off"}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">Enable webhooks</div>
            <p className="text-xs text-muted-foreground">
              Send webhook callbacks for authentication events.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Enable webhooks"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            name="webhookUrl"
            type="url"
            disabled={!enabled}
            defaultValue={config?.webhook_url ?? ""}
            placeholder="https://example.com/webhooks/neon-auth"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
          <Input
            id="timeoutSeconds"
            name="timeoutSeconds"
            type="number"
            min={1}
            max={10}
            defaultValue={config?.timeout_seconds ?? 5}
            disabled={!enabled}
          />
        </div>

        {feedback && !feedback.ok && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="font-mono">{feedback.error}</div>
          </div>
        )}
        {feedback && feedback.ok && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved.
          </div>
        )}

        <SubmitButton size="sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </form>
    </Card>
  );
}
