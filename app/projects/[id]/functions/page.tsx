import { ExternalLink } from "lucide-react";
import { neon } from "@/lib/neon";
import { Button } from "@/components/ui/button";
import { CopyableCode } from "@/components/copyable-code";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/functions`
 *
 * Mirrors console.neon.tech's per-branch Functions screen. Functions can't be
 * created through the UI — they're deployed from the CLI — so the console (and
 * this clone) surface a getting-started page with the exact `neonctl` commands
 * scoped to the current project + branch. There is no create/deploy dialog.
 */
export default async function FunctionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const deploySnippet = `neonctl link --project-id ${projectId} --branch-id ${activeBranch.id}\nneonctl function deploy <function-slug> --src <path-to-index.ts>`;

  return (
    <div className="px-8 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <ProjectDiagram />
        <h2 className="mt-8 text-xl font-semibold tracking-tight">
          Long-running Node.js compute in the same AWS region as your database.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Each function deploys to a Neon branch and gets a public HTTPS URL. If
          the branch has a Postgres database, <code className="text-xs">DATABASE_URL</code>{" "}
          is injected automatically. No configuration needed, no cross-region
          round trips.
        </p>

        <div className="mt-6 w-full space-y-2 text-left">
          <CopyableCode code="npm i -g neonctl" inline />
          <CopyableCode code={deploySnippet} />
        </div>

        <div className="mt-6">
          <Button variant="default" size="sm" asChild className="bg-foreground text-background hover:bg-foreground/90">
            <a
              href="https://neon.com/docs/functions/get-started"
              target="_blank"
              rel="noreferrer"
            >
              Read the docs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The console's little architecture figure: a function fed by Postgres + storage. */
function ProjectDiagram() {
  return (
    <div className="rounded-lg border bg-muted/20 p-5">
      <div className="text-left text-[11px] text-muted-foreground mb-2">
        Neon project
      </div>
      <div className="rounded-md border bg-background p-3">
        <div className="text-left text-[11px] text-muted-foreground mb-2">
          Production branch
        </div>
        <DiagramBox className="mx-auto w-32">Function</DiagramBox>
        <div className="mt-2 flex items-center justify-center gap-2">
          <DiagramBox className="w-28">Postgres</DiagramBox>
          <DiagramBox className="w-28">Object storage</DiagramBox>
        </div>
      </div>
    </div>
  );
}

function DiagramBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded border bg-muted/40 py-1.5 text-center font-mono text-[11px] text-foreground/80 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
