import { AppShell } from "@/components/app-shell";
import { ProjectLive } from "@/components/live/project-live";
import { Sidebar } from "@/components/sidebar";
import { getProjectCapabilities } from "@/lib/capabilities";
import { loadLive } from "@/lib/live/load";
import { ensureProjectMirrored } from "@/lib/mirror/sync";
import { loadProject } from "@/lib/project-context";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant, project, defaultBranch } = await loadProject(id);
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId: id };
  await ensureProjectMirrored(id);
  const [capabilities, liveBranches, endpoints, operations] = await Promise.all([
    getProjectCapabilities(id, defaultBranch.id),
    loadLive("project-branches", live),
    loadLive("endpoints", live),
    loadLive("operations", live),
  ]);

  return (
    <ProjectLive params={live} branches={liveBranches} endpoints={endpoints} operations={operations}>
      <AppShell
        tenant={tenant}
        project={{ id, name: project.name, capabilities }}
        sidebar={<Sidebar projectId={id} projectName={project.name} capabilities={capabilities} />}
      >
        {children}
      </AppShell>
    </ProjectLive>
  );
}
