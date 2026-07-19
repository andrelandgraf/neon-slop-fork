import Link from "next/link";
import { Folder, FileText } from "lucide-react";
import { neon, type BranchStorage } from "@/lib/neon";
import { StorageConnectDialog } from "../storage-connect-dialog";
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
  params: Promise<{ id: string; bucket: string }>;
  searchParams: Promise<{ branch?: string; prefix?: string }>;
}) {
  const { id: projectId, bucket: bucketParam } = await params;
  const bucketName = decodeURIComponent(bucketParam);
  const { branch: branchParam, prefix = "" } = await searchParams;

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const branchQ = branchParam ? `&branch=${branchParam}` : "";
  const baseHref = `/projects/${projectId}/storage/${encodeURIComponent(bucketName)}`;

  const [listing, storage] = await Promise.all([
    neon
      .listBucketObjects(projectId, activeBranch.id, bucketName, {
        prefix,
        delimiter: "/",
      })
      .then((r) => r.data)
      .catch(() => ({ folders: [], objects: [], prefix, is_truncated: false })),
    neon
      .getBranchStorage(projectId, activeBranch.id)
      .then((r) => r.data)
      .catch(() => null as BranchStorage | null),
  ]);

  // Objects whose key === prefix are folder markers for this level — hide them.
  const objects = listing.objects.filter((o) => o.key !== prefix);
  const isEmpty = listing.folders.length === 0 && objects.length === 0;

  const segments = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  return (
    <div className="px-8 py-6 max-w-4xl">
      <h1 className="text-xl font-semibold">{bucketName}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Objects in this bucket. Open a folder to browse its contents.
      </p>

      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <Link href={`/projects/${projectId}/storage${branchParam ? `?branch=${branchParam}` : ""}`} className="hover:text-foreground">
            Buckets
          </Link>
          <span>/</span>
          <Link
            href={`${baseHref}${branchParam ? `?branch=${branchParam}` : ""}`}
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
                  href={`${baseHref}?prefix=${encodeURIComponent(p)}${branchQ}`}
                  className="hover:text-foreground truncate"
                >
                  {seg}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <StorageConnectDialog
            branchName={activeBranch.name}
            storage={storage}
            bucketName={bucketName}
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
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="font-medium px-4 py-2.5">Name</th>
                <th className="font-medium px-4 py-2.5">Size</th>
                <th className="font-medium px-4 py-2.5">Last modified</th>
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
                        href={`${baseHref}?prefix=${encodeURIComponent(folder)}${branchQ}`}
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
    </div>
  );
}
