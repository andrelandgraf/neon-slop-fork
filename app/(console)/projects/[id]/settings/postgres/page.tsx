import { dataApiDatabase, neon } from "@/lib/neon";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { LivePostgresSettings } from "./live-postgres-settings";

export const dynamic = "force-dynamic";

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
  const branchId = context.branch.id;
  const [{ data }] = await Promise.all([
    neon.listProjectBranchDatabases(projectId, branchId),
    ensureMirrored({ kind: "services", projectId, branchId }),
  ]);
  const live = { userId: context.tenant.session.user.id, orgId: context.tenant.activeOrg.id, projectId, branchId };
  const dataApis = await loadLive("data-apis", live);

  return (
    <SettingsShell context={context}>
      <LivePostgresSettings
        projectId={projectId}
        branchId={branchId}
        databaseName={dataApiDatabase(data.databases)}
        dataApis={dataApis}
      />
    </SettingsShell>
  );
}
