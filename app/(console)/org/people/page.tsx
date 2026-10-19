import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { loadLive } from "@/lib/live/load";
import { requireTenant } from "@/lib/tenancy";
import { PeopleTables } from "./people-tables";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const tenant = await requireTenant("/org/people");
  const members = await loadLive("org-members", { userId: tenant.session.user.id, orgId: tenant.activeOrg.id });
  return (
    <PageBody>
      <PageHeader
        title="People"
        actions={
          <Button disabled title="This clone doesn't send email, so it can't deliver invites.">
            Invite member
          </Button>
        }
      />
      <PeopleTables members={members} />
    </PageBody>
  );
}
