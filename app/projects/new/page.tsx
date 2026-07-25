import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { requireTenant } from "@/lib/tenancy";
import { DEFAULT_REGION_ID, listRegions, PG_VERSIONS } from "@/lib/regions";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const tenant = await requireTenant("/projects/new");
  const regions = await listRegions();
  const defaultRegionId =
    regions.find((region) => region.id === DEFAULT_REGION_ID)?.id ??
    regions[0]?.id ??
    DEFAULT_REGION_ID;

  return (
    <div className="min-h-screen bg-background">
      <TopBar tenant={tenant} />
      {/* The panel is container-query driven: it only reveals the globe past
          ~48rem, and frames it without a hard crop past ~64rem. Sizing the
          column to clear the wider threshold matches the Console's dialog. */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Projects
        </Link>
        <NewProjectForm
          defaultRegionId={defaultRegionId}
          postgresVersions={PG_VERSIONS}
          regions={regions}
        />
        <p className="mt-4 text-pretty text-muted-foreground text-sm">
          Creating in <strong>{tenant.activeOrg.name}</strong>. Default compute
          is a single read/write endpoint that scales to zero when idle.
        </p>
      </main>
    </div>
  );
}
