import { KeyRound, ExternalLink } from "lucide-react";
import {
  neon,
  type CredentialMeta,
  type BranchStorage,
} from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { CreateCredentialDialog } from "./create-credential-dialog";
import { CredentialRowActions } from "./credential-row-actions";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/credentials`
 *
 * Mirrors console.neon.tech's per-branch Credentials screen. A credential is
 * a branch-scoped key carrying a set of scopes: Storage scopes issue an S3
 * access key + secret, AI Gateway scopes issue a bearer API token. The secret
 * is shown exactly once at creation.
 */
export default async function CredentialsPage({
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

  const [credentials, storage] = await Promise.all([
    neon
      .listCredentials(projectId, activeBranch.id)
      .then((r) => r.data.credentials)
      .catch(() => [] as CredentialMeta[]),
    neon
      .getBranchStorage(projectId, activeBranch.id)
      .then((r) => r.data)
      .catch(() => null as BranchStorage | null),
  ]);

  const createDialog = (
    <CreateCredentialDialog
      projectId={projectId}
      branchId={activeBranch.id}
      s3Endpoint={storage?.s3_endpoint ?? ""}
      region={storage?.region ?? "us-east-1"}
    />
  );

  if (credentials.length === 0) {
    return (
      <div className="px-8 py-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <CredentialsDiagram />
          <h2 className="mt-8 text-xl font-semibold tracking-tight">
            Create a credential to access this branch. Grant Storage scopes for
            an S3 access key and secret, or AI Gateway scopes for an AI API
            token.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Secrets are shown only once at creation, so copy them somewhere safe.
          </p>
          <div className="mt-6">{createDialog}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Credentials
        </h1>
        <Badge variant="muted">Beta</Badge>
        <Badge variant="muted">{activeBranch.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Credentials for this branch, scoped per service. Use them as S3 access
        keys for Storage, or as an API token (Bearer) for AI Gateway. Each
        credential carries only the scopes you grant.{" "}
        <a
          href="https://neon.com/docs/storage/get-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Learn more <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      <div className="flex justify-end mb-3">{createDialog}</div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="font-medium px-4 py-2.5">Name</th>
              <th className="font-medium px-4 py-2.5">Key ID</th>
              <th className="font-medium px-4 py-2.5">Created</th>
              <th className="font-medium px-4 py-2.5">Last used</th>
              <th className="font-medium px-4 py-2.5">Revoked</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {credentials.map((cred) => (
              <tr key={cred.token_id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cred.name ?? "—"}</span>
                    <Badge variant="muted">
                      {cred.scopes.length} scope{cred.scopes.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {cred.token_id_short}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(cred.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {cred.last_used_at
                    ? new Date(cred.last_used_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {cred.revoked_at ? (
                    <Badge variant="warn">Revoked</Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!cred.revoked_at && (
                    <CredentialRowActions
                      projectId={projectId}
                      branchId={activeBranch.id}
                      tokenId={cred.token_id}
                      name={cred.name ?? cred.token_id_short}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Credentials figure: credentials gating AI Gateway + object storage for an app. */
function CredentialsDiagram() {
  return (
    <div className="rounded-lg border bg-muted/20 p-5">
      <div className="rounded-md border bg-background p-3">
        <div className="text-left text-[11px] text-muted-foreground mb-2">
          Production branch
        </div>
        <div className="flex items-center gap-2">
          <DiagramBox className="w-24">AI Gateway</DiagramBox>
          <DiagramBox className="w-24">Object storage</DiagramBox>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <DiagramBox className="w-24">Credential</DiagramBox>
          <DiagramBox className="w-24">Credential</DiagramBox>
        </div>
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
