"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  Code2,
  Copy,
  DatabaseZap,
  TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectButton } from "./connect-button";

type Props = {
  branchId: string;
  branchName: string;
  connectionOptions: {
    id: string;
    label: string;
    pooledUri: string;
    type: string;
    unpooledUri: string;
  }[];
  databaseName: string;
  projectId: string;
  roleName: string;
};

/**
 * Mirrors the Console's first-project "Get connected" checklist. The only
 * stateful action (connection string) opens the real connection dialog; the
 * remaining cards point users at the supported CLI/editor/MCP setup paths.
 */
export function DashboardGetConnected({
  branchName,
  branchId,
  connectionOptions,
  databaseName,
  projectId,
  roleName,
}: Props) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <section className="mb-5 rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Get connected to your new database</h2>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ConnectCard
          branchName={branchName}
          branchId={branchId}
          connectionOptions={connectionOptions}
          databaseName={databaseName}
          projectId={projectId}
          roleName={roleName}
        />
        <NeonInitCard />
        <GuideCard
          icon={Code2}
          title="IDE extension"
          body="Set up your app with the Neon extension in VS Code or Cursor."
          href="https://neon.com/docs/guides/neon-vscode-extension"
        />
        <GuideCard
          icon={Bot}
          title="MCP server"
          body="Connect your AI tools to Neon’s MCP server."
          href="https://neon.com/docs/ai/neon-mcp-server"
        />
      </div>
    </section>
  );
}

function ConnectCard({
  branchName,
  branchId,
  connectionOptions,
  databaseName,
  projectId,
  roleName,
}: Props) {
  return (
    <div className="rounded-md border p-3">
      <DatabaseZap className="mb-3 h-4 w-4 text-primary" />
      <h3 className="text-sm font-medium">Connection string</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">
        Copy your project’s connection string and add it to your app config.
      </p>
      <div className="mt-3">
        <ConnectButton
          branchId={branchId}
          branchName={branchName}
          connectionOptions={connectionOptions}
          databaseName={databaseName}
          projectId={projectId}
          roleName={roleName}
          triggerLabel="Open connection"
          triggerVariant="outline"
        />
      </div>
    </div>
  );
}

function NeonInitCard() {
  const [copied, setCopied] = useState(false);
  const command = "npx neonctl@latest init";

  function copy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div className="rounded-md border p-3">
      <TerminalSquare className="mb-3 h-4 w-4 text-primary" />
      <h3 className="text-sm font-medium">Neon init</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">
        Set up your local development environment with a single command.
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-3" variant="outline" size="sm">
            View command
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get started with Neon + AI</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Initialize a local project, authenticate, and link it to Neon.
          </p>
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
            <code>{command}</code>
            <button
              type="button"
              onClick={copy}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Copy neon init command"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GuideCard({
  body,
  href,
  icon: Icon,
  title,
}: {
  body: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Button className="mt-3" variant="outline" size="sm" asChild>
        <a href={href} target="_blank" rel="noreferrer">
          Open guide
        </a>
      </Button>
    </div>
  );
}
