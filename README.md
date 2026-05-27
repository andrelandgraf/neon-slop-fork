# Neon Clone (aka. Slop Fork)

A community-built clone of the [Neon](https://neon.com) Postgres console,
built on top of the public Neon REST API. Same console you know, open all
the way down.

> **Note:** this is an unofficial project, not affiliated with Neon. It exists
> to demonstrate how much of the console you can rebuild against the public
> API — and to make a faithful, open reference implementation for anyone
> writing dashboards, agents, or CLIs against Neon.

## What's in here

- **Projects** — list/create/delete projects in a Neon org via the public API.
- **Branches** — list, fork, delete branches (one read/write endpoint per
  branch, the same default the real console uses).
- **SQL Editor** — run ad-hoc SQL against any branch via Neon's serverless
  driver.
- **Tables** — browse schemas, tables, and the first 100 rows of any table on
  any branch.
- **Monitoring** — compute settings + the few series the public API exposes
  via `getConsumptionHistoryPerProject`. Live RAM/CPU/connection series are
  *not* on the public API; we surface a clear "not available" empty state.
- **Backup & Restore** — point-in-time restore for any branch via
  `restoreProjectBranch` (with a preserve branch so it's reversible).
- **API Keys** — project-scoped Neon API keys via `/projects/{id}/api_keys`,
  with a copy-once-on-create dialog and one-click revoke.
- **Data API** — enable/disable the per-branch PostgREST-compatible REST
  endpoint, edit exposed schemas / anon role / row caps / CORS / OpenAPI
  mode / server timing, and trigger schema-cache refreshes.
- **Auth** — enable/disable Neon Auth on a branch, list users from
  `neon_auth.users_sync`, create/delete users, manage trusted redirect
  domains + allow-localhost, configure email-and-password sign-up/sign-in,
  add/remove OAuth providers (Google, GitHub, Microsoft, Apple, Facebook,
  X, LinkedIn, GitLab, Bitbucket, Spotify, Discord, Twitch), and set the
  webhook URL.
- **Settings** — rename, view defaults, delete project.

### Disabled / mocked

We refuse to fake what we can't actually do through the public API. The
following are intentionally inert with `Mock` tags:

- Org-level **People**, **Billing**, **Integrations** (UI sidebar items).
- Project-level **Overview**, **Data Masking**, **Integrations**.
- Topbar **Open admin menu**, **Ask AI**, **Account menu**, **Feedback**,
  **Collapse menu**.
- Snapshot creation (Beta API not yet in the SDK).
- Auth **email provider** SMTP credentials (the public `PATCH
  /auth/email_provider` accepts host/port/username/password, but editing
  raw SMTP creds through a multi-tenant clone needs more guardrails than
  we ship today — provider details are read-only here).

## Configuration

```bash
NEON_API_KEY=<org-level Neon API key>
NEON_ORG_ID=org-nameless-thunder-12993511
NEON_ORG_NAME="Neon Clone"
```

## Local dev

```bash
bun install
bun run dev
# http://localhost:3030
```

## Deploy

The included `vercel.json` uses `npm install --legacy-peer-deps` + `npx next
build` so bun isn't required on the build host. Set the three env vars in
your Vercel project and deploy:

```bash
vercel deploy --prod
```

## Stack

- [Next.js 15](https://nextjs.org/) App Router on Node.js
- [@neondatabase/api-client](https://www.npmjs.com/package/@neondatabase/api-client)
  for the control-plane
- [@neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless)
  for SQL queries
- Tailwind CSS + Radix UI primitives
- Lucide icons
- Sonner for toasts
