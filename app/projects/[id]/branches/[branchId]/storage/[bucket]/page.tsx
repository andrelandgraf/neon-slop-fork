import Link from "next/link";
import { Folder, FileText } from "lucide-react";
import { ConnectDialog } from "@/components/connect/connect-dialog";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities, requireCapability } from "@/lib/capabilities";
import { neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { ObjectToolbar } from "./object-toolbar";
import { ObjectRowActions } from "./object-row-actions";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default async function BucketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; branchId: string; bucket: string }>;
  searchParams: Promise<{ prefix?: string }>;
}) {
  const { id: projectId, branchId, bucket: bucketParam } = await params;
  const bucketName = decodeURIComponent(bucketParam);
  const { prefix = "" } = await searchParams;
  const { project, branch: activeBranch, defaultBranch } = await loadBranch(projectId, branchId);
  await requireCapability(projectId, defaultBranch.id, "storage");

  const storageHref = `/projects/${projectId}/branches/${branchId}/storage`;
  const baseHref = `${storageHref}/${encodeURIComponent(bucketName)}`;

  const [listing, capabilities] = await Promise.all([
    neonSdk.storage.objects.list({ projectId, branchId, bucketName, prefix, delimiter: "/" }),
    getProjectCapabilities(projectId, defaultBranch.id),
  ]);

  // Objects whose key === prefix are folder markers for this level — hide them.
  const objects = listing.objects.filter((o) => o.key !== prefix);
  const isEmpty = listing.folders.length === 0 && objects.length === 0;

  const segments = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  return (
    <PageBody>
      <PageHeader title={bucketName} project={project} branch={activeBranch} />

      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link href={storageHref} className="text-link hover:underline">
            Buckets
          </Link>
          <span>/</span>
          <Link
            href={baseHref}
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            {bucketName}
          </Link>
          {segments.map((seg, i) => {
            const p = `${segments.slice(0, i + 1).join("/")}/`;
            return (
              <span key={p} className="inline-flex items-center gap-1.5 min-w-0">
                <span>/</span>
                <Link
                  href={`${baseHref}?prefix=${encodeURIComponent(p)}`}
                  className="hover:text-foreground truncate"
                >
                  {seg}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <ConnectDialog
            projectId={projectId}
            branchId={branchId}
            capabilities={capabilities}
            variant="outline"
            initialTab="storage"
          />
          <ObjectToolbar
            projectId={projectId}
            branchId={activeBranch.id}
            bucketName={bucketName}
            prefix={prefix}
          />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Folder className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">This folder is empty</p>
            <p className="text-xs text-muted-foreground">
              Use Upload to add files, or New folder to create a subfolder.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-table-head text-left">
                <th className="font-semibold px-4 py-2.5">Name</th>
                <th className="font-semibold px-4 py-2.5">Size</th>
                <th className="font-semibold px-4 py-2.5">Last modified</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {listing.folders.map((folder) => {
                const name = folder.replace(prefix, "").replace(/\/$/, "");
                return (
                  <tr key={folder} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5" colSpan={3}>
                      <Link
                        href={`${baseHref}?prefix=${encodeURIComponent(folder)}`}
                        className="inline-flex items-center gap-2 font-medium hover:text-primary"
                      >
                        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                );
              })}
              {objects.map((obj) => {
                const name = obj.key.replace(prefix, "");
                return (
                  <tr key={obj.key} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatBytes(obj.size)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(obj.last_modified).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ObjectRowActions
                        projectId={projectId}
                        branchId={activeBranch.id}
                        bucketName={bucketName}
                        objectKey={obj.key}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageBody>
  );
}
