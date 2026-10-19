import { AppShell } from "@/components/app-shell";
import { OrgSidebar } from "@/components/org-sidebar";
import { PageBody } from "@/components/page-header";
import { ProjectsList } from "@/components/projects-table";
import { loadLive } from "@/lib/live/load";
import { ensureOrgMirrored } from "@/lib/mirror/sync";
import { APP_BACKEND_REGIONS } from "@/lib/region-catalog";
import { DEFAULT_REGION_ID, listRegions, PG_VERSIONS } from "@/lib/regions";
import { requireTenant } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const tenant = await requireTenant("/projects");
  const identity = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id };
  await ensureOrgMirrored(identity.orgId);
  const [branches, creations, regions] = await Promise.all([
    loadLive("org-branches", identity),
    loadLive("project-creations", identity),
    listRegions(),
  ]);

  return (
    <AppShell tenant={tenant} sidebar={<OrgSidebar />}>
      <PageBody>
        <ProjectsList
          branches={branches}
          creations={creations}
          regions={regions}
          defaultRegionId={regions.find((r) => r.id === DEFAULT_REGION_ID)?.id ?? regions[0]?.id ?? DEFAULT_REGION_ID}
          pgVersions={PG_VERSIONS}
          backendRegions={[...APP_BACKEND_REGIONS]}
        />
      </PageBody>
    </AppShell>
  );
}
