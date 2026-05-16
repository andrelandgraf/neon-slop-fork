import { notFound } from "next/navigation";
import { TopBar } from "@/components/topbar";
import { Sidebar } from "@/components/sidebar";
import { neon } from "@/lib/neon";
import { requireTenant, requireProjectAccess } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await requireTenant(`/projects/${id}`);
  await requireProjectAccess(tenant, id);

  let project;
  let branches: { id: string; name: string; default: boolean }[] = [];
  let defaultBranchId = "";
  try {
    const [pRes, bRes] = await Promise.all([
      neon.getProject(id),
      neon.listProjectBranches({ projectId: id }),
    ]);
    project = pRes.data.project;
    branches = bRes.data.branches.map((b) => ({
      id: b.id,
      name: b.name,
      default: b.default,
    }));
    const def = bRes.data.branches.find((b) => b.default) ?? bRes.data.branches[0];
    defaultBranchId = def?.id ?? "";
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar tenant={tenant} context={project.name} />
      <div className="flex flex-1">
        <Sidebar
          projectId={id}
          projectName={project.name}
          branches={branches}
          defaultBranchId={defaultBranchId}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
