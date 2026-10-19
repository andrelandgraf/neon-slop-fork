import { AppShell } from "@/components/app-shell";
import { Sidebar } from "@/components/sidebar";
import { getProjectCapabilities } from "@/lib/capabilities";
import { loadOrgProjects, loadProject } from "@/lib/project-context";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant, project, branches, defaultBranch } = await loadProject(id);
  const [capabilities, orgProjects] = await Promise.all([
    getProjectCapabilities(id, defaultBranch.id),
    loadOrgProjects(tenant.activeOrg.id),
  ]);
  const sidebarBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
    default: b.default,
  }));

  return (
    <AppShell
      tenant={tenant}
      project={{ id, name: project.name, branches: sidebarBranches, capabilities }}
      sidebar={
        <Sidebar
          projectId={id}
          projectName={project.name}
          branches={sidebarBranches}
          capabilities={capabilities}
          orgProjects={orgProjects.map((p) => ({ id: p.id, name: p.name }))}
        />
      }
    >
      {children}
    </AppShell>
  );
}
