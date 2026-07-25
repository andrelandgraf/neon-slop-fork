"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CreateProject } from "@/components/neon-ui/create-project";
import type { ServerRegion } from "@/components/neon-ui/region-select";
import { createProjectAction } from "@/app/actions";

/**
 * Bridges the `CreateProject` panel to `createProjectAction`.
 *
 * The panel is a controlled client form, so it can't post itself to a server
 * action the way the rest of the console's forms do. We rebuild the FormData
 * the action already expects, which keeps the action's contract — and every
 * other caller of it — untouched.
 */
export function NewProjectForm({
  regions,
  defaultRegionId,
  postgresVersions,
}: {
  regions: ServerRegion[];
  defaultRegionId: string;
  postgresVersions: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<{ name?: string; region?: string }>({});

  return (
    <CreateProject
      defaultPostgresVersion={postgresVersions[0]}
      defaultRegionId={defaultRegionId}
      errors={errors}
      isBusy={isPending}
      onCancel={() => router.push("/projects")}
      onSubmit={({ enableAuth, name, postgresVersion, regionId }) => {
        const trimmed = name.trim();
        if (!trimmed) {
          setErrors({ name: "Project name is required." });
          return;
        }
        setErrors({});

        const formData = new FormData();
        formData.set("name", trimmed);
        formData.set("region", regionId);
        formData.set("pg_version", postgresVersion);
        if (enableAuth) formData.set("enable_auth", "on");

        // On success the action redirects to the new project. Provisioning
        // failures throw, and — as with the plain form this replaces — the
        // route's error boundary is what surfaces them.
        startTransition(() => createProjectAction(formData));
      }}
      postgresVersions={postgresVersions}
      regions={regions}
    />
  );
}
