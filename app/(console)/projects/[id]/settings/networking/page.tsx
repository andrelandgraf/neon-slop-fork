import { loadProjectBranch } from "@/lib/project-context";
import { LiveNetworkingCard } from "../live-project-settings";
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
  return (
    <SettingsShell context={context}>
      <LiveNetworkingCard projectId={id} />
    </SettingsShell>
  );
}
