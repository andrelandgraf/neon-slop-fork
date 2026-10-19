import { requireCapability } from "@/lib/capabilities";
import { ifFound, neonSdk } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { CreateCredentialDialog } from "./create-credential-dialog";
import { CredentialsTable } from "./credentials-table";
import { loadLive } from "@/lib/live/load";
import { ensureMirrored } from "@/lib/mirror/services";

export const dynamic = "force-dynamic";

export default async function CredentialsSettingsPage({
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
  await requireCapability(projectId, context.defaultBranch.id, "credentials");
  await ensureMirrored({ kind: "services", projectId, branchId });
  const live = { userId: context.tenant.session.user.id, orgId: context.tenant.activeOrg.id, projectId, branchId };
  const [credentials, storage] = await Promise.all([
    loadLive("credentials", live),
    ifFound(neonSdk.storage.get({ projectId, branchId })),
  ]);

  return (
    <SettingsShell context={context}>
      <SettingsSection
        title="Credentials"
        description="Credentials for this branch, scoped per service. Use them as S3 access keys for Storage, or as an API token (Bearer) for AI Gateway. Each credential carries only the scopes you grant."
      >
        <div className="flex justify-end">
          <CreateCredentialDialog
            projectId={projectId}
            branchId={branchId}
            s3Endpoint={storage?.s3_endpoint ?? ""}
            region={storage?.region ?? ""}
          />
        </div>
        <CredentialsTable projectId={projectId} branchId={branchId} credentials={credentials} />
      </SettingsSection>
    </SettingsShell>
  );
}
