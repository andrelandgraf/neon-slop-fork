"use client";
import { createContext, useContext, useState } from "react";
import { createRealtimeClient } from "@neon/realtime/client";
import { drizzleParsers } from "@neon/realtime-drizzle/client";
import { DbClient, DbProvider } from "@tanstack/react-db";
import { orgsCollection, projectsCollection } from "@/lib/live/collections";
import type { LiveSeed } from "@/lib/live/load";
import type { OrgRow, ProjectRow } from "@/lib/live/queries";
import type { PageIdentity } from "@/lib/tenancy";

const REALTIME_URL = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;

type ShellCollections = {
  orgs: ReturnType<typeof seedOrgs>;
  projects: ReturnType<typeof seedProjects>;
};

const IdentityContext = createContext<PageIdentity | null>(null);
const ShellContext = createContext<ShellCollections | null>(null);

function seedOrgs(db: DbClient, identity: PageIdentity, seed: LiveSeed<OrgRow>) {
  return db.collection(orgsCollection(identity, seed.sealedQuery), { initialData: seed.initialData });
}

function seedProjects(db: DbClient, identity: PageIdentity, seed: LiveSeed<ProjectRow>) {
  return db.collection(projectsCollection(identity, seed.sealedQuery), { initialData: seed.initialData });
}

/**
 * One Realtime connection and one TanStack DB client per page load. Created
 * in a state initializer so the server render builds its own and never
 * connects: nothing subscribes until the browser mounts a live query.
 */
export function LiveRoot({
  identity,
  orgs,
  projects,
  children,
}: {
  identity: PageIdentity;
  orgs: LiveSeed<OrgRow>;
  projects: LiveSeed<ProjectRow>;
  children: React.ReactNode;
}) {
  const [state] = useState(() => {
    if (!REALTIME_URL) throw new Error("NEXT_PUBLIC_NEON_REALTIME_URL is not set. See README.");
    const realtime = createRealtimeClient({ url: REALTIME_URL, parsers: { ...drizzleParsers } });
    const db = new DbClient({ realtime });
    return {
      db,
      shell: { orgs: seedOrgs(db, identity, orgs), projects: seedProjects(db, identity, projects) },
    };
  });
  return (
    <DbProvider client={state.db}>
      <IdentityContext.Provider value={identity}>
        <ShellContext.Provider value={state.shell}>{children}</ShellContext.Provider>
      </IdentityContext.Provider>
    </DbProvider>
  );
}

/** The user and org this page was rendered for. */
export function useIdentity(): PageIdentity {
  const identity = useContext(IdentityContext);
  if (!identity) throw new Error("useIdentity must be used inside <LiveRoot>.");
  return identity;
}

/** The org list and the active org's projects, live on every page. */
export function useShellCollections(): ShellCollections {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShellCollections must be used inside <LiveRoot>.");
  return shell;
}
