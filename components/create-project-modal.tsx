"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  CirclePlus,
  Database,
  Eye,
  EyeOff,
  FileText,
  Folder,
  Loader2,
  Lock,
  Sparkles,
  SquareFunction,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { CopyAction, FooterAction } from "@/components/code-panel";
import { CliAccessCallout } from "@/components/claim-link-button";
import { RegionGlobe } from "@/components/neon-ui/region-globe";
import type { ServerRegion } from "@/components/neon-ui/region-select";
import { cn } from "@/lib/utils";
import { agentPrompt, envFile, type ServiceId } from "@/lib/onboarding";
import { PASSWORD_MASK } from "@/lib/connect-snippets";
import { createProjectWithServicesAction, type CreatedProject } from "@/lib/projects/create";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useIdentity } from "@/components/live/live-root";
import type { useProjectCreations } from "@/lib/live/hooks";
import { leavePage } from "@/lib/live/renew";
import { getRealtimeSecretAction } from "@/lib/realtime/actions";
import { createCredentialAction } from "@/app/actions";

const KEY_PLACEHOLDER = "<generate-key>";
const CREDENTIAL_PLACEHOLDER = "<generate-credential>";

type Toggle = "storage" | "functions" | "aiGateway" | "realtime" | "auth";

const SERVICES: { key: Toggle; label: string; description: string; icon: LucideIcon; backend: boolean }[] = [
  { key: "storage", label: "Object storage", description: "Buckets for files and media.", icon: Folder, backend: true },
  { key: "functions", label: "Functions", description: "Serverless functions next to your data.", icon: SquareFunction, backend: true },
  { key: "aiGateway", label: "AI gateway", description: "One endpoint for many AI models.", icon: Sparkles, backend: true },
  { key: "realtime", label: "Realtime", description: "Live query results that update as your data changes.", icon: Zap, backend: true },
  { key: "auth", label: "Neon Auth", description: "Ready-to-use authentication for your app.", icon: UserRoundCheck, backend: false },
];

type CreationsCollection = ReturnType<typeof useProjectCreations>;

