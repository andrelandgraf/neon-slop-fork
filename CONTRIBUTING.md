# Contributing

```bash
bun install
neon link --project-id bitter-dawn-83086481
neon branches create --name dev-<you> --parent main
neon checkout dev-<you>
```

Work on your own branch: it copies production data and inherits Realtime.

`.neon` is gitignored and records which Neon project this checkout points at.

`neon checkout` writes `DATABASE_URL`, `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` to `.env.local`. Add the names the app reads to the same file (Next.js only expands `$VAR` within one file, and `neon env pull` keeps these lines):

```bash
META_DATABASE_URL=$DATABASE_URL_UNPOOLED
NEXT_PUBLIC_NEON_REALTIME_URL=$NEON_REALTIME_URL
```

Put the rest in `.env.development.local`:

```bash
NEON_API_KEY=               # org-level key for the Neon Clone org
NEON_ORG_ID=org-nameless-thunder-12993511
NEON_ORG_NAME="Neon Clone"
BETTER_AUTH_SECRET=         # 32+ characters
BETTER_AUTH_URL=http://localhost:3030
```

```bash
bun run dev
# http://localhost:3030
```

Checks before a PR:

```bash
bun run typecheck
bun test lib/
bun run build
```

Changing `lib/db/schema.ts` means running `META_DATABASE_URL=<your branch URL> bunx drizzle-kit push` against your branch. Production needs the same push before the deploy that depends on it.

## How live views work

- Most console state lives in the Neon API, so the control database
  mirrors what the live views render (`neon_project`, `neon_branch`,
  `neon_endpoint`, `neon_operation`, `neon_database`, `neon_role`, and the
  app-backend tables `neon_branch_service`, `neon_data_api`, `neon_bucket`,
  `neon_function`, `neon_trigger`, `neon_custom_domain`, `neon_credential`,
  `neon_snapshot`, `neon_snapshot_schedule`, `neon_project_permission`,
  `neon_masking_status`). Secrets are never stored: role passwords,
  credential secrets and Realtime secrets only appear in one-time responses,
  and function deployments are stored without their environment. While a Neon operation a write started is
  still running, the project keeps re-syncing, so states like a starting
  compute move on screen.
  Server actions update the mirror after each Neon API write, and every
  sealed-query renewal (about once a minute per open view) reconciles the
  org from the Neon API, at most once per 20 seconds.
- `lib/live/queries.ts` holds one Drizzle query per collection. The server
  render reads it and seals it; the browser subscribes and renews through
  `POST /api/live/<collection>`. Authorization is part of each query, so
  losing membership or ownership drops the rows live.
- Renewals and live writes carry the user and org the page was rendered
  for. A different session or active org answers 401, and the page reloads.
- The Tables page seals `SELECT * FROM <table> ORDER BY <primary key>
  LIMIT/OFFSET` with the tenant branch's Realtime secret, fetched from the
  Neon API on each seal, and renews through `POST /api/live/table-rows`,
  which rebuilds the SQL from the catalog. Both the server render and the
  live rows keep every value as Postgres text, so cells don't change when
  the subscription takes over. It needs the console's origin in the
  branch's Realtime allowed origins, or the list empty.

## Deploy

The included `vercel.json` uses `npm install --legacy-peer-deps` + `npx next
build` so bun isn't required on the build host. Set the env vars from the setup above in
your Vercel project, with `NEON_REALTIME_SECRET` and
`NEXT_PUBLIC_NEON_REALTIME_URL` from the control database's `main` branch.
When `lib/db/schema.ts` changed, push the schema to the production control
database before deploying, and fill the live mirror once:

```bash
META_DATABASE_URL=<production control database URL> bunx drizzle-kit push
META_DATABASE_URL=<...> NEON_API_KEY=<...> bun --conditions=react-server scripts/backfill-mirror.ts --apply
vercel deploy --prod
```
