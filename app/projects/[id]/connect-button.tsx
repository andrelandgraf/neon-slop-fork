"use client";
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Plug } from "lucide-react";
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

type Props = {
  branchName: string;
  databaseName: string;
  roleName: string;
  pooledUri: string;
  unpooledUri: string;
};

export function ConnectButton({
  branchName,
  databaseName,
  roleName,
  pooledUri,
  unpooledUri,
}: Props) {
  const [pooled, setPooled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const uri = pooled ? pooledUri : unpooledUri;
  const display = showPassword ? uri : maskPassword(uri);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked in non-secure contexts; ignore silently.
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Plug className="h-3.5 w-3.5" />
          Connect
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
          <Field label="Database">
            <ReadonlyPill>{databaseName}</ReadonlyPill>
          </Field>
          <Field label="Role">
            <ReadonlyPill>{roleName}</ReadonlyPill>
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
          <div className="text-xs text-muted-foreground mb-1.5">
            Connection string
          </div>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-[12px] leading-relaxed break-all">
            {display}
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
                  Copy
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
