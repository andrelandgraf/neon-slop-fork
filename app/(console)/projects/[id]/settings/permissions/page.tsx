import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { LiveCollaborators } from "./live-collaborators";

export const dynamic = "force-dynamic";

export default async function PermissionsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch } = await searchParams;
  const context = await loadProjectBranch(id, branch);
  await ensureMirrored({ kind: "extras", projectId: id });
  const collaborators = await loadLive("collaborators", {
    userId: context.tenant.session.user.id,
    orgId: context.tenant.activeOrg.id,
    projectId: id,
  });
  return (
    <SettingsShell context={context}>
      <SettingsSection title="Project permissions" description="Control who can access or manage this project.">
        <LiveCollaborators projectId={id} ownerOrgName={context.tenant.activeOrg.name} collaborators={collaborators} />
      </SettingsSection>
    </SettingsShell>
  );
}
