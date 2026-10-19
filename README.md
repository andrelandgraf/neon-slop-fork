# Neon Clone (aka. Slop Fork)

A community-built clone of the [Neon](https://neon.com) Postgres console,
built on top of the public Neon REST API. Same console you know, open all
the way down.

> **Note:** this is an unofficial project, not affiliated with Neon. It exists
> to demonstrate how much of the console you can rebuild against the public
> API — and to make a faithful, open reference implementation for anyone
> writing dashboards, agents, or CLIs against Neon.

## What's in here

The layout follows the current Console: a top bar with the command bar
(`⌘K`) and account menu, an org sidebar, and a project sidebar with a
branch switcher and the Connect button.

Views update live with [Neon Realtime](https://neon.com/docs/realtime/overview):
a project created, renamed, transferred or deleted in one tab shows up in
every other open tab of the org without a reload, including the "Creating
project" state while it's being set up. The org list, org name, members,
projects list, project switcher and billing usage read TanStack DB
collections synced from sealed live queries over the control database.

Organization:

- **Projects**: list, create, and delete projects. Create opens the Console's
  two-step modal: project name, Postgres version, region, and services, then
  an agent prompt, a `neon init` command, and an `.env` with generated keys.
- **People**, **Billing**, **Integrations**, **Settings**: members, usage from
  the Neon API, integration links, and the org name.
- Account menu: switch organization, create an organization, theme, log out.

Project, scoped to a branch at `/projects/<id>/branches/<branchId>/<page>`:

- **Overview**: branch details, services, and branch actions (rename, set
  default, protect, expire, reset from parent, delete).
- **Computes**, **Roles**, **Databases**: edit compute size and name, add
  read replicas, create and delete roles and databases.
- **Realtime**: enable, disable, reveal and rotate the secret, agent prompt.
- **Data API**, **Auth**: enable and configure both; Auth lists users from
  `neon_auth."user"`.
- **Storage**: buckets and objects, with upload, download, and presigned URLs.
- **Functions**: deployed functions, cron triggers, custom domains.
- **AI Gateway**: model catalog from `neon.com/models.json` and per-SDK setup.
- **Backup & Restore**: point-in-time restore of the current branch, snapshots
  and snapshot schedules.
- **Data Masking**: anonymized branches with per-column masking rules.
- **Monitoring**: active queries, query performance, operations, and Postgres,
  function, storage, and Realtime logs.
- **SQL Editor**, **Tables**.

Project-level pages take `?branch=<branchId>` and fall back to the default
branch: **Branches** (create from current data, a past time, schema only, or
anonymized), **Integrations**, and **Settings** (general, Postgres, networking,
credentials, Auth, Functions, HIPAA, permissions).

Old routes such as `/projects/<id>/sql?branch=<branchId>` redirect to
their new location.

Regions without the app backend (Storage, Functions, AI Gateway, Realtime)
hide those pages. The Neon Clone org is on the Free plan, so AI Gateway
requests and snapshot schedules return Neon's paid-plan errors.

### Disabled / mocked

Disabled controls carry a tooltip explaining why:

- **Ask AI** in the top bar and account settings, which live on
  console.neon.tech.
- Org **Billing** shows usage but no plan management. Org **People** can't
  send invites, org **API keys** and **Delete organization** are disabled, and
  org **Integrations** link out instead of installing.
- **Monitoring** compute charts and Data API advisories: Neon computes these
  internally and the public API doesn't return them.
- Auth **email provider** SMTP credentials are read-only.

## Configuration

The control database is a Neon project on Postgres 18 with Realtime enabled,
maintained through `neon.ts` and the `neon` CLI. Project:
`bitter-dawn-83086481` (`neon-slop-fork-control`) in org
`org-nameless-thunder-12993511`.

```bash
neon link --project-id bitter-dawn-83086481
neon checkout main
```

That writes `.neon` (gitignored) and pulls `DATABASE_URL`,
`NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` into `.env.local`.

App runtime env is separate; the CLI doesn't produce these:

```bash
META_DATABASE_URL=$DATABASE_URL_UNPOOLED   # the app reads this name
NEXT_PUBLIC_NEON_REALTIME_URL=$NEON_REALTIME_URL
NEON_API_KEY=<org-level Neon API key>
NEON_ORG_ID=org-nameless-thunder-12993511
NEON_ORG_NAME="Neon Clone"
BETTER_AUTH_SECRET=<32+ character secret>
BETTER_AUTH_URL=http://localhost:3030
```

Next.js expands `$VAR` across env files, so these can live in
`.env.development.local` next to the pulled `.env.local`.

### How live views work

- Most console state lives in the Neon API, so the control database
  mirrors what the live views render (`neon_project`, `neon_branch`).
  Server actions update the mirror after each Neon API write, and every
  sealed-query renewal (about once a minute per open view) reconciles the
  org from the Neon API, at most once per 20 seconds.
- `lib/live/queries.ts` holds one Drizzle query per collection. The server
  render reads it and seals it; the browser subscribes and renews through
  `POST /api/live/<collection>`. Authorization is part of each query, so
  losing membership or ownership drops the rows live.
- Renewals and live writes carry the user and org the page was rendered
  for. A different session or active org answers 401, and the page reloads.
## Local dev

```bash
bun install
neon link
neon checkout main
bun run dev
# http://localhost:3030
```

## Deploy

The included `vercel.json` uses `npm install --legacy-peer-deps` + `npx next
build` so bun isn't required on the build host. Set the env vars above in
your Vercel project, with `NEON_REALTIME_SECRET` and
`NEXT_PUBLIC_NEON_REALTIME_URL` from the control database's `main` branch.
When `lib/db/schema.ts` changed, push the schema to the production control
database before deploying, and fill the live mirror once:

```bash
META_DATABASE_URL=<production control database URL> bunx drizzle-kit push
META_DATABASE_URL=<...> NEON_API_KEY=<...> bun --conditions=react-server scripts/backfill-mirror.ts --apply
vercel deploy --prod
```

## Stack

- [Next.js 15](https://nextjs.org/) App Router on Node.js
- [@neon/sdk](https://www.npmjs.com/package/@neon/sdk) for the control-plane
- [@neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless)
  for SQL queries
- [Neon Realtime](https://neon.com/docs/realtime/overview) (`@neon/realtime`,
  `@neon/realtime-drizzle`, `@neon/realtime-tanstack`) and
  [TanStack DB](https://tanstack.com/db) for live views
- Tailwind CSS v4, shadcn/ui, Radix UI and Base UI primitives
- Lucide icons
- Sonner for toasts
