import { notFound, redirect } from "next/navigation";
import { CONSUMED_PARAMS, legacyTarget } from "@/lib/legacy-routes";
import { loadProjectBranch } from "@/lib/project-context";

export default async function LegacyProjectRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; legacy: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, legacy } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }
  const target = legacyTarget(legacy, query);
  if (!target) notFound();
  const { branch } = await loadProjectBranch(id, query.get("branch") ?? undefined);
  for (const key of CONSUMED_PARAMS) query.delete(key);
  if (target.projectLevel) query.set("branch", branch.id);
  const path = target.projectLevel
    ? `/projects/${id}/${target.path}`
    : `/projects/${id}/branches/${branch.id}${target.path ? `/${target.path}` : ""}`;
  const search = query.toString();
  redirect(search ? `${path}?${search}` : path);
}
