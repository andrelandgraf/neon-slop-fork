/**
 * The Console's post-create setup: the coding-agent prompt and the `.env`
 * block, rebuilt from its bundle. Realtime is included when selected; the
 * Console's own prompt leaves it out of `--services` although `neon init`
 * accepts it.
 */

export type ServiceId = "postgres" | "auth" | "object-storage" | "functions" | "ai-gateway" | "realtime";

/** Order the Console lists services in `--services`. */
const SERVICE_ORDER: ServiceId[] = ["postgres", "auth", "ai-gateway", "object-storage", "functions", "realtime"];

function shellArg(value: string): string {
  return /^[\w./-]+$/.test(value) && !value.startsWith("-")
    ? value
    : `'${value.replace(/'/g, `'"'"'`)}'`;
}

/**
 * The Console passes `--org-id`. Here the project starts in the clone's
 * shared org and moves to the user's own org when they claim it, and the
 * CLI rejects an `--org-id` the project no longer belongs to.
 */
export function initCommand({
  projectId,
  branchName,
  services,
}: {
  projectId: string;
  branchName: string;
  services: ServiceId[];
}): string {
  const ordered = SERVICE_ORDER.filter((s) => services.includes(s));
  return [
    "neon init -y",
    `--project-id ${shellArg(projectId)}`,
    `${branchName.startsWith("-") ? "--branch=" : "--branch "}${shellArg(branchName)}`,
    `--services ${ordered.length ? ordered.join(",") : "postgres"}`,
  ].join(" ");
}

export function agentPrompt(input: Parameters<typeof initCommand>[0]): string {
  const indent = "   ";
  return [
    "Set up this app on Neon.",
    "1. `npm i -g neon@latest`. If that fails, use `npx neon@latest` in place of `neon`.",
    `${indent}If a neon command opens a browser sign-in, tell me to finish it there. If that times out or fails, ask me to run \`neon login\`, then retry.`,
    "2. In the project root:",
    `${indent}${initCommand(input)}`,
    "3. `neon deploy`. It provisions the services in neon.ts and pulls their env vars into `.env.local` (or `.env` if it exists).",
    "4. Wire each service into the app's code using those env vars. Consult the installed Neon agent skills for best practices, e.g., what database driver to use given the app architecture and hosting runtime.",
    "5. Prove it works: `npm run build` must pass, then start the app, each wired service must be tested to prove it works end to end.",
    "6. Report what changed, the command output that proves step 5, and anything that failed.",
  ].join("\n");
}

export interface EnvInput {
  databaseUrl: string;
  pooledDatabaseUrl: string;
  auth?: { baseUrl: string };
  storage?: { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string; bucket?: string };
  functions?: boolean;
  aiGateway?: { baseUrl: string; token: string };
  realtime?: { url: string; secret: string };
}

const q = (v: string) => `"${v}"`;

export function envFile(input: EnvInput): string {
  const blocks: string[][] = [
    [
      "# Postgres — your database connection",
      `DATABASE_URL=${q(input.databaseUrl)}`,
      `DATABASE_URL_POOLED=${q(input.pooledDatabaseUrl)}`,
    ],
  ];
  if (input.auth) {
    blocks.push(["# Neon Auth — sign-in for your app", `NEON_AUTH_BASE_URL=${q(input.auth.baseUrl)}`]);
  }
  if (input.storage) {
    const s = input.storage;
    blocks.push([
      "# Storage — S3-compatible object storage",
      `AWS_ENDPOINT_URL_S3=${q(s.endpoint)}`,
      `AWS_ACCESS_KEY_ID=${q(s.accessKeyId)}`,
      `AWS_SECRET_ACCESS_KEY=${q(s.secretAccessKey)}`,
      `AWS_REGION=${q(s.region)}`,
      ...(s.bucket !== undefined ? [`S3_BUCKET=${q(s.bucket)}`] : []),
    ]);
  }
  if (input.functions) {
    blocks.push([
      "# Functions — serverless endpoints",
      "# Deploy a neon function with the 'neon deploy' cli command or deploy a function from one of Neon's sample templates with 'neon bootstrap'",
    ]);
  }
  if (input.aiGateway) {
    blocks.push([
      "# AI Gateway — OpenAI-compatible model endpoint",
      `NEON_AI_GATEWAY_BASE_URL=${q(input.aiGateway.baseUrl)}`,
      `NEON_AI_GATEWAY_TOKEN=${q(input.aiGateway.token)}`,
    ]);
  }
  if (input.realtime) {
    blocks.push([
      "# Realtime — live SQL queries",
      `NEON_REALTIME_URL=${q(input.realtime.url)}`,
      `NEON_REALTIME_SECRET=${q(input.realtime.secret)}`,
    ]);
  }
  return blocks.map((b) => b.join("\n")).join("\n\n");
}
