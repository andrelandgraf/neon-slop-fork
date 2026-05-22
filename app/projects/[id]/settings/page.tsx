import { neon, ORG_ID } from "@/lib/neon";
import { requireTenant } from "@/lib/tenancy";
import { deleteProjectAction } from "@/app/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { SettingsNav } from "./settings-nav";
import { GeneralCard } from "./general-card";
import { ComputeDefaultsCard } from "./compute-defaults-card";
import { HistoryWindowCard } from "./history-window-card";
import { UpdatesCard } from "./updates-card";
import { CollaboratorsCard } from "./collaborators-card";
import { HipaaCard } from "./hipaa-card";
import { NetworkingCard } from "./networking-card";
import { LogicalReplicationCard } from "./logical-replication-card";
import { TransferCard } from "./transfer-card";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "compute", label: "Compute" },
  { id: "history", label: "History window" },
  { id: "updates", label: "Updates" },
  { id: "collaborators", label: "Collaborators" },
  { id: "hipaa", label: "HIPAA support" },
  { id: "networking", label: "Networking" },
  { id: "logical-replication", label: "Logical Replication" },
  { id: "transfer", label: "Transfer" },
  { id: "delete", label: "Delete" },
] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await requireTenant();

  const pRes = await neon.getProject(id);
  const project = pRes.data.project;

  // `listProjectPermissions` is a separate call; both share the same
  // require-project-access guard (called above via the layout).
  const permsRes = await neon.listProjectPermissions(id);
  const collaborators = permsRes.data.project_permissions.map((p) => ({
    id: p.id,
    email: p.granted_to_email,
    grantedAt: p.granted_at,
  }));

  const settings = project.settings ?? {};
  const ipList = settings.allowed_ips?.ips ?? [];
  const protectedOnly = settings.allowed_ips?.protected_branches_only ?? false;
  const blockPublic = settings.block_public_connections ?? false;
  const blockVpc = settings.block_vpc_connections ?? false;
  const hipaaEnabled = settings.hipaa ?? false;
  const logRepEnabled = settings.enable_logical_replication ?? false;
  const maintenance = settings.maintenance_window ?? null;

  const defaultSettings = project.default_endpoint_settings ?? {};
  const minCu = defaultSettings.autoscaling_limit_min_cu ?? 0.25;
  const maxCu = defaultSettings.autoscaling_limit_max_cu ?? minCu;
  const suspendSeconds = defaultSettings.suspend_timeout_seconds ?? 0;
  const historyHours = Math.round(
    (project.history_retention_seconds ?? 86400) / 3600
  );

  return (
    <div className="px-8 py-6">
      <h1 className="text-xl font-semibold mb-6">Project settings</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-5 max-w-2xl">
          <Section id="general" title="General">
            <GeneralCard projectId={project.id} projectName={project.name} />
          </Section>

          <Section
            id="compute"
            title="Compute defaults"
          >
            <ComputeDefaultsCard
              projectId={project.id}
              minCu={minCu}
              maxCu={maxCu}
              suspendSeconds={suspendSeconds}
            />
          </Section>

          <Section id="history" title="History window">
            <HistoryWindowCard
              projectId={project.id}
              initialHours={historyHours}
            />
          </Section>

          <Section id="updates" title="Updates">
            <UpdatesCard
              projectId={project.id}
              initial={
                maintenance
                  ? {
                      weekdays: maintenance.weekdays ?? [],
                      start_time: maintenance.start_time ?? "00:00",
                      end_time: maintenance.end_time ?? "00:00",
                    }
                  : null
              }
            />
          </Section>

          <Section id="collaborators" title="Collaborators">
            <CollaboratorsCard
              projectId={project.id}
              collaborators={collaborators}
              ownerOrgName={tenant.activeOrg.name}
            />
          </Section>

          <Section id="hipaa" title="HIPAA compliance">
            <HipaaCard projectId={project.id} initialEnabled={hipaaEnabled} />
          </Section>

          <Section id="networking" title="Networking">
            <NetworkingCard
              projectId={project.id}
              initialBlockPublic={blockPublic}
              initialBlockVpc={blockVpc}
              initialIps={ipList}
              initialProtectedOnly={protectedOnly}
            />
          </Section>

          <Section id="logical-replication" title="Logical Replication">
            <LogicalReplicationCard
              projectId={project.id}
              initialEnabled={logRepEnabled}
            />
          </Section>

          <Section id="transfer" title="Transfer project">
            <TransferCard
              projectId={project.id}
              currentOrgId={project.org_id ?? ORG_ID}
            />
          </Section>

          <Section id="delete" title="Delete project" danger>
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              <span className="inline-block mr-1">⚠</span>
              Permanently delete project{" "}
              <strong>{project.name}</strong>. This action is not reversible.
              Proceed with caution.
            </p>
            <div className="mt-4">
              <DeleteConfirmDialog
                resourceName={project.name}
                resourceLabel="project"
                description="This will permanently delete the project, all branches, databases, and stored data. This action cannot be undone."
                action={async () => {
                  "use server";
                  await deleteProjectAction(id);
                }}
              />
            </div>
          </Section>
        </div>

        <div className="hidden lg:block">
          <SettingsNav items={SECTIONS.map((s) => ({ id: s.id, label: s.label }))} />
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  danger,
  children,
}: {
  id: string;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-6 rounded-lg border bg-card ${
        danger ? "border-destructive/30" : ""
      }`}
    >
      <header className="border-b px-5 py-3.5">
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
