import { neon } from "@/lib/neon";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { renameProjectAction, deleteProjectAction } from "@/app/actions";
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

  return (
    <div className="px-8 py-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure your project. The project ID is permanent and cannot be changed.
      </p>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Change the project name or copy its ID.</CardDescription>
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
                <Button type="submit">Save changes</Button>
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
            <Field label="Postgres version" value={String(project.pg_version)} />
            <Field
              label="History retention"
              value={`${Math.round((project.history_retention_seconds ?? 86400) / 86400)} day`}
            />
            <Field
              label="Default compute size"
              value={`${project.default_endpoint_settings?.autoscaling_limit_min_cu ?? 0.25} CU`}
            />
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Delete project</CardTitle>
            <CardDescription>
              Permanently delete this project and all of its branches, databases, and
              data. This action cannot be undone.
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
