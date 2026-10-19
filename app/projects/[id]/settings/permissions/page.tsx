import { neon } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { CollaboratorsCard } from "../collaborators-card";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";

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
  const { data } = await neon.listProjectPermissions(id);
  return (
    <SettingsShell context={context}>
      <SettingsSection title="Project permissions" description="Control who can access or manage this project.">
        <CollaboratorsCard
          projectId={id}
          ownerOrgName={context.tenant.activeOrg.name}
          collaborators={data.project_permissions.map((p) => ({
            id: p.id,
            email: p.granted_to_email,
            grantedAt: p.granted_at,
          }))}
        />
      </SettingsSection>
    </SettingsShell>
  );
}
