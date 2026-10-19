import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveAuthGate } from "@/components/live/live-auth-gate";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";
import { ifFound, neonSdk } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { AuthConfigurationTab } from "./configuration";

export const dynamic = "force-dynamic";

export default async function AuthSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const context = await loadProjectBranch(id, branchParam);
  const branchId = context.branch.id;
  await ensureMirrored({ kind: "services", projectId: id, branchId });
  const live = { userId: context.tenant.session.user.id, orgId: context.tenant.activeOrg.id, projectId: id, branchId };
  const [services, integration] = await Promise.all([
    loadLive("branch-services", live),
    ifFound(neonSdk.auth.get({ projectId: id, branchId })),
  ]);
  const off = (
    <SettingsSection key="off" title="Better Auth" description="Neon Auth isn't enabled on this branch.">
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/projects/${id}/branches/${branchId}/auth`} />}
      >
        Enable Neon Auth
      </Button>
    </SettingsSection>
  );
  return (
    <SettingsShell context={context}>
      <LiveAuthGate branchId={branchId} services={services} off={off}>
        {integration && (
          <AuthConfigurationTab key="on" projectId={id} branchId={branchId} integration={integration} />
        )}
      </LiveAuthGate>
    </SettingsShell>
  );
}
