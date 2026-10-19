import { requireCapability } from "@/lib/capabilities";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { LiveCustomDomains } from "./live-custom-domains";

export const dynamic = "force-dynamic";

export default async function FunctionsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;
  const context = await loadProjectBranch(projectId, branchParam);
  await requireCapability(projectId, context.defaultBranch.id, "functions");
  const branchId = context.branch.id;
  await ensureMirrored({ kind: "services", projectId, branchId });
  const live = { userId: context.tenant.session.user.id, orgId: context.tenant.activeOrg.id, projectId, branchId };
  const [functions, domains] = await Promise.all([loadLive("functions", live), loadLive("custom-domains", live)]);
  return (
    <SettingsShell context={context}>
      <SettingsSection
        title="Custom domains"
        description="Serve a branch entity from your own domain. Add a domain, then create a DNS CNAME record pointing at the target shown below to route traffic to it."
      >
        <LiveCustomDomains branchId={branchId} functions={functions} domains={domains} />
      </SettingsSection>
    </SettingsShell>
  );
}
