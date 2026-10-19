import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { requireCapability } from "@/lib/capabilities";
import { loadGatewayModels, type GatewayModel } from "@/lib/ai-gateway/models";
import { neonRaw, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { GetStarted, type WorkflowModels } from "./get-started";
import { ModelCatalog } from "./model-catalog";

export const dynamic = "force-dynamic";

/** The newest model from a provider that fits a workflow, for the code examples. */
function newest(models: GatewayModel[], provider: string, fits: (m: GatewayModel) => boolean) {
  return models
    .filter((m) => m.provider === provider && fits(m))
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))[0]?.id;
}

export default async function AiGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; branchId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { view } = await searchParams;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "aiGateway");
  const [gateway, models, plan] = await Promise.all([
    neonSdk.aiGateway.get({ projectId, branchId }),
    loadGatewayModels(),
    neonRaw.getOrgPlan(),
  ]);
  const upgrade = plan === "free" ? <UpgradeNotice /> : null;
  const base = `/projects/${projectId}/branches/${branchId}/ai-gateway`;

  if (view === "get_started") {
    const chat = (m: GatewayModel) => m.output.includes("text");
    const workflowModels: WorkflowModels = {
      openai: {
        chat: newest(models, "openai", (m) => chat(m) && m.id.includes("mini")) ?? newest(models, "openai", chat),
        images: newest(models, "openai", (m) => m.capabilities.includes("Image generation")),
        search: newest(models, "openai", (m) => m.capabilities.includes("Web search")),
        embeddings: newest(models, "openai", (m) => m.capabilities.includes("Embeddings")) ??
          models.find((m) => m.capabilities.includes("Embeddings"))?.id,
      },
      google: {
        chat: newest(models, "google", (m) => chat(m) && m.family.startsWith("gemini")),
      },
    };
    return (
      <PageBody>
        {upgrade}
        <GetStarted
          projectId={projectId}
          branchId={branchId}
          baseUrl={gateway.base_url}
          models={workflowModels}
          catalogHref={base}
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="AI Gateway"
        project={project}
        branch={branch}
        description="One endpoint for every major model. Pick a workflow, choose a provider, and copy the code to start building."
        actions={
          <Button nativeButton={false} render={<Link href={`${base}?view=get_started`} />}>
            Get started
          </Button>
        }
      />
      {upgrade}
      <ModelCatalog models={models} />
    </PageBody>
  );
}

const UPGRADE_FEATURES = [
  "OpenAI-compatible endpoint — no SDK changes",
  "Per-branch credentials with granular scopes",
  "Usage analytics across every model and route",
];

/** The Console's notice for organizations on the Free plan, where requests return `paid_plan_required`. */
function UpgradeNotice() {
  return (
    <div className="mb-5 rounded-[3px] border border-panel-border px-5 py-4">
      <h2 className="font-semibold text-base">Upgrade to use AI Gateway</h2>
      <p className="mt-1 max-w-3xl text-sm">
        AI Gateway is available on paid plans. Route requests to Llama, Mistral,
        GPT, Claude, and Gemini through a single OpenAI-compatible endpoint with
        usage analytics and per-branch credentials. Usage will be billed at
        provider list prices with no Neon markup.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {UPGRADE_FEATURES.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground text-xs">
        This clone runs every project in one shared organization on the Free plan,
        so gateway requests are refused until that organization is upgraded.{" "}
        <a className="text-link" href="https://neon.com/docs/ai-gateway/overview" target="_blank" rel="noreferrer">
          Learn more about AI Gateway
        </a>
      </p>
    </div>
  );
}
