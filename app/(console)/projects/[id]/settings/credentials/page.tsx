import { Badge } from "@/components/ui/badge";
import { requireCapability } from "@/lib/capabilities";
import { ifFound, neonSdk } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";
import { CreateCredentialDialog } from "./create-credential-dialog";
import { CredentialRowActions } from "./credential-row-actions";

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
  const [credentials, storage] = await Promise.all([
    neonSdk.credentials.list({ projectId, branchId }),
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
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="border-panel-border border-b">
              {["Name", "Key ID", "Created", "Last used", "Revoked", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {credentials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No credentials on this branch yet.
                </td>
              </tr>
            )}
            {credentials.map((cred) => (
              <tr key={cred.token_id} className="border-panel-border border-b">
                <td className="px-3 py-2.5">
                  <div className="font-semibold">{cred.name ?? "—"}</div>
                  <div className="text-muted-foreground text-xs" title={cred.scopes.join(", ")}>
                    {cred.scopes.length} scope{cred.scopes.length === 1 ? "" : "s"}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{cred.token_id_short}</td>
                <td className="px-3 py-2.5">{new Date(cred.created_at).toLocaleDateString("en-US")}</td>
                <td className="px-3 py-2.5">
                  {cred.last_used_at ? new Date(cred.last_used_at).toLocaleDateString("en-US") : "-"}
                </td>
                <td className="px-3 py-2.5">
                  {cred.revoked_at ? <Badge variant="destructive">Revoked</Badge> : "-"}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {!cred.revoked_at && (
                    <CredentialRowActions
                      projectId={projectId}
                      branchId={branchId}
                      tokenId={cred.token_id}
                      name={cred.name ?? cred.token_id_short}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsSection>
    </SettingsShell>
  );
}
