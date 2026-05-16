import Link from "next/link";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/app/actions";
import { ArrowLeft } from "lucide-react";

const REGIONS = [
  { id: "aws-us-east-1", label: "AWS US East 1 (N. Virginia)" },
  { id: "aws-us-east-2", label: "AWS US East 2 (Ohio)" },
  { id: "aws-us-west-2", label: "AWS US West 2 (Oregon)" },
  { id: "aws-eu-central-1", label: "AWS EU Central 1 (Frankfurt)" },
  { id: "aws-eu-west-2", label: "AWS EU West 2 (London)" },
  { id: "aws-ap-southeast-1", label: "AWS AP Southeast 1 (Singapore)" },
];

const PG_VERSIONS = ["17", "16", "15", "14"];

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="max-w-xl mx-auto px-6 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">New project</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Create a new Neon project in your organization. Defaults to a single primary
          compute on the latest Postgres version.
        </p>
        <form action={createProjectAction} className="space-y-5 border rounded-lg bg-card p-6">
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
              defaultValue="aws-us-east-2"
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
              defaultValue="17"
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
            <Button type="submit">Create project</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
