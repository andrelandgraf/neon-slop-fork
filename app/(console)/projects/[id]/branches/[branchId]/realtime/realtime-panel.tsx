"use client";
import { useEffect, useState, useTransition } from "react";
import { Copy, ExternalLink, Loader2, RefreshCw, TriangleAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionDialog } from "@/components/action-dialog";
import { CodePanel, CopyAction } from "@/components/code-panel";
import { REALTIME_AGENT_PROMPT } from "@/lib/realtime/agent-prompt";
import {
  disableRealtimeAction,
  enableRealtimeAction,
  getRealtimeSecretAction,
  rotateRealtimeSecretAction,
} from "@/lib/realtime/actions";

const DOCS_URL = "https://neon.com/docs/realtime/overview";
const QUICKSTART_URL = "https://neon.com/docs/realtime/quickstart";
const DESCRIPTION =
  "Neon Realtime makes any SQL query live. Subscribe in realtime to your Lakebase Postgres. Develop reactive apps and agents using type-safe realtime queries and optimistic mutations.";

export function RealtimeDisabled({
  projectId,
  branchId,
  pending,
}: {
  projectId: string;
  branchId: string;
  pending: boolean;
}) {
  const [busy, startTransition] = useTransition();
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <InventoryIllustration />
      <h1 className="mt-6 flex items-center gap-2 text-xl">
        Realtime <Badge className="bg-primary/20 text-foreground">Beta</Badge>
      </h1>
      <p className="mt-2 font-semibold text-base">
        Realtime SQL and reactive DX for building apps and agents
      </p>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        Neon Realtime makes any SQL query realtime. Subscribe in realtime to your
        Lakebase Postgres. Develop reactive apps and agents using type-safe
        realtime queries and optimistic mutations.
      </p>
      <div className="mt-5 flex gap-2">
        <Button
          disabled={busy || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await enableRealtimeAction(projectId, branchId);
              if (result.ok) toast.success("Realtime is being enabled");
              else toast.error(result.error);
            })
          }
        >
          {(busy || pending) && <Loader2 className="size-3.5 animate-spin" />}
          Enable Realtime
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={DOCS_URL} target="_blank" rel="noreferrer" />}
        >
          Learn more
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function RealtimeEnabled({
  projectId,
  branchId,
  endpointUrl,
  pending,
}: {
  projectId: string;
  branchId: string;
  endpointUrl: string;
  pending: boolean;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [dialog, setDialog] = useState<"rotate" | "disable" | null>(null);
  const [copying, startCopy] = useTransition();

  function copySecret() {
    startCopy(async () => {
      const result = await getRealtimeSecretAction(projectId, branchId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.pending) {
        toast.error("Rotating the secret. Copy secret will be available when it completes.");
        return;
      }
      await navigator.clipboard.writeText(result.secret);
      toast.success("Secret copied to clipboard");
    });
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <p className="max-w-none text-sm">{DESCRIPTION}</p>
      <div className="grid grid-cols-3 divide-x divide-panel-border rounded-[3px] border border-panel-border py-5">
        <GettingStarted text="Learn how Realtime works and how to set it up.">
          <Button nativeButton={false} render={<a href={DOCS_URL} target="_blank" rel="noreferrer" />}>
            Read the docs <ExternalLink className="size-3.5" />
          </Button>
        </GettingStarted>
        <GettingStarted text="Let your agents set up Realtime for your app.">
          <Button variant="outline" onClick={() => setPromptOpen(true)}>
            Get agent instructions
          </Button>
        </GettingStarted>
        <GettingStarted text="Fire up Realtime and run your first realtime queries.">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={QUICKSTART_URL} target="_blank" rel="noreferrer" />}
          >
            Quickstart <ExternalLink className="size-3.5" />
          </Button>
        </GettingStarted>
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Realtime SQL API endpoint URL</h2>
        <div className="flex items-center justify-between gap-3 rounded-[3px] border border-panel-border bg-muted px-3 py-2">
          <code className="truncate font-mono text-xs">{endpointUrl}</code>
          <CopyAction text={endpointUrl} label="Copy endpoint URL" iconOnly />
        </div>
      </div>
      <div className="space-y-3 border-panel-border border-t pt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={copySecret} disabled={copying || pending}>
            {copying ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
            Copy secret
          </Button>
          <Button variant="outline" onClick={() => setDialog("rotate")} disabled={pending}>
            <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
            Rotate secret
          </Button>
        </div>
        <p className="text-sm">
          {pending
            ? "Rotating the secret. Copy secret will be available when it completes."
            : "A branch-scoped secret, so any holder can mint a token for any database on that branch."}
        </p>
        <p className="text-sm">
          Use as value for <code className="rounded bg-muted px-1 font-mono text-xs">NEON_REALTIME_SECRET</code>
        </p>
      </div>
      <div className="space-y-2 border-panel-border border-t pt-6">
        <Button variant="outline" onClick={() => setDialog("disable")} disabled={pending}>
          Disable Realtime
        </Button>
        <p className="text-muted-foreground text-xs">
          Disconnects all Realtime clients on this branch and discards its shared secret.
        </p>
      </div>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Agent instructions</DialogTitle>
          </DialogHeader>
          <CodePanel
            tabs={[{ label: "", code: REALTIME_AGENT_PROMPT }]}
            copyLabel="Copy prompt"
            bodyClassName="max-h-[420px] whitespace-pre-wrap break-words font-mono"
          />
        </DialogContent>
      </Dialog>
      <ActionDialog
        open={dialog === "rotate"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Rotate secret?"
        confirmLabel="Rotate"
        destructive
        successMessage="Secret is being rotated"
        onConfirm={() => rotateRealtimeSecretAction(projectId, branchId)}
      >
        <Warning>
          The current secret stops working once the rotation completes. Update{" "}
          <code className="font-mono">NEON_REALTIME_SECRET</code> in your apps with the new secret.
        </Warning>
      </ActionDialog>
      <ActionDialog
        open={dialog === "disable"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Disable Realtime?"
        confirmLabel="Disable"
        destructive
        successMessage="Realtime is being disabled"
        onConfirm={() => disableRealtimeAction(projectId, branchId)}
      >
        <Warning>
          Connected clients will be disconnected and the shared secret will be
          discarded. Enabling Realtime again issues a new secret.
        </Warning>
      </ActionDialog>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-[3px] border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>{children}</p>
    </div>
  );
}

function GettingStarted({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 px-5">
      <p className="text-sm">{text}</p>
      <div>{children}</div>
    </div>
  );
}

/**
 * The Console's empty-state art: a browser card whose stock count follows
 * the `coffee_beans` row in a database table.
 */
function InventoryIllustration() {
  const [stock, setStock] = useState(50);
  useEffect(() => {
    const timer = window.setInterval(
      () => setStock((current) => (current <= 10 ? 50 : current - 1)),
      1200
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="grid w-full max-w-[600px] grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[6px] bg-muted px-6 py-5 text-left">
      <div>
        <div className="mb-2 text-[11px] text-muted-foreground">Browser</div>
        <div className="rounded-[6px] border border-panel-border bg-panel p-2">
          <div className="mb-2 h-4 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 rounded bg-muted" />
            <div className="rounded bg-muted p-2">
              <div className="font-mono font-semibold text-primary text-sm">{stock}</div>
              <div className="text-[10px] text-muted-foreground">In stock</div>
            </div>
            <div className="h-12 rounded bg-muted" />
            <div className="rounded bg-muted p-2 text-[11px]">Coffee beans</div>
          </div>
        </div>
      </div>
      <Zap className="size-4 text-primary" />
      <div>
        <div className="mb-2 text-[11px] text-muted-foreground">Neon database</div>
        <table className="w-full rounded-[6px] border border-panel-border bg-panel font-mono text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <td className="px-3 py-2">inventory_item</td>
              <td className="px-3 py-2">quant</td>
            </tr>
          </thead>
          <tbody>
            <tr className="border-panel-border border-t">
              <td className="px-3 py-2">coffee_beans</td>
              <td className="px-3 py-2 font-semibold text-primary">{stock}</td>
            </tr>
            <tr className="border-panel-border border-t">
              <td className="px-3 py-2">bananas</td>
              <td className="px-3 py-2">300</td>
            </tr>
            <tr className="border-panel-border border-t">
              <td className="px-3 py-2">apples</td>
              <td className="px-3 py-2">500</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
