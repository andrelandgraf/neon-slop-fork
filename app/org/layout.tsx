import { AppShell } from "@/components/app-shell";
import { OrgSidebar } from "@/components/org-sidebar";
import { requireTenant } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant("/org/settings");
  return (
    <AppShell tenant={tenant} sidebar={<OrgSidebar />}>
      {children}
    </AppShell>
  );
}
