import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { getMemberRole, requireTenant } from "@/lib/tenancy";
import { OrgNameForm } from "./org-name-form";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage() {
  const tenant = await requireTenant("/org/settings");
  const role = await getMemberRole(tenant.activeOrg.id, tenant.session.user.id);
  return (
    <PageBody>
      <PageHeader title="Organization settings" />
      <div className="max-w-[760px] space-y-8">
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">General information</h2>
          <p className="text-sm">For billing purposes you can use the organization ID below.</p>
          <OrgNameForm id={tenant.activeOrg.id} canEdit={role === "owner"} />
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-lg">API keys</h2>
          <p className="text-sm">
            Organization API keys aren&apos;t available in this clone: every project
            runs in one shared Neon organization behind the app&apos;s own key.
          </p>
          <Button variant="outline" disabled>
            Create new API key
          </Button>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-lg">Delete organization</h2>
          <p className="text-sm">Deleting organizations isn&apos;t supported in this clone yet.</p>
          <Button variant="destructive" disabled>
            Delete organization
          </Button>
        </section>
      </div>
    </PageBody>
  );
}
