"use client";
import Link from "next/link";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/button";
import { LiveStatus } from "@/components/live/live-status";
import { useDataApis, useLiveHeader, useProjectLive } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { DataApiRow } from "@/lib/live/queries";
import { ComputeDefaultsCard } from "../compute-defaults-card";
import { HistoryWindowCard } from "../history-window-card";
import { LogicalReplicationCard } from "../logical-replication-card";
import { SettingsSection } from "../settings-section";
import { UpdatesCard } from "../updates-card";
import { DataApiSettings } from "./data-api-settings";
import { DisableDataApiCard } from "./data-api-disable";
import { ResetFromParent } from "./reset-from-parent";

const ALL_BRANCHES = "Applies to all branches";

/**
 * The Postgres settings from the live project, branch and Data API rows. Each
 * form is keyed on the values it edits, so a save from another tab reloads
 * its fields.
 */
export function LivePostgresSettings({
  projectId,
  branchId,
  databaseName,
  dataApis: dataApisSeed,
}: {
  projectId: string;
  branchId: string;
  databaseName: string | undefined;
  dataApis: LiveSeed<DataApiRow>;
}) {
  const { project, branch } = useLiveHeader(projectId, branchId);
  const { branches } = useProjectLive();
  const dataApis = useDataApis(branchId, dataApisSeed);
  const parentId = branch?.parent_id ?? null;
  const parents = useLiveQuery({
    query: (q) => (parentId ? q.from({ b: branches }).where(({ b }) => eq(b.id, parentId)) : undefined),
  });
  const api = useLiveQuery({
    query: (q) =>
      databaseName
        ? q
            .from({ d: dataApis })
            .where(({ d }) => and(eq(d.branch_id, branchId), eq(d.database_name, databaseName)))
        : undefined,
  });
  if (!project || !branch) return null;
  const parent = parents.data?.[0];
  const dataApi = api.data?.[0]?.data;
  const settings = project.settings ?? {};
  const defaults = project.default_endpoint_settings ?? {};
  const minCu = defaults.autoscaling_limit_min_cu ?? 0.25;
  const maxCu = defaults.autoscaling_limit_max_cu ?? minCu;
  const suspendSeconds = defaults.suspend_timeout_seconds ?? 0;
  const historyHours = Math.round(project.history_retention_seconds / 3600);
  const maintenance = settings.maintenance_window;
  const updates = maintenance
    ? {
        weekdays: maintenance.weekdays ?? [],
        start_time: maintenance.start_time ?? "00:00",
        end_time: maintenance.end_time ?? "00:00",
      }
    : null;
  const logicalReplication = settings.enable_logical_replication ?? false;

  return (
    <>
      <LiveStatus queries={[api]} />
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
              key={JSON.stringify([dataApi.settings, dataApi.available_schemas])}
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
          key={`${minCu}:${maxCu}:${suspendSeconds}`}
          projectId={projectId}
          minCu={minCu}
          maxCu={maxCu}
          suspendSeconds={suspendSeconds}
        />
      </SettingsSection>
      <SettingsSection
        id="history"
        title="History window"
        scope={ALL_BRANCHES}
        description="Choose how long to keep a change history. Used for instant restore, time travel, and branching from past states."
      >
        <HistoryWindowCard key={historyHours} projectId={projectId} initialHours={historyHours} />
      </SettingsSection>
      <SettingsSection
        id="updates"
        title="Updates"
        scope={ALL_BRANCHES}
        description="Keep your computes up to date with the latest Postgres version updates, security patches, and Neon features. Updates require a brief restart of your project's computes."
      >
        <UpdatesCard key={JSON.stringify(updates)} projectId={projectId} initial={updates} />
      </SettingsSection>
      <SettingsSection
        id="logical-replication"
        title="Logical Replication"
        scope={ALL_BRANCHES}
        description="Logical replication lets you replicate data changes from Neon to external data services and platforms."
      >
        <LogicalReplicationCard
          key={String(logicalReplication)}
          projectId={projectId}
          initialEnabled={logicalReplication}
        />
      </SettingsSection>
    </>
  );
}
