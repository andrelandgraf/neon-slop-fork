import { describe, expect, test } from "bun:test";
import { envFile, initCommand } from "./onboarding";

describe("onboarding", () => {
  test("init command orders services like the Console and quotes odd branch names", () => {
    expect(
      initCommand({
        orgId: "org-1",
        projectId: "p-1",
        branchName: "production",
        services: ["functions", "realtime", "postgres", "object-storage", "auth", "ai-gateway"],
      })
    ).toBe(
      "neon init -y --org-id org-1 --project-id p-1 --branch production --services postgres,auth,ai-gateway,object-storage,functions,realtime"
    );
    expect(initCommand({ orgId: "o", projectId: "p", branchName: "my branch", services: [] })).toBe(
      "neon init -y --org-id o --project-id p --branch 'my branch' --services postgres"
    );
  });

  test("env file includes only the selected services", () => {
    expect(envFile({ databaseUrl: "a", pooledDatabaseUrl: "b", functions: true })).toBe(
      [
        "# Postgres — your database connection",
        'DATABASE_URL="a"',
        'DATABASE_URL_POOLED="b"',
        "",
        "# Functions — serverless endpoints",
        "# Deploy a neon function with the 'neon deploy' cli command or deploy a function from one of Neon's sample templates with 'neon bootstrap'",
      ].join("\n")
    );
  });
});
