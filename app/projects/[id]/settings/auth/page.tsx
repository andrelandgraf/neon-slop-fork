import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  const integration = await ifFound(neonSdk.auth.get({ projectId: id, branchId: context.branch.id }));
  return (
    <SettingsShell context={context}>
      {integration ? (
        <AuthConfigurationTab projectId={id} branchId={context.branch.id} integration={integration} />
      ) : (
        <SettingsSection title="Better Auth" description="Neon Auth isn't enabled on this branch.">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/projects/${id}/branches/${context.branch.id}/auth`} />}
          >
            Enable Neon Auth
          </Button>
        </SettingsSection>
      )}
    </SettingsShell>
  );
}
