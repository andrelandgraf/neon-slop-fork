import Link from "next/link";
import { HardDrive, ExternalLink, Lock, Globe } from "lucide-react";
import { neon, type Bucket, type BranchStorage } from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { CreateBucketDialog } from "./create-bucket-dialog";
import { StorageConnectDialog } from "./storage-connect-dialog";
import { BucketRowActions } from "./bucket-row-actions";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/storage`
 *
 * Mirrors console.neon.tech's per-branch Storage screen. Object storage is
 * S3-compatible and branch-scoped: buckets hold objects, and any S3 client
 * connects using a Neon credential's access key. We list the branch's buckets
 * and let the user create/delete them and browse each one.
 */
export default async function StoragePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const [buckets, storage] = await Promise.all([
    neon
      .listBuckets(projectId, activeBranch.id)
      .then((r) => r.data.buckets)
      .catch(() => [] as Bucket[]),
    neon
      .getBranchStorage(projectId, activeBranch.id)
      .then((r) => r.data)
      .catch(() => null as BranchStorage | null),
  ]);

  const branchQuery = branchParam ? `?branch=${branchParam}` : "";

  if (buckets.length === 0) {
    return (
      <div className="px-8 py-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <StorageDiagram />
          <h2 className="mt-8 text-xl font-semibold tracking-tight">
            S3-compatible storage. Create buckets, then connect with any S3
            client using a Neon API key.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Buckets are containers for your objects. You can have many per
            project, group them by purpose (assets, exports, backups) and set a
            visibility for each.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <StorageConnectDialog
              branchName={activeBranch.name}
              storage={storage}
              bucketName="my-bucket"
            />
            <CreateBucketDialog
              projectId={projectId}
              branchId={activeBranch.id}
              branchName={activeBranch.name}
              region={storage?.region ?? "aws-us-east-1"}
              triggerLabel="Create your first bucket"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          Storage
        </h1>
        <Badge variant="muted">Beta</Badge>
        <Badge variant="muted">{activeBranch.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        S3-compatible object storage for this project. Create buckets, then
        connect with any S3 client using a Neon API key.{" "}
        <a
          href="https://neon.com/docs/storage/get-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Learn more <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      <div className="flex items-center justify-end gap-2 mb-3">
        <StorageConnectDialog
          branchName={activeBranch.name}
          storage={storage}
          bucketName={buckets[0]?.name ?? "my-bucket"}
        />
        <CreateBucketDialog
          projectId={projectId}
          branchId={activeBranch.id}
          branchName={activeBranch.name}
          region={storage?.region ?? "aws-us-east-1"}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="font-medium px-4 py-2.5">Name</th>
              <th className="font-medium px-4 py-2.5">Visibility</th>
              <th className="font-medium px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.name} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/projects/${projectId}/storage/${encodeURIComponent(bucket.name)}${branchQuery}`}
                    className="inline-flex items-center gap-2 font-medium hover:text-primary"
                  >
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    {bucket.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {bucket.access_level === "public_read" ? (
                      <>
                        <Globe className="h-3.5 w-3.5" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Private
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(bucket.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <BucketRowActions
                    projectId={projectId}
                    branchId={activeBranch.id}
                    bucketName={bucket.name}
                    href={`/projects/${projectId}/storage/${encodeURIComponent(bucket.name)}${branchQuery}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The console's storage figure: object storage + function feeding an app. */
function StorageDiagram() {
  return (
    <div className="rounded-lg border bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-md border bg-background p-3">
          <div className="text-left text-[11px] text-muted-foreground mb-2">
            Production branch
          </div>
          <div className="space-y-2">
            <DiagramBox className="w-28">Object Storage</DiagramBox>
            <DiagramBox className="w-28">Function</DiagramBox>
          </div>
        </div>
        <span className="text-muted-foreground">&rarr;</span>
        <DiagramBox className="w-16">App</DiagramBox>
      </div>
    </div>
  );
}

function DiagramBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded border bg-muted/40 py-1.5 text-center font-mono text-[11px] text-foreground/80 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
