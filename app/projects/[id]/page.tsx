import Link from "next/link";
import { neon } from "@/lib/neon";
import { getDatabaseAndRole } from "@/lib/sql";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mock } from "@/components/ui/mock";
import { ConnectButton } from "./connect-button";
import {
  Database,
  HardDrive,
  History,
  Camera,
  ArrowLeftRight,
  Share2,
  Info,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pRes, bRes] = await Promise.all([
    neon.getProject(id),
    neon.listProjectBranches({ projectId: id }),
  ]);
  const project = pRes.data.project;
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];

  // Default-branch endpoint (compute), used to show "Primary" pill if active
  const endpoints = await neon
    .listProjectBranchEndpoints(id, defaultBranch.id)
    .then((r) => r.data.endpoints);

  // Connection details for the default branch — used by the Connect modal.
  const { databaseName, roleName } = await getDatabaseAndRole(
    id,
    defaultBranch.id
  );
  const [pooledRes, unpooledRes] = await Promise.all([
    neon.getConnectionUri({
      projectId: id,
      branch_id: defaultBranch.id,
      database_name: databaseName,
      role_name: roleName,
      pooled: true,
    }),
    neon.getConnectionUri({
      projectId: id,
      branch_id: defaultBranch.id,
      database_name: databaseName,
      role_name: roleName,
      pooled: false,
    }),
  ]);

  // Metrics on the project payload itself
  const computeHrs = (project.compute_time_seconds ?? 0) / 3600;
  const storageGb = (project.data_storage_bytes_hour ?? 0) / (1024 ** 3) / 24;
  const historyGb = (project.history_retention_seconds ?? 0) ? 0 : 0;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Project dashboard</h1>
        <div className="flex items-center gap-2">
          <ConnectButton
            branchName={defaultBranch.name}
            databaseName={databaseName}
            roleName={roleName}
            pooledUri={pooledRes.data.uri}
            unpooledUri={unpooledRes.data.uri}
          />
          <Mock inline>
            <Button variant="outline" size="sm">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Import data
            </Button>
          </Mock>
          <Mock inline>
            <Button variant="outline" size="sm">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </Mock>
        </div>
      </div>

      <Card className="mb-5">
        <div className="grid grid-cols-5 divide-x">
          <Metric label="Compute" value={`${computeHrs.toFixed(1)} CU-hrs`} icon={TrendingUp} />
          <Metric label="Storage" value={`${storageGb.toFixed(2)} GB`} icon={HardDrive} />
          <Metric label="History" value={`${historyGb.toFixed(2)} GB`} icon={History} />
          <Metric label="Snapshots" value="0 GB" icon={Camera} />
          <Metric label="Network transfer" value="0 GB" icon={ArrowLeftRight} />
        </div>
        <div className="px-5 py-3 border-t text-xs text-muted-foreground">
          Usage since {new Date(project.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
          Metrics may be delayed by an hour and are not updated for inactive projects.
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Monitoring</div>
              <Mock inline label="Monitoring page is mocked">
                <span className="text-xs text-primary">View all metrics</span>
              </Mock>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Mock inline>
                <SmallSelect label="Branch" value={defaultBranch.name} active />
              </Mock>
              <Mock inline>
                <SmallSelect label="Compute" value={`${endpoints.length > 0 ? "Primary" : "—"}`} dot="idle" />
              </Mock>
              <Mock inline className="ml-auto">
                <Button variant="outline" size="sm">
                  <Refresh className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </Mock>
            </div>
          </CardHeader>
          <CardContent className="h-[220px] flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-7 w-7 mb-2 opacity-30" />
            <div className="text-sm">There is no data to display at the moment.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">
                {branches.length} / 5000 Branch
              </div>
              <Link href={`/projects/${id}/branches`} className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Primary compute</th>
                  <th className="px-4 py-2 font-medium">Created by</th>
                </tr>
              </thead>
              <tbody>
                {branches.slice(0, 4).map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <GitBranchIcon />
                        <span className="font-medium">{b.name}</span>
                        {b.default && <Badge variant="muted">Default</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Idle
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t">
              <Badge variant="muted">
                <Info className="h-3 w-3" />
                Preview Workflow
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                You don&apos;t have any preview branches yet. Improve your workflow by adding database
                branching to your development previews.
              </p>
              <Mock inline className="mt-2">
                <Button variant="outline" size="sm">
                  Install an integration
                </Button>
              </Mock>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Project settings</div>
              <Link
                href={`/projects/${id}/settings`}
                className="text-xs text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 text-sm">
            <SettingRow label="Region" value={project.region_id} />
            <SettingRow
              label="Default compute size"
              value={`${project.default_endpoint_settings?.autoscaling_limit_min_cu ?? 0.25} CU`}
            />
            <SettingRow
              label="History retention"
              value={`${Math.round((project.history_retention_seconds ?? 86400) / 86400)} day`}
            />
            <SettingRow label="Postgres version" value={String(project.pg_version)} />
            <SettingRow
              label="HIPAA compliance"
              value={
                <Badge variant="muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Disabled
                </Badge>
              }
              last
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <Info className="h-3 w-3 opacity-50" />
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function SmallSelect({
  label,
  value,
  active,
  dot,
}: {
  label: string;
  value: string;
  active?: boolean;
  dot?: "idle" | "active";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <button className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
        {dot && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              dot === "active" ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
        )}
        <span className="font-mono">{value}</span>
        {active && <Badge variant="muted">Default</Badge>}
      </button>
    </div>
  );
}

function SettingRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${last ? "" : "border-b"}`}>
      <div className="text-foreground">{label}</div>
      <div className="text-muted-foreground font-mono text-sm">{value}</div>
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-muted-foreground" fill="currentColor">
      <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 9a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6.75-6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-7 1.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm0 9a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm6.75-9a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM5.75 7a4.252 4.252 0 0 0 4.085 3.043l.04.001A.75.75 0 0 1 9.875 11.5l-.04-.001A5.752 5.752 0 0 1 4.25 7H5.75Z" />
    </svg>
  );
}

function Refresh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor">
      <path d="M2 8a6 6 0 0 1 10.243-4.243L11.5 4.5h2.25v-2.25l-.957.957A7.5 7.5 0 1 0 15.5 8h-1.5a6 6 0 1 1-12 0Z" />
    </svg>
  );
}
