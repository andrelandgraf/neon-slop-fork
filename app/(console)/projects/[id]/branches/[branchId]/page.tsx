import Link from "next/link";
import {
  Database,
  Folder,
  LineChart,
  Sparkles,
  SquareFunction,
  UserRoundCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import { loadBranch } from "@/lib/project-context";
import { loadLive } from "@/lib/live/load";
import { ensureBranchMirrored } from "@/lib/mirror/sync";
import { BranchHeaderActions } from "./branch-header-actions";
import { NewBranchDialog } from "./new-branch-dialog";
import {
  AuthServiceDetail,
  BranchDetailsAside,
  FunctionsServiceDetail,
  PostgresServiceDetail,
  RealtimeServiceDetail,
  StorageServiceDetail,
} from "./overview-live";
import { ensureMirrored } from "@/lib/mirror/services";

export const dynamic = "force-dynamic";

export default async function BranchOverviewPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { tenant, project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  const live = { userId: tenant.session.user.id, orgId: tenant.activeOrg.id, projectId, branchId };
  await ensureBranchMirrored(projectId, branchId);
  const capabilities = await getProjectCapabilities(projectId, defaultBranch.id);
  await ensureMirrored({ kind: "services", projectId, branchId });
  const [databases, serviceState, buckets, functions] = await Promise.all([
    loadLive("databases", live),
    loadLive("branch-services", live),
    loadLive("buckets", live),
    loadLive("functions", live),
  ]);
  const seeds = { branchId, services: serviceState, buckets, functions };

  const base = `/projects/${projectId}/branches/${branchId}`;

  const services: {
    icon: LucideIcon;
    label: string;
    href: string;
    detail: React.ReactNode;
    show: boolean;
  }[] = [
    {
      icon: Database,
      label: "Postgres database",
      href: `${base}/databases`,
      detail: <PostgresServiceDetail branchId={branchId} databases={databases} />,
      show: true,
    },
    {
      icon: UserRoundCheck,
      label: "Better Auth",
      href: `${base}/auth`,
      detail: <AuthServiceDetail base={base} {...seeds} />,
      show: true,
    },
    {
      icon: Folder,
      label: "Object storage",
      href: `${base}/storage`,
      detail: <StorageServiceDetail {...seeds} />,
      show: capabilities.storage,
    },
    {
      icon: SquareFunction,
      label: "Functions",
      href: `${base}/functions`,
      detail: <FunctionsServiceDetail {...seeds} />,
      show: capabilities.functions,
    },
    {
      icon: Sparkles,
      label: "AI Gateway",
      href: `${base}/ai-gateway`,
      detail: "Access AI models from OpenAI, Anthropic, Google, and more",
      show: capabilities.aiGateway,
    },
    {
      icon: Zap,
      label: "Realtime",
      href: `${base}/realtime`,
      detail: <RealtimeServiceDetail {...seeds} />,
      show: capabilities.realtime,
    },
  ];

  return (
    <PageBody>
      <NewBranchDialog
        projectId={projectId}
        branchId={branchId}
        branchName={branch.name}
        expiresAt={branch.expires_at}
      />
      <PageHeader
        title="Branch overview"
        project={project}
        branch={branch}
        actions={<BranchHeaderActions key={branch.id} projectId={projectId} branchId={branchId} />}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-[3px] border border-panel-border">
            <table className="w-full text-sm">
              <thead className="bg-table-head text-left">
                <tr>
                  <th className="w-[38%] px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Description / Details</th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((s) => s.show)
                  .map((service) => (
                    <tr key={service.label} className="border-panel-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={service.href}
                          className="flex items-center gap-2.5 font-semibold hover:underline"
                        >
                          <span className="grid size-6 place-items-center rounded-[3px] bg-muted">
                            <service.icon className="size-3.5" />
                          </span>
                          {service.label}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{service.detail}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-[3px] border border-panel-border">
            <div className="px-4 py-3 font-semibold">Postgres Monitoring</div>
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm">
              <LineChart className="size-4 text-muted-foreground" />
              There is no data to display at the moment.
              <span className="max-w-sm text-center text-muted-foreground text-xs">
                Compute and RAM charts come from Neon's internal metrics, which
                the public API doesn't expose.
              </span>
            </div>
          </div>
        </div>
        <BranchDetailsAside projectId={projectId} branchId={branchId} />
      </div>
    </PageBody>
  );
}