export function CreateProjectModal({
  open,
  onOpenChange,
  creations,
  regions,
  defaultRegionId,
  pgVersions,
  backendRegions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creations: CreationsCollection;
  regions: ServerRegion[];
  defaultRegionId: string;
  pgVersions: readonly number[];
  backendRegions: string[];
}) {
  const [created, setCreated] = useState<{ project: CreatedProject; services: Toggle[] } | null>(null);
  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setCreated(null);
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-[940px] gap-0 p-0">
        <div className="flex items-center justify-between border-panel-border border-b px-6 py-4">
          <DialogTitle className="font-semibold text-lg">Create project</DialogTitle>
        </div>
        {created ? (
          <SetupStep created={created.project} services={created.services} onClose={() => handleOpenChange(false)} />
        ) : (
          <FormStep
            creations={creations}
            regions={regions}
            defaultRegionId={defaultRegionId}
            pgVersions={pgVersions}
            backendRegions={backendRegions}
            onCreated={(project, services) => setCreated({ project, services })}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepBars({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex gap-1">
      <span className="h-1 w-8 rounded-full bg-foreground" />
      <span className={cn("h-1 w-8 rounded-full", step === 2 ? "bg-foreground" : "bg-muted")} />
    </div>
  );
}

function FormStep({
  creations,
  regions,
  defaultRegionId,
  pgVersions,
  backendRegions,
  onCreated,
  onClose,
}: {
  creations: CreationsCollection;
  regions: ServerRegion[];
  defaultRegionId: string;
  pgVersions: readonly number[];
  backendRegions: string[];
  onCreated: (project: CreatedProject, services: Toggle[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [regionId, setRegionId] = useState(defaultRegionId);
  const [pgVersion, setPgVersion] = useState(pgVersions[0] ?? 18);
  const [databaseName, setDatabaseName] = useState("");
  const [buckets, setBuckets] = useState([{ name: "", public: false }]);
  const [enabled, setEnabled] = useState<Record<Toggle, boolean>>({
    storage: true,
    functions: true,
    aiGateway: true,
    realtime: true,
    auth: true,
  });
  const [expanded, setExpanded] = useState<"postgres" | "storage" | null>("postgres");
  const [pending, startTransition] = useTransition();
  const identity = useIdentity();
  const [creationId, setCreationId] = useState<string | null>(null);
  const { data: creation } = useLiveQuery({
    query: (q) => (creationId ? q.from({ c: creations }).where(({ c }) => eq(c.id, creationId)) : undefined),
  });
  const step = creation?.[0]?.status;
  const backend = backendRegions.includes(regionId);
  const available = (key: Toggle) => !SERVICES.find((s) => s.key === key)?.backend || backend;
  const on = (key: Toggle) => enabled[key] && available(key);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const id = crypto.randomUUID();
    setCreationId(id);
    startTransition(async () => {
      const result = await createProjectWithServicesAction({
        id,
        identity,
        name,
        regionId,
        pgVersion,
        databaseName: databaseName || "neondb",
        buckets: on("storage")
          ? buckets.map((b) => ({ ...b, name: b.name.trim() || "uploads" })).filter((b, i, all) => all.findIndex((x) => x.name === b.name) === i)
          : [],
        storage: on("storage"),
        functions: on("functions"),
        aiGateway: on("aiGateway"),
        realtime: on("realtime"),
        auth: on("auth"),
      });
      if (!result.ok) {
        if (result.status === 401) leavePage();
        toast.error(result.error);
        return;
      }
      onCreated(result.project, SERVICES.map((s) => s.key).filter(on));
    });
  }

  const regionLabel = (r: ServerRegion) => (r.provider ? `${r.provider} ${r.name}` : r.name);

  return (
    <form onSubmit={submit}>
      <div className="grid max-h-[calc(100dvh-12rem)] grid-cols-[400px_1fr] overflow-y-auto">
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={64} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-region">Region</Label>
            <NativeSelect id="project-region" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {regionLabel(r)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Services</Label>
            <div className="divide-y divide-panel-border rounded-[3px] border border-panel-border">
              <ServiceRow
                icon={Database}
                label="Postgres database"
                description="Serverless Postgres with branching."
                expanded={expanded === "postgres"}
                onExpand={() => setExpanded(expanded === "postgres" ? null : "postgres")}
                control={<Switch checked disabled aria-label="Postgres database" />}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="db-name">Database name</Label>
                    <Input id="db-name" value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} placeholder="neondb" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pg-version">Postgres version</Label>
                    <NativeSelect id="pg-version" value={pgVersion} onChange={(e) => setPgVersion(Number(e.target.value))}>
                      {pgVersions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </ServiceRow>
              {SERVICES.map((service) => (
                <ServiceRow
                  key={service.key}
                  icon={service.icon}
                  label={service.label}
                  description={available(service.key) ? service.description : "Not available in this region."}
                  expanded={service.key === "storage" && expanded === "storage" && on("storage")}
                  onExpand={
                    service.key === "storage" && on("storage")
                      ? () => setExpanded(expanded === "storage" ? null : "storage")
                      : undefined
                  }
                  control={
                    <Switch
                      checked={on(service.key)}
                      disabled={!available(service.key)}
                      onCheckedChange={(checked) => setEnabled({ ...enabled, [service.key]: checked })}
                      aria-label={service.label}
                    />
                  }
                >
                  {service.key === "storage" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_140px_24px] gap-2 text-sm font-semibold">
                        <span>Bucket name</span>
                        <span>Visibility</span>
                      </div>
                      {buckets.map((bucket, i) => (
                        <div key={i} className="grid grid-cols-[1fr_140px_24px] items-center gap-2">
                          <Input
                            value={bucket.name}
                            placeholder="uploads"
                            aria-label="Bucket name"
                            onChange={(e) => setBuckets(buckets.map((b, j) => (j === i ? { ...b, name: e.target.value } : b)))}
                          />
                          <NativeSelect
                            value={bucket.public ? "public" : "private"}
                            aria-label="Visibility"
                            onChange={(e) =>
                              setBuckets(buckets.map((b, j) => (j === i ? { ...b, public: e.target.value === "public" } : b)))
                            }
                          >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                          </NativeSelect>
                          <button
                            type="button"
                            aria-label="Remove bucket"
                            onClick={() => setBuckets(buckets.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBuckets([...buckets, { name: "", public: false }])}
                        className="flex items-center gap-1 font-semibold text-link text-sm"
                      >
                        Add bucket <CirclePlus className="size-3.5" />
                      </button>
                    </div>
                  )}
                </ServiceRow>
              ))}
            </div>
          </div>
        </div>
        <div className="relative min-h-[480px] bg-panel">
          <RegionGlobe
            regions={regions}
            value={regionId}
            onValueChange={setRegionId}
            variant="dots"
            className="absolute inset-0"
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-panel-border border-t px-6 py-4">
        <StepBars step={1} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          {pending && (
            <span role="status" className="self-center text-muted-foreground text-sm">
              {step === "configuring" ? "Setting up services" : "Creating project"}
            </span>
          )}
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Create project
          </Button>
        </div>
      </div>
    </form>
  );
}

function ServiceRow({
  icon: Icon,
  label,
  description,
  control,
  expanded,
  onExpand,
  children,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  control: React.ReactNode;
  expanded: boolean;
  onExpand?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-sm">{label}</div>
          <div className="text-muted-foreground text-xs">{description}</div>
        </div>
        {onExpand && (
          <button type="button" aria-label={`${label} settings`} onClick={onExpand} className="text-muted-foreground">
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
        {control}
      </div>
      {expanded && children && <div className="mt-3">{children}</div>}
    </div>
  );
}

const SERVICE_IDS: Record<Toggle, ServiceId> = {
  storage: "object-storage",
  functions: "functions",
  aiGateway: "ai-gateway",
  realtime: "realtime",
  auth: "auth",
};

function SetupStep({
  created,
  services,
  onClose,
}: {
  created: CreatedProject;
  services: Toggle[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<"agent" | "env">("agent");
  const [reveal, setReveal] = useState(false);
  const [keys, setKeys] = useState<{ accessKeyId?: string; secret?: string; token?: string; realtimeSecret?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const prompt = agentPrompt({
    projectId: created.projectId,
    branchName: created.branchName,
    services: ["postgres", ...services.map((s) => SERVICE_IDS[s])],
  });
  const mask = (uri: string) => uri.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/, `$1${PASSWORD_MASK}@`);
  const env = (masked: boolean) =>
    envFile({
      databaseUrl: masked ? mask(created.databaseUrl) : created.databaseUrl,
      pooledDatabaseUrl: masked ? mask(created.pooledDatabaseUrl) : created.pooledDatabaseUrl,
      auth: created.authBaseUrl ? { baseUrl: created.authBaseUrl } : undefined,
      storage: created.storage
        ? {
            endpoint: created.storage.endpoint,
            region: created.storage.region,
            bucket: created.storage.bucket,
            accessKeyId: keys?.accessKeyId ?? KEY_PLACEHOLDER,
            secretAccessKey: keys?.secret ? (masked ? PASSWORD_MASK : keys.secret) : KEY_PLACEHOLDER,
          }
        : undefined,
      functions: services.includes("functions"),
      aiGateway: created.aiGatewayBaseUrl
        ? {
            baseUrl: created.aiGatewayBaseUrl,
            token: keys?.token ? (masked ? PASSWORD_MASK : keys.token) : CREDENTIAL_PLACEHOLDER,
          }
        : undefined,
      realtime: created.realtimeUrl
        ? {
            url: created.realtimeUrl,
            secret: keys?.realtimeSecret ? (masked ? PASSWORD_MASK : keys.realtimeSecret) : KEY_PLACEHOLDER,
          }
        : undefined,
    });

  function generateKeys() {
    startTransition(async () => {
      const next: NonNullable<typeof keys> = {};
      const scopes = [
        ...(created.storage ? ["storage:read", "storage:write"] : []),
        ...(created.aiGatewayBaseUrl ? ["ai_gateway:invoke"] : []),
      ];
      if (scopes.length > 0) {
        const fd = new FormData();
        fd.set("projectId", created.projectId);
        fd.set("branchId", created.branchId);
        fd.set("name", `onboarding-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-utc`);
        for (const scope of scopes) fd.append("scopes", scope);
        const result = await createCredentialAction(fd);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        next.accessKeyId = result.credential.token_id;
        next.secret = result.credential.s3_secret_access_key;
        next.token = result.credential.api_token;
      }
      if (created.realtimeUrl) {
        const secret = await getRealtimeSecretAction(created.projectId, created.branchId);
        if (!secret.ok) {
          toast.error(secret.error);
          return;
        }
        next.realtimeSecret = secret.secret;
      }
      setKeys(next);
      toast.success("Keys generated. Copy them now; secrets are shown once.");
    });
  }

  return (
    <>
      <div className="max-h-[calc(100dvh-12rem)] space-y-6 overflow-y-auto px-6 py-6">
        <div>
          <h2 className="font-semibold text-xl">
            Your new project was created in{" "}
            <span className="rounded bg-primary/15 px-1 text-primary">{created.elapsedMs} ms</span>
          </h2>
          <p className="text-muted-foreground text-xs">If you blinked, you probably missed it.</p>
        </div>
        {created.failures.length > 0 && (
          <div className="flex gap-2 rounded-[3px] border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              Some services didn&apos;t finish setting up. You can enable them from the project:
              <ul className="mt-1 list-disc pl-4">
                {created.failures.map((f) => (
                  <li key={f.service}>
                    <strong>{f.service}</strong>: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {view === "agent" ? (
          <div className="max-w-[640px] space-y-3">
            <div>
              <h3 className="font-semibold text-base">Set up Neon with your coding agent</h3>
              <p className="text-muted-foreground text-xs">Paste the following prompt into your agent chat to connect your app.</p>
            </div>
            <CliAccessCallout projectId={created.projectId} />
            <div className="overflow-hidden rounded-[3px] border border-panel-border">
              <div className="flex items-center gap-2 border-panel-border border-b bg-muted px-3 py-2 text-xs">
                <Bot className="size-3.5" /> Agent prompt
              </div>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap bg-muted px-3 py-2 font-mono text-[12px] leading-relaxed">
                {prompt}
              </pre>
              <div className="flex justify-end border-panel-border border-t bg-muted px-3 py-1.5">
                <CopyAction text={prompt} label="Copy prompt" />
              </div>
            </div>
            <button type="button" onClick={() => setView("env")} className="flex items-center gap-1 font-semibold text-sm underline">
              Prefer to wire it up yourself? <ArrowRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="max-w-[640px] space-y-3">
            <div>
              <h3 className="font-semibold text-base">Add your environment variables</h3>
              <p className="text-muted-foreground text-xs">
                Copy these into your app&apos;s .env file — they cover every service you selected.
              </p>
            </div>
            <div className="overflow-hidden rounded-[3px] border border-panel-border">
              <div className="flex items-center gap-2 border-panel-border border-b bg-muted px-3 py-2 text-xs">
                <FileText className="size-3.5" /> Env file
              </div>
              <div className="flex items-center gap-2 border-panel-border border-b bg-muted px-3 py-2 text-xs">
                <Lock className="size-3.5" />
                <span className="flex-1">Access keys are minted on demand. Generate keys to fill in the placeholders.</span>
                <Button variant="outline" size="sm" onClick={generateKeys} disabled={pending || keys !== null}>
                  {pending && <Loader2 className="size-3 animate-spin" />}
                  {keys ? "Keys generated" : "Generate keys"}
                </Button>
              </div>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap break-all bg-muted px-3 py-2 font-mono text-[12px] leading-relaxed">
                {env(!reveal)}
              </pre>
              <div className="flex justify-between border-panel-border border-t bg-muted px-3 py-1.5">
                <FooterAction onClick={() => setReveal(!reveal)}>
                  {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {reveal ? "Hide credentials" : "Show credentials"}
                </FooterAction>
                <CopyAction text={env(false)} label="Copy .env" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setView("agent")} className="flex items-center gap-1 font-semibold text-sm underline">
                <ArrowLeft className="size-3.5" /> Prefer to use your coding agent?
              </button>
              <Badge variant="secondary">Recommended</Badge>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-panel-border border-t px-6 py-4">
        <StepBars step={2} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => router.push(`/projects/${created.projectId}/branches/${created.branchId}`)}>
            Go to project
          </Button>
        </div>
      </div>
    </>
  );
}
