"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { Badge } from "@/components/ui/badge";
import { LiveStatus } from "@/components/live/live-status";
import { useCredentials } from "@/components/live/project-live";
import { LocalTime } from "@/components/local-time";
import type { LiveSeed } from "@/lib/live/load";
import type { CredentialRow } from "@/lib/live/queries";
import { CredentialRowActions } from "./credential-row-actions";

const day = (d: Date) => d.toLocaleDateString("en-US");

/** The branch's credentials (metadata only), newest first; live. */
export function CredentialsTable({
  projectId,
  branchId,
  credentials: seed,
}: {
  projectId: string;
  branchId: string;
  credentials: LiveSeed<CredentialRow>;
}) {
  const collection = useCredentials(branchId, seed);
  const query = useLiveQuery((q) => q.from({ c: collection }));
  const credentials = query.data
    .map((row) => row.data)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <LiveStatus queries={[query]} />
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            {["Name", "Key ID", "Created", "Last used", "Revoked", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {credentials.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                No credentials on this branch yet.
              </td>
            </tr>
          )}
          {credentials.map((cred) => (
            <tr key={cred.token_id} className="border-panel-border border-b">
              <td className="px-3 py-2.5">
                <div className="font-semibold">{cred.name ?? "—"}</div>
                <div className="text-muted-foreground text-xs" title={cred.scopes.join(", ")}>
                  {cred.scopes.length} scope{cred.scopes.length === 1 ? "" : "s"}
                </div>
              </td>
              <td className="px-3 py-2.5 font-mono text-xs">{cred.token_id_short}</td>
              <td className="px-3 py-2.5">
                <LocalTime date={new Date(cred.created_at)} format={day} />
              </td>
              <td className="px-3 py-2.5">
                {cred.last_used_at ? <LocalTime date={new Date(cred.last_used_at)} format={day} /> : "-"}
              </td>
              <td className="px-3 py-2.5">{cred.revoked_at ? <Badge variant="destructive">Revoked</Badge> : "-"}</td>
              <td className="px-2 py-2.5 text-right">
                {!cred.revoked_at && (
                  <CredentialRowActions
                    projectId={projectId}
                    branchId={branchId}
                    tokenId={cred.token_id}
                    name={cred.name ?? cred.token_id_short}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
