import Link from "next/link";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/app/actions";
import { requireTenant } from "@/lib/tenancy";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const REGIONS = [
  { id: "aws-us-east-1", label: "AWS US East 1 (N. Virginia)" },
  { id: "aws-us-east-2", label: "AWS US East 2 (Ohio)" },
  { id: "aws-us-west-2", label: "AWS US West 2 (Oregon)" },
  { id: "aws-ap-southeast-1", label: "AWS Asia Pacific 1 (Singapore)" },
  { id: "aws-ap-southeast-2", label: "AWS Asia Pacific 2 (Sydney)" },
  { id: "aws-eu-central-1", label: "AWS Europe Central 1 (Frankfurt)" },
  { id: "aws-eu-west-2", label: "AWS Europe West 2 (London)" },
  { id: "aws-sa-east-1", label: "AWS South America East 1 (São Paulo)" },
];

const PG_VERSIONS = ["18", "17", "16", "15", "14"];

export default async function NewProjectPage() {
  const tenant = await requireTenant("/projects/new");
  return (
    <div className="min-h-screen bg-background">
      <TopBar tenant={tenant} />
      <main className="max-w-xl mx-auto px-6 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          New project
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Create a new Neon project in the{" "}
          <strong>{tenant.activeOrg.name}</strong> workspace. Default compute
          is a single read/write endpoint on the latest Postgres version.
        </p>
        <form
          action={createProjectAction}
          className="space-y-5 border rounded-lg bg-card p-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              required
              autoFocus
              placeholder="my-app"
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <select
              id="region"
              name="region"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              defaultValue="aws-us-east-1"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg_version">Postgres version</Label>
            <select
              id="pg_version"
              name="pg_version"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              defaultValue="18"
            >
              {PG_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button asChild variant="outline">
              <Link href="/projects">Cancel</Link>
            </Button>
            <SubmitButton pendingLabel="Provisioning…">
              Create project
            </SubmitButton>
          </div>
        </form>
      </main>
    </div>
  );
}
