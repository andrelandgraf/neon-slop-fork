"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { CodePanel, CopyAction, FooterAction } from "@/components/code-panel";
import { cn } from "@/lib/utils";
import type { ProjectCapabilities } from "@/lib/capabilities";
import {
  CONNECT_LANGUAGES,
  renderSnippet,
  type ConnectionParts,
} from "@/lib/connect-snippets";
import {
  STORAGE_CLIENTS,
  STORAGE_CODE,
  STORAGE_INSTALL,
  gatewayEnv,
  gatewayNeonTs,
  storageEnv,
  type StorageClient,
} from "@/lib/service-snippets";
import {
  getConnectionPartsAction,
  loadConnectDetailsAction,
  type ConnectDetails,
} from "@/lib/connect/actions";
import { createCredentialAction, resetRolePasswordAction } from "@/app/actions";

type Tab = "postgres" | "storage" | "aiGateway" | "dataApi" | "auth";

export function ConnectDialog({
  projectId,
  branchId,
  capabilities,
  variant = "sidebar",
}: {
  projectId: string;
  branchId: string;
  capabilities: ProjectCapabilities;
  variant?: "sidebar" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<ConnectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [tab, setTab] = useState<Tab>("postgres");

  function handleOpen(next: boolean) {
    setOpen(next);
    if (!next) return;
    setError(null);
    startLoading(async () => {
      try {
        setDetails(await loadConnectDetailsAction(projectId, branchId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load connection details.");
      }
    });
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "postgres", label: "Postgres database" },
    ...(capabilities.storage ? [{ value: "storage" as const, label: "Storage" }] : []),
    ...(capabilities.aiGateway
      ? [{ value: "aiGateway" as const, label: "AI Gateway" }]
      : []),
    { value: "dataApi", label: "Data API" },
    { value: "auth", label: "Auth" },
  ];

  return (
    <>
      {variant === "button" ? (
        <Button onClick={() => handleOpen(true)}>Connect</Button>
      ) : (
        <ConnectTrigger onClick={() => handleOpen(true)} />
      )}
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-panel-border border-b px-6 py-4">
            <DialogTitle>Connect to your branch</DialogTitle>
          </DialogHeader>
          <div className="px-6 pt-4 pb-6">
            <div className="text-muted-foreground text-xs">Branch</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm">
              {details?.branchName ?? "…"}
              {details?.isDefault && <Badge variant="secondary">Default</Badge>}
            </div>
            <div className="mt-4 flex gap-5 border-panel-border border-b">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "-mb-px border-b-2 pb-2 text-sm transition-colors",
                    tab === t.value
                      ? "border-foreground font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="pt-4">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : loading || !details ? (
                <div className="flex items-center gap-2 py-10 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading connection details…
                </div>
              ) : tab === "postgres" ? (
                <PostgresTab projectId={projectId} branchId={branchId} details={details} />
              ) : tab === "storage" ? (
                <StorageTab projectId={projectId} branchId={branchId} details={details} />
              ) : tab === "aiGateway" ? (
                <AiGatewayTab projectId={projectId} branchId={branchId} details={details} />
              ) : tab === "dataApi" ? (
                <DataApiTab projectId={projectId} branchId={branchId} details={details} />
              ) : (
                <AuthTab projectId={projectId} branchId={branchId} details={details} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConnectTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="brand" className="mt-2 h-8 w-full" onClick={onClick}>
      <Plug className="size-3.5" />
      Connect
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </label>
  );
}

export function PostgresTab({
  projectId,
  branchId,
  details,
}: {
  projectId: string;
  branchId: string;
  details: ConnectDetails;
}) {
  const [endpointId, setEndpointId] = useState(details.endpoints[0]?.id ?? "");
  const [database, setDatabase] = useState(details.databases[0]?.name ?? "");
  const [role, setRole] = useState(
    details.databases[0]?.owner ?? details.roles[0] ?? ""
  );
  const [language, setLanguage] = useState("nodejs");
  const [pooled, setPooled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [parts, setParts] = useState<ConnectionParts | null>(null);
  const [pending, startTransition] = useTransition();

  // The URI is fetched from the Neon API for each compute/database/role
  // combination, so this effect syncs component state with that service.
  useEffect(() => {
    if (!endpointId || !database || !role) return;
    let cancelled = false;
    setParts(null);
    getConnectionPartsAction(projectId, branchId, endpointId, database, role).then(
      (next) => {
        if (!cancelled) setParts(next);
      },
      (err: unknown) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Could not load the connection string."
          );
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, branchId, endpointId, database, role]);

  function resetPassword() {
    startTransition(async () => {
      try {
        const { password } = await resetRolePasswordAction(projectId, branchId, role);
        if (!password) throw new Error("Neon did not return a new password.");
        setParts((current) => (current ? { ...current, password } : current));
        setShowPassword(true);
        toast.success(`Password for ${role} was reset`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not reset the password.");
      }
    });
  }

  if (details.endpoints.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This branch has no compute.{" "}
        <Link className="text-link" href={`/projects/${projectId}/branches/${branchId}/computes`}>
          Add a compute
        </Link>{" "}
        to connect.
      </p>
    );
  }

  const lang = CONNECT_LANGUAGES.find((l) => l.value === language) ?? CONNECT_LANGUAGES[0];
  const masked = parts ? { ...parts, password: null } : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Field label="Compute">
          <NativeSelect value={endpointId} onChange={(e) => setEndpointId(e.target.value)}>
            {details.endpoints.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} · {e.state === "active" ? "Active" : "Idle"}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Database">
          <NativeSelect value={database} onChange={(e) => setDatabase(e.target.value)}>
            {details.databases.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Role">
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)}>
            {details.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <NativeSelect
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-56"
        >
          {CONNECT_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={resetPassword}
            disabled={pending}
            className="flex items-center gap-1 text-link text-xs hover:underline disabled:opacity-50"
          >
            <KeyRound className="size-3" />
            Reset password
          </button>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={pooled} onCheckedChange={setPooled} />
            Connection pooling
          </label>
        </div>
      </div>
      {parts && masked ? (
        <CodePanel
          key={language}
          tabs={lang.tabs.map((t) => {
            const code = renderSnippet(t.template, parts, pooled);
            return {
              label: t.label,
              code,
              display:
                t.hasSecrets && !showPassword
                  ? renderSnippet(t.template, masked, pooled)
                  : code,
            };
          })}
          footer={
            <FooterAction onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPassword ? "Hide password" : "Show password"}
            </FooterAction>
          }
        />
      ) : (
        <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading connection string…
        </div>
      )}
    </div>
  );
}

interface GeneratedCredential {
  accessKeyId: string;
  secret: string;
  token: string;
}

function useCredential(
  projectId: string,
  branchId: string,
  scopes: string[],
  kind: string
) {
  const [credential, setCredential] = useState<GeneratedCredential | null>(null);
  const [pending, startTransition] = useTransition();
  function generate() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("branchId", branchId);
    formData.set(
      "name",
      `connect-${kind}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-utc`
    );
    for (const scope of scopes) formData.append("scopes", scope);
    startTransition(async () => {
      const result = await createCredentialAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCredential({
        accessKeyId: result.credential.token_id,
        secret: result.credential.s3_secret_access_key,
        token: result.credential.api_token,
      });
      toast.success("Credential created. Copy it now; the secret is shown once.");
    });
  }
  return { credential, pending, generate };
}

function GenerateAction({
  pending,
  done,
  onClick,
}: {
  pending: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <FooterAction onClick={onClick} disabled={pending || done}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
      {done ? "Credential generated" : "Generate credential"}
    </FooterAction>
  );
}

function StorageTab({
  projectId,
  branchId,
  details,
}: {
  projectId: string;
  branchId: string;
  details: ConnectDetails;
}) {
  const [client, setClient] = useState<StorageClient>("s3");
  const { credential, pending, generate } = useCredential(
    projectId,
    branchId,
    ["storage:read", "storage:write"],
    "storage-read-write"
  );
  if (!details.storage) {
    return (
      <p className="text-muted-foreground text-sm">
        Object storage isn't enabled on this branch.
      </p>
    );
  }
  const env = storageEnv(
    details.storage.endpoint,
    details.storage.region,
    credential?.accessKeyId,
    credential?.secret
  );
  const option = STORAGE_CLIENTS.find((c) => c.value === client) ?? STORAGE_CLIENTS[0];
  const generateAction = (
    <GenerateAction pending={pending} done={credential !== null} onClick={generate} />
  );
  return (
    <div className="space-y-3">
      <NativeSelect
        value={client}
        onChange={(e) => {
          const next = STORAGE_CLIENTS.find((c) => c.value === e.target.value);
          if (next) setClient(next.value);
        }}
        className="w-48"
      >
        {STORAGE_CLIENTS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
      {option.value === "env" ? (
        <CodePanel tabs={[{ label: ".env", code: env }]} footer={generateAction} />
      ) : (
        <>
          <CodePanel
            tabs={[{ label: "", code: STORAGE_INSTALL[option.value] }]}
            copyLabel="Copy install command"
          />
          <CodePanel
            key={option.value}
            tabs={[
              { label: option.file, code: STORAGE_CODE[option.value] },
              { label: ".env", code: env },
            ]}
            footer={generateAction}
          />
        </>
      )}
    </div>
  );
}

function AiGatewayTab({
  projectId,
  branchId,
  details,
}: {
  projectId: string;
  branchId: string;
  details: ConnectDetails;
}) {
  const { credential, pending, generate } = useCredential(
    projectId,
    branchId,
    ["ai_gateway:invoke"],
    "ai-gateway"
  );
  if (!details.aiGateway) {
    return (
      <p className="text-muted-foreground text-sm">
        The AI Gateway isn't enabled on this branch.
      </p>
    );
  }
  return (
    <CodePanel
      tabs={[
        { label: ".env", code: gatewayEnv(details.aiGateway.baseUrl, credential?.token) },
        { label: "neon.ts + cli", code: gatewayNeonTs() },
      ]}
      footer={
        <GenerateAction pending={pending} done={credential !== null} onClick={generate} />
      }
    />
  );
}

function DataApiTab({
  projectId,
  branchId,
  details,
}: {
  projectId: string;
  branchId: string;
  details: ConnectDetails;
}) {
  if (!details.dataApi) {
    return (
      <p className="text-muted-foreground text-sm">
        The Data API is not enabled on this branch.{" "}
        <Link
          className="text-link"
          href={`/projects/${projectId}/branches/${branchId}/data-api`}
        >
          Enable Data API
        </Link>
      </p>
    );
  }
  return (
    <CodePanel
      tabs={[{ label: ".env", code: `NEON_DATA_API_URL="${details.dataApi.url}"` }]}
    />
  );
}

function AuthTab({
  projectId,
  branchId,
  details,
}: {
  projectId: string;
  branchId: string;
  details: ConnectDetails;
}) {
  if (!details.auth) {
    return (
      <p className="text-muted-foreground text-sm">
        Better Auth is not enabled on this branch.{" "}
        <Link className="text-link" href={`/projects/${projectId}/branches/${branchId}/auth`}>
          Enable Neon Auth
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <UrlRow label="Auth URL" value={details.auth.baseUrl} />
      <UrlRow label="JWKS URL" value={details.auth.jwksUrl} />
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-muted-foreground text-xs">{label}</div>
      <div className="flex items-center justify-between gap-3 rounded-[3px] border border-panel-border bg-muted px-3 py-2">
        <code className="truncate font-mono text-xs">{value}</code>
        <CopyAction text={value} label={`Copy ${label}`} iconOnly />
      </div>
    </div>
  );
}
