import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dataApiDatabase, ifFound, neon, neonSdk } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { ComputeDefaultsCard } from "../compute-defaults-card";
import { HistoryWindowCard } from "../history-window-card";
import { LogicalReplicationCard } from "../logical-replication-card";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { UpdatesCard } from "../updates-card";
import { DataApiSettings } from "./data-api-settings";
import { DisableDataApiCard } from "./data-api-disable";
import { ResetFromParent } from "./reset-from-parent";

export const dynamic = "force-dynamic";

const ALL_BRANCHES = "Applies to all branches";

export default async function PostgresSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;
  const context = await loadProjectBranch(projectId, branchParam);
  const { project, branch, branches } = context;
  const parent = branches.find((b) => b.id === branch.parent_id);
  const { data } = await neon.listProjectBranchDatabases(projectId, branch.id);
  const databaseName = dataApiDatabase(data.databases);
  const dataApi = databaseName
    ? await ifFound(neonSdk.postgres.dataApi.get({ projectId, branchId: branch.id, databaseName }))
    : null;

  const settings = project.settings ?? {};
  const defaults = project.default_endpoint_settings ?? {};
  const minCu = defaults.autoscaling_limit_min_cu ?? 0.25;
  const maintenance = settings.maintenance_window;

  return (
    <SettingsShell context={context}>
      {parent && (
        <SettingsSection
          title="Reset from parent"
          description={`Replace ${branch.name}'s data and schema with the latest from ${parent.name}.`}
        >
          <ResetFromParent
            projectId={projectId}
            branchId={branch.id}
            branchName={branch.name}
            parentName={parent.name}
          />
        </SettingsSection>
      )}
      <SettingsSection
        id="data-api"
        title="Data API"
        description="Secure, stateless interface to your database. Access and manage your data directly from web browsers, serverless functions, and edge runtimes using standard HTTP methods."
      >
        {dataApi && databaseName ? (
          <div className="space-y-6">
            <DataApiSettings
              projectId={projectId}
              branchId={branch.id}
              databaseName={databaseName}
              settings={dataApi.settings ?? null}
              availableSchemas={dataApi.available_schemas ?? null}
            />
            <DisableDataApiCard projectId={projectId} branchId={branch.id} databaseName={databaseName} />
          </div>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/projects/${projectId}/branches/${branch.id}/data-api`} />}
          >
            Enable Data API
          </Button>
        )}
      </SettingsSection>
      <SettingsSection
        id="compute"
        title="Compute defaults"
        scope={ALL_BRANCHES}
        description="These defaults will be used as the initial settings for any primary or read replica computes you create. Modifying these defaults does not alter the settings of any existing computes."
      >
        <ComputeDefaultsCard
          projectId={projectId}
          minCu={minCu}
          maxCu={defaults.autoscaling_limit_max_cu ?? minCu}
          suspendSeconds={defaults.suspend_timeout_seconds ?? 0}
        />
      </SettingsSection>
      <SettingsSection
        id="history"
        title="History window"
        scope={ALL_BRANCHES}
        description="Choose how long to keep a change history. Used for instant restore, time travel, and branching from past states."
      >
        <HistoryWindowCard
          projectId={projectId}
          initialHours={Math.round(project.history_retention_seconds / 3600)}
        />
      </SettingsSection>
      <SettingsSection
        id="updates"
        title="Updates"
        scope={ALL_BRANCHES}
        description="Keep your computes up to date with the latest Postgres version updates, security patches, and Neon features. Updates require a brief restart of your project's computes."
      >
        <UpdatesCard
          projectId={projectId}
          initial={
            maintenance
              ? {
                  weekdays: maintenance.weekdays ?? [],
                  start_time: maintenance.start_time ?? "00:00",
                  end_time: maintenance.end_time ?? "00:00",
                }
              : null
          }
        />
      </SettingsSection>
      <SettingsSection
        id="logical-replication"
        title="Logical Replication"
        scope={ALL_BRANCHES}
        description="Logical replication lets you replicate data changes from Neon to external data services and platforms."
      >
        <LogicalReplicationCard
          projectId={projectId}
          initialEnabled={settings.enable_logical_replication ?? false}
        />
      </SettingsSection>
    </SettingsShell>
  );
}
