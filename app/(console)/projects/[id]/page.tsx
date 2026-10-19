import { redirect } from "next/navigation";
import { loadProjectBranch } from "@/lib/project-context";

/** The Console opens a project on its default branch's overview. */
export default async function ProjectRoot({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch } = await searchParams;
  const context = await loadProjectBranch(id, branch);
  redirect(`/projects/${id}/branches/${context.branch.id}`);
}
