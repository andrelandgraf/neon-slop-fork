"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CodePanel, FooterAction } from "@/components/code-panel";
import { cn } from "@/lib/utils";
import {
  GATEWAY_LANGUAGES,
  GATEWAY_WORKFLOWS,
  gatewayEnv,
  gatewayNeonTs,
  workflowSnippet,
  type GatewayLanguage,
  type GatewayWorkflow,
} from "@/lib/service-snippets";
import { createCredentialAction } from "@/app/actions";

export interface WorkflowModels {
  openai: Partial<Record<GatewayWorkflow, string>>;
  google: Partial<Record<GatewayWorkflow, string>>;
}

export function GetStarted({
  projectId,
  branchId,
  baseUrl,
  models,
  catalogHref,
}: {
  projectId: string;
  branchId: string;
  baseUrl: string;
  models: WorkflowModels;
  catalogHref: string;
}) {
  const [token, setToken] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [workflow, setWorkflow] = useState<GatewayWorkflow>("chat");
  const [language, setLanguage] = useState<GatewayLanguage>("aisdk");
  const [provider, setProvider] = useState<"openai" | "google">("openai");

  const config = GATEWAY_WORKFLOWS.find((w) => w.value === workflow) ?? GATEWAY_WORKFLOWS[0];
  const languages = GATEWAY_LANGUAGES.filter((l) => config.languages.includes(l.key));
  const activeLanguage = config.languages.includes(language) ? language : config.languages[0];
  const providerHasModel = Boolean(models.google[workflow]);
  const activeProvider = provider === "google" && providerHasModel ? "google" : "openai";
  const model = models[activeProvider][workflow] ?? models.openai.chat ?? "";

  function generate() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("branchId", branchId);
    fd.set("name", `ai-gateway-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-utc`);
    fd.append("scopes", "ai_gateway:invoke");
    startTransition(async () => {
      const result = await createCredentialAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setToken(result.credential.api_token);
      toast.success("Credential created. Copy it now; the token is shown once.");
    });
  }

  return (
    <div className="mx-auto max-w-[760px] py-4">
      <div className="grid grid-cols-[240px_1fr] items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="space-y-1.5 rounded-[4px] border border-panel-border p-2">
            <div className="h-1.5 w-12 rounded bg-muted" />
            <div className="h-1.5 w-16 rounded bg-muted" />
          </div>
          <span className="grid size-10 place-items-center rounded-[4px] border border-primary/40 bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </span>
          <div className="space-y-2">
            {["OpenAI", "Anthropic", "Google"].map((p) => (
              <div key={p} className="rounded-[3px] border border-panel-border px-2 py-0.5 text-[10px]">
                {p}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-xl">All the top models from a single endpoint</h2>
          <p className="mt-1 text-sm">
            One OpenAI-compatible API works across every provider, so switching
            models never means rewriting your app. Start with a ready-to-run
            workflow, or browse the full catalog.
          </p>
          <Link href={catalogHref} className="mt-3 inline-flex items-center gap-1 font-semibold text-sm">
            Browse all models <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <ol className="mt-8 space-y-6 border-panel-border border-l pl-6">
        <li className="relative">
          <StepDot n={1} />
          <h3 className="font-semibold text-base">Connect your project</h3>
          <p className="mb-2 text-muted-foreground text-xs">
            Generate a credential and add it to your environment.
          </p>
          <CodePanel
            tabs={[
              { label: ".env", code: gatewayEnv(baseUrl, token) },
              { label: "neon.ts + cli", code: gatewayNeonTs() },
            ]}
            footer={
              <Button size="xs" onClick={generate} disabled={pending || token !== undefined}>
                {pending && <Loader2 className="size-3 animate-spin" />}
                {token ? "Credential generated" : "Generate credential"}
              </Button>
            }
          />
        </li>
        <li className="relative">
          <StepDot n={2} />
          <div className="mb-1 flex items-center gap-3">
            <h3 className="whitespace-nowrap font-semibold text-base">Try it out</h3>
            <NativeSelect
              value={workflow}
              onChange={(e) => {
                const next = GATEWAY_WORKFLOWS.find((w) => w.value === e.target.value);
                if (next) setWorkflow(next.value);
              }}
              aria-label="Choose a workflow"
              className="flex-1"
            >
              {GATEWAY_WORKFLOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          <p className="mb-2 text-muted-foreground text-xs">{config.description}</p>
          <div className="overflow-hidden rounded-[3px] border border-panel-border">
            <div className="flex gap-4 border-panel-border border-b px-3">
              {languages.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLanguage(l.key)}
                  className={cn(
                    "-mb-px border-b-2 py-2 font-semibold text-xs",
                    l.key === activeLanguage ? "border-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <CodePanel
              className="rounded-none border-0"
              tabs={[{ label: "", code: workflowSnippet(workflow, activeLanguage, baseUrl, model) }]}
              footer={
                <>
                  <FooterAction onClick={() => window.location.assign(catalogHref)}>View model details</FooterAction>
                  <div className="ml-auto flex rounded-[3px] border border-panel-border bg-panel p-0.5">
                    {(["openai", "google"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={p === "google" && !providerHasModel}
                        onClick={() => setProvider(p)}
                        className={cn(
                          "rounded-[2px] px-2.5 py-0.5 text-xs disabled:opacity-40",
                          activeProvider === p && "bg-muted font-semibold"
                        )}
                      >
                        {p === "openai" ? "OpenAI" : "Google"}
                      </button>
                    ))}
                  </div>
                </>
              }
            />
          </div>
        </li>
      </ol>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="absolute top-0.5 -left-[34px] grid size-5 place-items-center rounded-full border border-panel-border bg-panel text-[11px]">
      {n}
    </span>
  );
}
