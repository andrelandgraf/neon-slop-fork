import { requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadProjectBranch } from "@/lib/project-context";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";

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
  const [functions, domains] = await Promise.all([
    neonSdk.functions.list({ projectId, branchId }).all(),
    neonSdk.functions.customDomains.list({ projectId, branchId }).all(),
  ]);
  return (
    <SettingsShell context={context}>
      <SettingsSection
        title="Custom domains"
        description="Serve a branch entity from your own domain. Add a domain, then create a DNS CNAME record pointing at the target shown below to route traffic to it."
      >
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="border-panel-border border-b">
              {["Domain", "Function", "CNAME target", "Status"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  {functions.length === 0
                    ? "No functions in this branch"
                    : "No custom domains yet. Add one from a function's card on the Functions page."}
                </td>
              </tr>
            )}
            {domains.map((d) => (
              <tr key={d.domain} className="border-panel-border border-b">
                <td className="px-3 py-2.5 font-mono text-xs">{d.domain}</td>
                <td className="px-3 py-2.5">{d.entity_id}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{d.cname_target}</td>
                <td className="px-3 py-2.5">{d.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsSection>
    </SettingsShell>
  );
}
