import { getClaimLinkExpiry } from "@/lib/tenancy";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { LiveGeneralSettings } from "./live-general-settings";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const context = await loadProjectBranch(id, branchParam);
  const { branch, tenant } = context;
  const claimLinkExpiresAt = await getClaimLinkExpiry(id);

  return (
    <SettingsShell context={context}>
      <LiveGeneralSettings
        projectId={id}
        branchId={branch.id}
        otherOrgs={tenant.orgs.filter((o) => o.id !== tenant.activeOrg.id)}
        claimLinkExpiresAt={claimLinkExpiresAt?.toISOString() ?? null}
      />
    </SettingsShell>
  );
}
