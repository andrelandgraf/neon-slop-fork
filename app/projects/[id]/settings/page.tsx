import { neon } from "@/lib/neon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  renameProjectAction,
  deleteProjectAction,
  updateIpAllowlistAction,
} from "@/app/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pRes = await neon.getProject(id);
  const project = pRes.data.project;

  const allowedIps = project.settings?.allowed_ips?.ips ?? [];
  const protectedOnly =
    project.settings?.allowed_ips?.protected_branches_only ?? false;

  return (
    <div className="px-8 py-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure your project. The project ID is permanent and cannot be
        changed.
      </p>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Change the project name or copy its ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={renameProjectAction} className="space-y-3">
              <input type="hidden" name="projectId" value={id} />
              <div className="space-y-1.5">
                <Label htmlFor="project-id">Project ID</Label>
                <Input
                  id="project-id"
                  value={project.id}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={project.name}
                  required
                  maxLength={64}
                />
              </div>
              <div className="flex justify-end">
                <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defaults</CardTitle>
            <CardDescription>Region, version, and retention.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Region" value={project.region_id} />
            <Field
              label="Postgres version"
              value={String(project.pg_version)}
            />
            <Field
              label="History retention"
              value={`${Math.round(
                (project.history_retention_seconds ?? 86400) / 3600
              )} hours`}
            />
            <Field
              label="Default compute size"
              value={`${
                project.default_endpoint_settings?.autoscaling_limit_min_cu ??
                0.25
              } CU`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IP allowlist</CardTitle>
            <CardDescription>
              Restrict who can reach the project&apos;s computes. Empty list
              means &ldquo;allow all&rdquo;. CIDR ranges are accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateIpAllowlistAction} className="space-y-3">
              <input type="hidden" name="projectId" value={id} />
              <div className="space-y-1.5">
                <Label htmlFor="ips">Allowed IPs</Label>
                <textarea
                  id="ips"
                  name="ips"
                  rows={4}
                  defaultValue={allowedIps.join("\n")}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder={`203.0.113.0/24\n198.51.100.42`}
                />
                <p className="text-[11px] text-muted-foreground">
                  One per line, comma- or whitespace-separated. Validation
                  happens server-side via the Neon API.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="protectedOnly"
                  defaultChecked={protectedOnly}
                />
                Apply only to protected branches
              </label>
              <div className="flex justify-end">
                <SubmitButton pendingLabel="Saving…">
                  Save allowlist
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Delete project</CardTitle>
            <CardDescription>
              Permanently delete this project and all of its branches,
              databases, and data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteConfirmDialog
              resourceName={project.name}
              resourceLabel="project"
              description="This will permanently delete the project, all branches, databases, and stored data. This action cannot be undone."
              action={async () => {
                "use server";
                await deleteProjectAction(id);
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="h-9 rounded-md border bg-muted/30 px-3 grid items-center font-mono text-xs">
        {value}
      </div>
    </div>
  );
}
