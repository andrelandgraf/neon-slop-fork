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
