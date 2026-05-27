"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NeonAuthEmailAndPasswordConfig } from "@neondatabase/api-client";
import { updateAuthEmailPasswordConfigAction } from "@/app/actions";

/**
 * Sign-up / sign-in toggles, matching the upstream console's three
 * switches: Sign-up enabled, Require email verification, Sign-in
 * enabled. The Neon API distinguishes between "sign-up disabled" and
 * "feature disabled"; we reuse the same booleans the upstream surface
 * touches (`disable_sign_up`, `require_email_verification`) so the
 * change-set we POST is identical.
 */
export function EmailPasswordCard({
  projectId,
  branchId,
  config,
}: {
  projectId: string;
  branchId: string;
  config: NeonAuthEmailAndPasswordConfig | null;
}) {
  const initial = {
    enabled: config?.enabled ?? true,
    requireVerification: config?.require_email_verification ?? false,
    disableSignUp: config?.disable_sign_up ?? false,
  };
  const [state, setState] = useState(initial);
  const [feedback, setFeedback] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Authentication</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Configure email and password authentication.
      </p>

      <form
        action={async (formData) => {
          const result = await updateAuthEmailPasswordConfigAction(formData);
          setFeedback(result);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="branchId" value={branchId} />
        <input
          type="hidden"
          name="enabled"
          value={state.enabled ? "on" : "off"}
        />
        <input
          type="hidden"
          name="requireVerification"
          value={state.requireVerification ? "on" : "off"}
        />
        <input
          type="hidden"
          name="disableSignUp"
          value={state.disableSignUp ? "on" : "off"}
        />

        <Toggle
          label="Email & Password"
          description="Allow users to sign in with their email and password."
          checked={state.enabled}
          onChange={(v) => setState((s) => ({ ...s, enabled: v }))}
        />

        <Toggle
          label="Require email verification"
          description="Require email verification when users sign up."
          checked={state.requireVerification}
          onChange={(v) => setState((s) => ({ ...s, requireVerification: v }))}
          disabled={!state.enabled}
        />

        <Toggle
          label="Disable sign-ups"
          description="Block new account creation. Existing users can still sign in."
          checked={state.disableSignUp}
          onChange={(v) => setState((s) => ({ ...s, disableSignUp: v }))}
          disabled={!state.enabled}
        />

        {feedback && !feedback.ok && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="font-mono">{feedback.error}</div>
          </div>
        )}
        {feedback && feedback.ok && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
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

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
