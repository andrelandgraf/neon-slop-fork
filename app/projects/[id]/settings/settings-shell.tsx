import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import type { BranchContext } from "@/lib/project-context";
import { SettingsNav } from "./settings-nav";

export async function SettingsShell({
  context,
  children,
}: {
  context: BranchContext;
  children: React.ReactNode;
}) {
  const capabilities = await getProjectCapabilities(context.project.id, context.defaultBranch.id);
  return (
    <PageBody>
      <PageHeader title="Settings" project={context.project} branch={context.branch} />
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <SettingsNav projectId={context.project.id} capabilities={capabilities} />
        <div className="min-w-0 max-w-[760px] flex-1 space-y-8">{children}</div>
      </div>
    </PageBody>
  );
}
