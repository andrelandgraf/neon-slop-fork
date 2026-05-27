import Link from "next/link";
import { Lock, ExternalLink, AlertTriangle } from "lucide-react";
import { neon } from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { EnableAuthCard } from "./enable-card";
import { AuthUsersTab } from "./users-tab";
import { AuthConfigurationTab } from "./configuration-tab";

export const dynamic = "force-dynamic";

type Tab = "users" | "configuration";
const TABS: { id: Tab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "configuration", label: "Configuration" },
];

/**
 * `/projects/[id]/auth`
 *
 * Mirrors console.neon.tech's per-branch Neon Auth screen. Neon Auth
 * spins up a Stack Auth project tied to the branch and adds a
 * `neon_auth.users_sync` table that the app's own SQL can join against.
 *
 * Tabs:
 *
 *   - Users (managed via the auth admin SDK; we list users by SELECTing
 *     directly from `neon_auth.users_sync` because the REST API doesn't
 *     expose a list endpoint — only create/delete/role).
 *   - Configuration (allow localhost, domains, email/password,
 *     OAuth providers, webhooks, disable).
 *
 * The third tab (Plugins) on the upstream is in Beta and the API
 * `/auth/plugins` endpoint requires extra setup that isn't always
 * provisioned — we surface that as a notice rather than a broken tab.
 */
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string; tab?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam, tab } = await searchParams;
  const activeTab: Tab = tab === "configuration" ? "configuration" : "users";

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch =
    branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const integration = await neon
    .getNeonAuth(projectId, activeBranch.id)
    .then((r) => r.data)
    .catch(() => null);

  const branchQuery = branchParam ? `&branch=${branchParam}` : "";

  return (
    <div className="px-8 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Auth
        </h1>
        <Badge variant="muted">{activeBranch.name}</Badge>
        <Badge variant="muted">Beta</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Serverless authentication that branches with your database. Powered by{" "}
        <a
          href="https://www.better-auth.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Better Auth <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      {!integration ? (
        <EnableAuthCard projectId={projectId} branchId={activeBranch.id} />
      ) : (
        <>
          <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3 mb-5 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-700 shrink-0" />
            <div>
              Anyone on the web can sign up for your app. Restricting sign-ups
              is configurable from the Configuration tab → Email &amp; password
              → <em>Disable sign-ups</em>.
            </div>
          </div>

          <div className="border-b mb-5">
            <nav className="flex items-center gap-6 -mb-px">
              {TABS.map((t) => {
                const href = `/projects/${projectId}/auth?tab=${t.id}${branchQuery}`;
                const active = t.id === activeTab;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className={`pb-3 text-sm border-b-2 ${
                      active
                        ? "border-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {activeTab === "users" && (
            <AuthUsersTab
              projectId={projectId}
              branchId={activeBranch.id}
              defaultBranchId={defaultBranch.id}
            />
          )}
          {activeTab === "configuration" && (
            <AuthConfigurationTab
              projectId={projectId}
              branchId={activeBranch.id}
              integration={integration}
            />
          )}
        </>
      )}
    </div>
  );
}
