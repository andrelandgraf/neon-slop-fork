import type { TenantContext } from "@/lib/tenancy";
import { TopBar } from "./topbar";
import type { CommandBarProject } from "./command-bar";

/**
 * The Console frame: top bar and sidebar on a gray canvas, page content in
 * a bordered white panel that scrolls on its own.
 */
export function AppShell({
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
  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <TopBar tenant={tenant} project={project} />
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <main className="min-w-0 flex-1 pr-2 pb-2">
          <div className="h-full overflow-y-auto rounded-[4px] border border-panel-border bg-panel">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
