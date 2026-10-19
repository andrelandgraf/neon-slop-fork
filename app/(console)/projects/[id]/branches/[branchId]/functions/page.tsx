import { Database, ExternalLink, Folder, SquareFunction } from "lucide-react";
import { CodePanel } from "@/components/code-panel";
import { CliAccessCallout } from "@/components/claim-link-button";
import { PageBody, PageHeader } from "@/components/page-header";
import { requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { FunctionCard, type FunctionSummary } from "./function-card";

export const dynamic = "force-dynamic";

const HELLO_TS = `// hello.ts
export default {
  fetch: (request: Request) => new Response('Hello world'),
};`;
const DOCS_URL = "https://neon.com/docs/compute/functions/overview";

export default async function FunctionsPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "functions");

  const [functions, triggers, domains] = await Promise.all([
    neonSdk.functions.list({ projectId, branchId }).all(),
    neonSdk.triggers.list({ projectId, branchId }),
    neonSdk.functions.customDomains.list({ projectId, branchId }).all(),
  ]);
  const linkCommand = `neon link --project-id ${projectId} --branch-id ${branchId}`;

  if (functions.length === 0) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-10">
        <FunctionDiagram />
        <h1 className="mt-8 text-center font-semibold text-2xl">
          Deploy functions next to your database
        </h1>
        <p className="mt-2 text-center text-muted-foreground text-sm">
          A function is long-running compute built to keep agents and background
          jobs running without timing out. It automatically gets the env vars to
          connect to Postgres and other Neon services on the same branch.
        </p>
        <div className="mt-6">
          <CliAccessCallout projectId={projectId} />
        </div>
        <ol className="mt-6 space-y-5">
          <Step n={1} title="Create hello.ts">
            <CodePanel tabs={[{ label: "", code: HELLO_TS }]} copyLabel="Copy hello.ts" />
          </Step>
          <Step n={2} title="Link your project">
            <CodePanel tabs={[{ label: "", code: linkCommand }]} copyLabel="Copy command" />
          </Step>
          <Step n={3} title="Deploy">
            <CodePanel
              tabs={[{ label: "", code: "neon functions deploy hello --src hello.ts" }]}
              copyLabel="Copy command"
            />
          </Step>
        </ol>
        <div className="mt-3 flex justify-end">
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold text-sm">
            Read the docs <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const summaries: FunctionSummary[] = functions.map((fn) => {
    const deployment = fn.active_deployment ?? fn.current_deployment;
    return {
      slug: fn.slug,
      status: deployment?.status ?? "pending",
      lastDeployed: deployment?.created_at ?? null,
      invocationUrl: fn.invocation_url,
      triggers: triggers
        .filter((t) => t.function_slug === fn.slug)
        .map((t) =>
          t.type === "schedule"
            ? {
                id: t.trigger_id,
                name: t.name,
                type: t.type,
                functionPath: t.function_path,
                cron: t.schedule.cron,
                enabled: t.enabled,
                inherited: t.inherited,
                nextRunAt: t.next_run_at,
              }
            : {
                id: t.trigger_id,
                name: t.name,
                type: t.type,
                functionPath: t.function_path,
                bucketName: t.storage_object_created.bucket_name,
                prefix: t.storage_object_created.prefix ?? "",
                enabled: t.enabled,
                inherited: t.inherited,
                nextRunAt: null,
              }
        ),
      domains: domains
        .filter((d) => d.entity_type === "function" && d.entity_id === fn.slug)
        .map((d) => ({ domain: d.domain, status: d.status })),
    };
  });

  return (
    <PageBody>
      <PageHeader
        title="Functions"
        project={project}
        branch={branch}
        description="Deploy and manage serverless functions that run alongside your data on this branch."
      />
      <div className="space-y-3">
        <div className="rounded-[3px] border border-panel-border px-4 py-3">
          <h2 className="mb-2 font-semibold text-base">
            Use the Neon CLI to deploy a function to this branch.
          </h2>
          <CodePanel
            tabs={[
              {
                label: "",
                code: `${linkCommand}\nneon function deploy <function-slug> --src <path-to-index.ts>`,
              },
            ]}
          />
        </div>
        {summaries.map((fn) => (
          <FunctionCard key={fn.slug} projectId={projectId} branchId={branchId} fn={fn} />
        ))}
      </div>
    </PageBody>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3">
      <span className="grid size-7 place-items-center rounded-full border border-panel-border bg-muted font-semibold text-sm">
        {n}
      </span>
      <div className="space-y-2">
        <div className="pt-1 font-semibold">{title}</div>
        {children}
      </div>
    </li>
  );
}

function FunctionDiagram() {
  return (
    <div className="mx-auto w-fit rounded-[6px] bg-muted px-6 py-5">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-[3px] border border-primary/40 bg-primary/10 px-8 py-2.5 text-sm">
        <SquareFunction className="size-4" /> Function
      </div>
      <div className="mx-auto h-4 w-px bg-muted-foreground/40" />
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-[3px] border border-panel-border bg-panel px-5 py-2.5 text-sm">
          <Database className="size-4" /> Postgres
        </div>
        <div className="flex items-center gap-2 rounded-[3px] border border-panel-border bg-panel px-5 py-2.5 text-sm">
          <Folder className="size-4" /> Object storage
        </div>
      </div>
    </div>
  );
}
