"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useBranchServices, useDataApis } from "@/components/live/project-live";
import { PageBody, PageHeader } from "@/components/page-header";
import type { LiveSeed } from "@/lib/live/load";
import type { BranchServiceRow, DataApiRow } from "@/lib/live/queries";
import { EnableDataApiCard } from "./enable-card";
import { DataApiOverview } from "./overview";

/**
 * The Data API page, switching between "Enable" and the overview as the
 * database's Data API comes and goes. The overview's table statistics come
 * from the server, so turning it on elsewhere asks for a fresh render.
 */
export function LiveDataApi({
  projectId,
  branchId,
  databaseName,
  project,
  branch,
  tables,
  dataApis: dataApisSeed,
  services: servicesSeed,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
  project: { id: string; name: string };
  branch: { id: string; name: string; default: boolean };
  tables: { total: number; withoutRls: number } | null;
  dataApis: LiveSeed<DataApiRow>;
  services: LiveSeed<BranchServiceRow>;
}) {
  const dataApis = useDataApis(branchId, dataApisSeed);
  const services = useBranchServices(branchId, servicesSeed);
  const api = useLiveQuery({
    query: (q) =>
      q.from({ d: dataApis }).where(({ d }) => and(eq(d.branch_id, branchId), eq(d.database_name, databaseName))),
  });
  const service = useLiveQuery({ query: (q) => q.from({ s: services }).where(({ s }) => eq(s.branch_id, branchId)) });
  const router = useRouter();
  const dataApi = api.data[0]?.data;
  const needsRender = Boolean(dataApi) && !tables;
  useEffect(() => {
    if (needsRender) router.refresh();
  }, [needsRender, router]);
  if (!dataApi) {
    return (
      <>
        <LiveStatus queries={[api, service]} />
        <EnableDataApiCard projectId={projectId} branchId={branchId} databaseName={databaseName} />
      </>
    );
  }
  return (
    <PageBody>
      <PageHeader title="Data API" project={project} branch={branch} />
      <LiveStatus queries={[api, service]} />
      {tables && (
        <DataApiOverview
          projectId={projectId}
          branchId={branchId}
          databaseName={databaseName}
          url={dataApi.url}
          authEnabled={Boolean(service.data[0]?.auth)}
          tables={tables}
        />
      )}
    </PageBody>
  );
}
