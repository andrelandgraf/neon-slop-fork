# Contributing

```bash
bun install
neon link
neon checkout main
```

`.neon` is gitignored and records which Neon project this checkout points at.

`neon checkout` writes `DATABASE_URL` to `.env.local`. The app still reads `META_DATABASE_URL` for the meta database, so copy that value. Local runs also need:

```bash
META_DATABASE_URL=          # same value as DATABASE_URL
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
