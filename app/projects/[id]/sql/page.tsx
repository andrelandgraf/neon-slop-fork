import { neon } from "@/lib/neon";
import { runProjectSql } from "@/lib/sql";
import { SqlEditor } from "@/components/sql-editor";

export const dynamic = "force-dynamic";

export default async function SqlEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;

  const bRes = await neon.listProjectBranches({ projectId: id });
  const defaultBranch =
    bRes.data.branches.find((b) => b.default) ?? bRes.data.branches[0];
  const activeBranch =
    bRes.data.branches.find((b) => b.id === branchParam) ?? defaultBranch;

  return (
    <div className="px-8 py-6">
      <h1 className="text-xl font-semibold mb-1">SQL Editor</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Branch <span className="font-mono">{activeBranch?.name}</span>
        {activeBranch?.id !== defaultBranch?.id && (
          <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            (non-default)
          </span>
        )}{" "}
        · run queries against your database.
      </p>
      <SqlEditor
        branchId={activeBranch.id}
        projectId={id}
        runAction={async (sql: string) => {
          "use server";
          try {
            const result = await runProjectSql(id, sql, {
              branchId: activeBranch?.id,
            });
            return { ok: true as const, ...result };
          } catch (err) {
            return {
              ok: false as const,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }}
      />
    </div>
  );
}
