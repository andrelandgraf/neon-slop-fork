import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { neon } from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { EnableDataApiCard } from "./enable-card";
import { DataApiOverview } from "./overview";
import { DataApiSettings } from "./settings";
import { DisableDataApiCard } from "./disable-card";

export const dynamic = "force-dynamic";

type Tab = "api" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "api", label: "API" },
  { id: "settings", label: "Settings" },
];

/**
 * `/projects/[id]/data-api`
 *
 * Mirrors console.neon.tech's per-branch Data API screen. The Data API is
 * a PostgREST-compatible HTTP endpoint provisioned by Neon on a specific
 * branch + database; we use the same default the upstream console picks
 * (the branch's `neondb` database) and surface the same controls:
 *
 *   - Enable / Disable
 *   - Refresh schema cache (a no-op PATCH whose side-effect is the cache reload)
 *   - Advanced settings (exposed schemas, anon role, row caps, CORS,
 *     OpenAPI mode, server-timing headers)
 *
 * We pass the branch through `?branch=<id>` so the BranchSwitcher in the
 * sidebar keeps working — same convention as the SQL Editor / Tables pages.
 */
export default async function DataApiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string; tab?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam, tab } = await searchParams;
  const activeTab: Tab = tab === "settings" ? "settings" : "api";

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch =
    branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  // Pick the branch's default database. The Neon UI uses `neondb` by
  // convention (the project's auto-created database); we list databases
  // and prefer the first one Neon returns when `neondb` is missing
  // (renamed / custom installs).
  const dbsRes = await neon.listProjectBranchDatabases(
    projectId,
    activeBranch.id
  );
  const databases = dbsRes.data.databases;
  const database =
    databases.find((d) => d.name === "neondb") ?? databases[0];
  const databaseName = database?.name ?? "neondb";

  // Neon Auth status on this branch — the Data API "Use Neon Auth"
  // toggle requires it to be enabled. We surface that as a status badge.
  const authIntegration = await neon
    .getNeonAuth(projectId, activeBranch.id)
    .then((r) => r.data)
    .catch(() => null);

  // Data API may or may not exist for this branch. The Neon API returns
  // a 404 on missing, so a `.catch` is the cleanest signal.
  const dataApi = await neon
    .getProjectBranchDataApi(projectId, activeBranch.id, databaseName)
    .then((r) => r.data)
    .catch(() => null);

  const branchQuery = branchParam ? `&branch=${branchParam}` : "";

  return (
    <div className="px-8 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          Data API
        </h1>
        <Badge variant="muted">{activeBranch.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Access your database through auto-generated REST API endpoints.{" "}
        <a
          href="https://neon.tech/docs/data-api/get-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Learn more <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      {!dataApi ? (
        <EnableDataApiCard
          projectId={projectId}
          branchId={activeBranch.id}
          databaseName={databaseName}
        />
      ) : (
        <>
          <div className="border-b mb-5">
            <nav className="flex items-center gap-6 -mb-px">
              {TABS.map((t) => {
                const href = `/projects/${projectId}/data-api?tab=${t.id}${branchQuery}`;
                const active = t.id === activeTab;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className={`pb-3 text-sm border-b-2 ${
                      active
                        ? "border-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {activeTab === "api" && (
            <DataApiOverview
              projectId={projectId}
              branchId={activeBranch.id}
              databaseName={databaseName}
              dataApi={dataApi}
              authIntegration={authIntegration}
            />
          )}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <DataApiSettings
                projectId={projectId}
                branchId={activeBranch.id}
                databaseName={databaseName}
                settings={dataApi.settings ?? null}
                availableSchemas={dataApi.available_schemas ?? null}
              />
              <DisableDataApiCard
                projectId={projectId}
                branchId={activeBranch.id}
                databaseName={databaseName}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
