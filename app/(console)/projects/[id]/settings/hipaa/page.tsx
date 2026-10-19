import { loadProjectBranch } from "@/lib/project-context";
import { HipaaCard } from "../hipaa-card";
import { SettingsShell } from "../settings-shell";
import { SettingsSection } from "../settings-section";

export const dynamic = "force-dynamic";

export default async function HipaaSettingsPage({
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
      <SettingsSection
        title="HIPAA compliance"
        scope="Applies to all branches"
        description={
          <>
            Enable HIPAA compliance on this project to ensure that all protected
            health information (PHI) is protected in compliance with the Health
            Insurance Portability and Accountability Act (HIPAA). For more details,
            see our{" "}
            <a className="text-link" href="https://neon.com/docs/security/hipaa" target="_blank" rel="noreferrer">
              HIPAA Compliance guide
            </a>
            .
          </>
        }
      >
        <HipaaCard projectId={id} initialEnabled={context.project.settings?.hipaa ?? false} />
      </SettingsSection>
    </SettingsShell>
  );
}
