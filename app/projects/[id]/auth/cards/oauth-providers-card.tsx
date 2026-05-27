"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { NeonAuthOauthProvider } from "@neondatabase/api-client";
import {
  addAuthOauthProviderAction,
  removeAuthOauthProviderAction,
} from "@/app/actions";

// Providers the upstream auth backend accepts. The SDK enum includes
// `vercel` as well, but the live Neon Auth backend currently rejects
// it with a SCHEMA_ERROR (we verified live: "body.id must be one of
// the following values: google, github, microsoft, spotify, facebook,
// discord, gitlab, bitbucket, linkedin, apple, x, twitch"). We list
// the actually-supported set instead of the SDK enum so users don't
// hit a confusing post-submit error.
const SUPPORTED = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "gitlab", label: "GitLab" },
  { id: "bitbucket", label: "Bitbucket" },
  { id: "spotify", label: "Spotify" },
  { id: "discord", label: "Discord" },
  { id: "twitch", label: "Twitch" },
] as const;

/**
 * OAuth providers card.
 *
 * Each provider can be added either with "shared keys" (Neon's
 * dev-friendly fallback that uses Neon-managed app credentials) or
 * "standard" with your own client_id / client_secret. The REST API
 * picks the type from whether the credentials are supplied — so the
 * add dialog has a clear two-mode toggle. Removing is a single DELETE.
 */
export function OauthProvidersCard({
  projectId,
  branchId,
  providers,
}: {
  projectId: string;
  branchId: string;
  providers: NeonAuthOauthProvider[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const enabledIds = new Set(providers.map((p) => p.id as string));
  const available = SUPPORTED.filter((p) => !enabledIds.has(p.id));

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">OAuth providers</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Select the OAuth sign-in methods you want available in your app.
      </p>

      <div className="space-y-1 mb-3">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{p.id}</span>
              <Badge variant="muted">
                {p.type === "shared" ? "Shared keys" : "Standard"}
              </Badge>
            </div>
            <form
              action={async () => {
                setError(null);
                const result = await removeAuthOauthProviderAction(
                  projectId,
                  branchId,
                  p.id as string
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
        {providers.length === 0 && (
          <div className="text-xs text-muted-foreground italic px-1 py-2">
            No OAuth providers configured yet.
          </div>
        )}
      </div>

      <AddProviderDialog
        projectId={projectId}
        branchId={branchId}
        available={available}
        disabled={available.length === 0}
      />

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="font-mono">{error}</div>
        </div>
      )}
    </Card>
  );
}

function AddProviderDialog({
  projectId,
  branchId,
  available,
  disabled,
}: {
  projectId: string;
  branchId: string;
  available: readonly { id: string; label: string }[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"shared" | "standard">("shared");
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="h-3.5 w-3.5" />
          Add OAuth provider
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add OAuth provider</DialogTitle>
          <DialogDescription>
            Use Neon&apos;s shared development keys, or plug in your own
            production OAuth app credentials.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData: FormData) => {
            const result = await addAuthOauthProviderAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.refresh();
          }}
          className="space-y-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="branchId" value={branchId} />
          <div className="space-y-1">
            <Label htmlFor="providerId">Provider</Label>
            <select
              id="providerId"
              name="providerId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              required
            >
              <option value="" disabled>
                Pick a provider
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1 rounded-md border p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("shared")}
              className={`flex-1 px-2 py-1 rounded ${
                mode === "shared" ? "bg-muted font-medium" : ""
              }`}
            >
              Shared keys
            </button>
            <button
              type="button"
              onClick={() => setMode("standard")}
              className={`flex-1 px-2 py-1 rounded ${
                mode === "standard" ? "bg-muted font-medium" : ""
              }`}
            >
              Your keys
            </button>
          </div>

          {mode === "standard" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="clientId">Client ID</Label>
                <Input id="clientId" name="clientId" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientSecret">Client secret</Label>
                <Input
                  id="clientSecret"
                  name="clientSecret"
                  type="password"
                  required
                />
              </div>
            </>
          )}
          {mode === "shared" && (
            <p className="text-[11px] text-muted-foreground">
              Shared keys are intended for development only and use Neon&apos;s
              shared OAuth app. Switch to your keys before going live.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="font-mono">{error}</div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Adding…">Add provider</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
