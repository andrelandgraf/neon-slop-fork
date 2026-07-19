"use client";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { resetRolePasswordAction } from "@/app/actions";

type Props = {
  branchId: string;
  branchName: string;
  connectionOptions: ConnectionOption[];
  databaseName: string;
  projectId: string;
  roleName: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
};

type ConnectionOption = {
  id: string;
  label: string;
  pooledUri: string;
  type: string;
  unpooledUri: string;
};

type ConnectionType = "connection-string" | "node" | "prisma" | "psql";

export function ConnectButton({
  branchId,
  branchName,
  connectionOptions,
  databaseName,
  projectId,
  roleName,
  triggerLabel = "Connect",
  triggerVariant = "default",
}: Props) {
  const [endpointId, setEndpointId] = useState(connectionOptions[0]?.id ?? "");
  const [pooled, setPooled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionType, setConnectionType] =
    useState<ConnectionType>("connection-string");
  const [passwordOverride, setPasswordOverride] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPending, startResetTransition] = useTransition();

  const endpoint =
    connectionOptions.find((option) => option.id === endpointId) ??
    connectionOptions[0];
  const baseUri = endpoint
    ? pooled
      ? endpoint.pooledUri
      : endpoint.unpooledUri
    : "";
  const uri = passwordOverride ? replaceUriPassword(baseUri, passwordOverride) : baseUri;
  const display = showPassword ? uri : maskPassword(uri);
  const snippet = useMemo(
    () => connectionSnippet(connectionType, uri),
    [connectionType, uri]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked in non-secure contexts; ignore silently.
    }
  }

  function resetPassword() {
    setResetError(null);
    startResetTransition(async () => {
      try {
        const { password } = await resetRolePasswordAction(
          projectId,
          branchId,
          roleName
        );
        if (!password) {
          setResetError("Neon did not return a replacement password.");
          return;
        }
        setPasswordOverride(password);
        setShowPassword(true);
      } catch (error) {
        setResetError(
          error instanceof Error ? error.message : "Could not reset the password."
        );
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size="sm"
          className={
            triggerVariant === "default"
              ? "bg-foreground text-background hover:bg-foreground/90"
              : undefined
          }
        >
          <Plug className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect to your database</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <Field label="Branch">
            <ReadonlyPill>
              {branchName}
              <Badge variant="muted" className="ml-1">
                Default
              </Badge>
            </ReadonlyPill>
          </Field>
          <Field label="Compute">
            <select
              value={endpoint?.id ?? ""}
              onChange={(event) => {
                setEndpointId(event.target.value);
                setPasswordOverride(null);
              }}
              className="h-8 w-full rounded-md border bg-background px-2.5 text-xs"
              disabled={connectionOptions.length < 2}
            >
              {connectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.type === "read_write" ? " (read/write)" : " (read-only)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Database">
            <ReadonlyPill>{databaseName}</ReadonlyPill>
          </Field>
          <Field label="Role">
            <div className="flex items-center gap-2">
              <ReadonlyPill>{roleName}</ReadonlyPill>
              <button
                type="button"
                onClick={resetPassword}
                disabled={resetPending}
                className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {resetPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <KeyRound className="h-3 w-3" />
                )}
                Reset password
              </button>
            </div>
          </Field>
          <Field label="Connection type">
            <select
              value={connectionType}
              onChange={(event) => {
                const next = event.target.value;
                if (isConnectionType(next)) setConnectionType(next);
              }}
              className="h-8 w-full rounded-md border bg-background px-2.5 text-xs"
            >
              <option value="connection-string">Connection string</option>
              <option value="psql">psql</option>
              <option value="node">Node.js</option>
              <option value="prisma">Prisma</option>
            </select>
          </Field>
          <Field label="Connection pooling">
            <button
              type="button"
              onClick={() => setPooled((p) => !p)}
              className="flex items-center gap-2 text-xs"
              aria-pressed={pooled}
            >
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  pooled ? "bg-emerald-500" : "bg-muted border border-border"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    pooled ? "translate-x-[18px]" : "translate-x-[2px]"
                  )}
                />
              </span>
              <span className="text-muted-foreground">
                {pooled ? "Enabled" : "Disabled"}
              </span>
            </button>
          </Field>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {connectionType === "connection-string"
                ? "Connection string"
                : connectionType === "psql"
                  ? "psql command"
                  : connectionType === "node"
                    ? "Node.js"
                    : "Prisma"}
            </span>
            {resetError && <span className="text-destructive">{resetError}</span>}
          </div>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-[12px] leading-relaxed break-all">
            {connectionType === "connection-string" ? display : snippet}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide password
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Show password
                </>
              )}
            </button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy snippet
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ReadonlyPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs">
      {children}
    </div>
  );
}

function maskPassword(uri: string): string {
  return uri.replace(
    /^(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.*)$/,
    (_m, prefix: string, _pw: string, rest: string) =>
      `${prefix}${"*".repeat(16)}${rest}`
  );
}

function replaceUriPassword(uri: string, password: string): string {
  try {
    const parsed = new URL(uri);
    parsed.password = password;
    return parsed.toString();
  } catch {
    return uri;
  }
}

function connectionSnippet(type: ConnectionType, uri: string): string {
  switch (type) {
    case "psql":
      return `psql "${uri}"`;
    case "node":
      return `import { neon } from "@neondatabase/serverless";\n\nconst sql = neon(process.env.DATABASE_URL!);\nconst result = await sql\`SELECT 1\`;`;
    case "prisma":
      return `# .env\nDATABASE_URL="${uri}"\n\n# schema.prisma\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`;
    default:
      return uri;
  }
}

function isConnectionType(value: string): value is ConnectionType {
  return (
    value === "connection-string" ||
    value === "psql" ||
    value === "node" ||
    value === "prisma"
  );
}
