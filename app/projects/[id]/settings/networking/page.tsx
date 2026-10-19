import { loadProjectBranch } from "@/lib/project-context";
import { NetworkingCard } from "../networking-card";
import { SettingsShell } from "../settings-shell";

export const dynamic = "force-dynamic";

export default async function NetworkingSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch } = await searchParams;
  const context = await loadProjectBranch(id, branch);
  const settings = context.project.settings ?? {};
  return (
    <SettingsShell context={context}>
      <NetworkingCard
        projectId={id}
        initialBlockPublic={settings.block_public_connections ?? false}
        initialBlockVpc={settings.block_vpc_connections ?? false}
        initialIps={settings.allowed_ips?.ips ?? []}
        initialProtectedOnly={settings.allowed_ips?.protected_branches_only ?? false}
      />
    </SettingsShell>
  );
}
