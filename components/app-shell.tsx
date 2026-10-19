import { loadLive } from "@/lib/live/load";
import { ensureOrgMirrored } from "@/lib/mirror/sync";
import type { TenantContext } from "@/lib/tenancy";
import { TopBar } from "./topbar";
import { MobileNavProvider } from "./mobile-nav";
import { LiveRoot } from "./live/live-root";
import type { CommandBarProject } from "./command-bar";

/**
 * The Console frame: top bar and sidebar on a gray canvas, page content in
 * a bordered white panel that scrolls on its own. Everything inside reads
 * the org list and the org's projects from live collections.
 */
export async function AppShell({
  tenant,
  project,
  sidebar,
  children,
}: {
  tenant: TenantContext;
  project?: CommandBarProject;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const identity = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id };
  await ensureOrgMirrored(identity.orgId);
  const [orgs, projects] = await Promise.all([loadLive("orgs", identity), loadLive("projects", identity)]);
  return (
    <LiveRoot key={`${identity.userId}:${identity.orgId}`} identity={identity} orgs={orgs} projects={projects}>
      <MobileNavProvider>
        <div className="flex h-dvh flex-col bg-canvas">
          <TopBar tenant={tenant} project={project} />
          <div className="flex min-h-0 flex-1">
            {sidebar}
            <main className="min-w-0 flex-1 px-2 pb-2 md:pl-0">
              <div className="h-full overflow-y-auto rounded-[4px] border border-panel-border bg-panel">
                {children}
              </div>
            </main>
          </div>
        </div>
      </MobileNavProvider>
    </LiveRoot>
  );
}
