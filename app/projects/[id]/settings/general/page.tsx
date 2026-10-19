import { getClaimLinkExpiry } from "@/lib/tenancy";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { GeneralSettings } from "./general-settings";

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
  const { project, branch, branches, tenant } = context;
  const claimLinkExpiresAt = await getClaimLinkExpiry(id);

  return (
    <SettingsShell context={context}>
      <GeneralSettings
        project={{ id: project.id, name: project.name }}
        branch={{
          id: branch.id,
          name: branch.name,
          default: branch.default,
          protected: branch.protected,
          expiresAt: branch.expires_at,
        }}
        branches={branches.map((b) => ({ id: b.id, name: b.name, default: b.default }))}
        otherOrgs={tenant.orgs.filter((o) => o.id !== tenant.activeOrg.id)}
        claimLinkExpiresAt={claimLinkExpiresAt?.toISOString() ?? null}
      />
    </SettingsShell>
  );
}
