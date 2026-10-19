import { LiveRoot } from "@/components/live/live-root";
import { loadLive } from "@/lib/live/load";
import { ensureOrgMirrored } from "@/lib/mirror/sync";
import { requireTenant } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

/**
 * Every signed-in console page sits under this layout, so one Realtime
 * connection and one TanStack DB client serve the whole visit: navigating
 * between projects, org pages and project pages keeps them. Changing the
 * session or org is a full page load, which starts a fresh one.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();
  const identity = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id };
  await ensureOrgMirrored(identity.orgId);
  const [orgs, projects] = await Promise.all([loadLive("orgs", identity), loadLive("projects", identity)]);
  return (
    <LiveRoot key={`${identity.userId}:${identity.orgId}`} identity={identity} orgs={orgs} projects={projects}>
      {children}
    </LiveRoot>
  );
}
