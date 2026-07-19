"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, AlertTriangle, Check, Copy, Download } from "lucide-react";
import type { CreateCredentialResponse } from "@/lib/neon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createCredentialAction } from "@/app/actions";

const STORAGE_SCOPES = [
  { id: "storage:read", label: "storage:read", desc: "Read and download objects" },
  { id: "storage:write", label: "storage:write", desc: "Upload and delete objects" },
] as const;
const AI_SCOPES = [
  { id: "ai_gateway:invoke", label: "ai_gateway:invoke", desc: "Invoke AI models" },
] as const;

function buildEnv(
  cred: CreateCredentialResponse,
  s3Endpoint: string,
  region: string
): string {
  const lines: string[] = [];
  const hasStorage = cred.scopes.some((s) => s.startsWith("storage:"));
  const hasAi = cred.scopes.includes("ai_gateway:invoke");
  if (hasStorage) {
    lines.push(
      "# S3 storage",
      `AWS_ENDPOINT_URL_S3=${s3Endpoint || "https://<branch>.storage.<region>.aws.neon.tech"}`,
      `AWS_ACCESS_KEY_ID=${cred.token_id}`,
      `AWS_SECRET_ACCESS_KEY=${cred.s3_secret_access_key}`,
      `AWS_REGION=${region}`
    );
  }
  if (hasAi) {
    if (lines.length) lines.push("");
    lines.push("# AI Gateway", `NEON_AI_GATEWAY_API_KEY=${cred.api_token}`);
  }
  return lines.join("\n");
}

export function CreateCredentialDialog({
  projectId,
  branchId,
  s3Endpoint,
  region,
}: {
  projectId: string;
  branchId: string;
  s3Endpoint: string;
  region: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateCredentialResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setScopes(new Set());
    setError(null);
    setCreated(null);
    setConfirmed(false);
    setCopied(false);
  }

  function toggleScope(id: string) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const envText = created ? buildEnv(created, s3Endpoint, region) : "";

  function copyEnv() {
    navigator.clipboard.writeText(envText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  function downloadEnv() {
    const blob = new Blob([envText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          // If the secret was just revealed, refresh the list on close.
          if (created) router.refresh();
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-3.5 w-3.5" />
          Create credential
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>Create credential</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData: FormData) => {
                for (const s of scopes) formData.append("scopes", s);
                const result = await createCredentialAction(formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setCreated(result.credential);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="branchId" value={branchId} />

              <div className="space-y-1.5">
                <Label htmlFor="cred-name">Name</Label>
                <Input
                  id="cred-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="storage-read-write"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Scopes</div>
                <ScopeGroup
                  title="Storage"
                  hint="Access objects in this branch’s buckets."
                  scopes={STORAGE_SCOPES}
                  selected={scopes}
                  onToggle={toggleScope}
                />
                <ScopeGroup
                  title="AI Gateway"
                  hint="Call AI models through the gateway."
                  scopes={AI_SCOPES}
                  selected={scopes}
                  onToggle={toggleScope}
                />
              </div>

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
                <SubmitButton
                  disabled={!name.trim() || scopes.size === 0}
                  pendingLabel="Creating…"
                >
                  Create credential
                </SubmitButton>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Credential created</DialogTitle>
            </DialogHeader>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                Copy these now. For your security, the S3 secret access key is
                shown <strong>only once</strong> and cannot be retrieved again.
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 overflow-hidden">
              <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed">
                <code>{envText}</code>
              </pre>
              <div className="flex justify-end border-t bg-background/60 px-2 py-1">
                <button
                  type="button"
                  onClick={copyEnv}
                  className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy snippet
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={downloadEnv}>
                <Download className="h-3.5 w-3.5" />
                Download .env
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-3.5 w-3.5 accent-[color:hsl(var(--primary))]"
              />
              I have copied the S3 access key ID and S3 secret access key
            </label>

            <DialogFooter>
              <Button
                type="button"
                disabled={!confirmed}
                onClick={() => {
                  setOpen(false);
                  router.refresh();
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScopeGroup({
  title,
  hint,
  scopes,
  selected,
  onToggle,
}: {
  title: string;
  hint: string;
  scopes: readonly { id: string; label: string; desc: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-xs font-medium">{title}</div>
      <p className="text-[11px] text-muted-foreground mb-1.5">{hint}</p>
      <div className="space-y-1.5">
        {scopes.map((s) => (
          <label key={s.id} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => onToggle(s.id)}
              className="mt-0.5 h-3.5 w-3.5 accent-[color:hsl(var(--primary))]"
            />
            <span className="text-sm">
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {s.label}
              </code>{" "}
              <span className="text-muted-foreground">{s.desc}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
