import { describe, expect, test } from "bun:test";
import { renderSnippet, type ConnectionParts } from "./connect-snippets";

const parts: ConnectionParts = {
  role: "neondb_owner",
  password: "p@ss",
  host: "ep-cool-paper-b5x598eh.us-east-2.aws.neon.tech",
  poolerHost: "ep-cool-paper-b5x598eh-pooler.us-east-2.aws.neon.tech",
  database: "neondb",
};

describe("renderSnippet", () => {
  test("connection string uses the pooler host and encodes the password", () => {
    expect(renderSnippet("_connstring", parts, true)).toBe(
      "postgresql://neondb_owner:p%40ss@ep-cool-paper-b5x598eh-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    );
  });

  test("unpooled connection string uses the direct host", () => {
    expect(renderSnippet("psql", parts, false)).toBe(
      "psql 'postgresql://neondb_owner:p%40ss@ep-cool-paper-b5x598eh.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'"
    );
  });

  test("parameters drop standalone section lines", () => {
    expect(renderSnippet("parameters", { ...parts, password: null }, true)).toBe(
      [
        "PGHOST='ep-cool-paper-b5x598eh-pooler.us-east-2.aws.neon.tech'",
        "PGDATABASE='neondb'",
        "PGUSER='neondb_owner'",
        "PGPASSWORD='********'",
        "PGSSLMODE='require'",
        "PGCHANNELBINDING='require'",
      ].join("\n")
    );
  });

  test(".NET partial renders inside quotes", () => {
    expect(renderSnippet("dotnet_ssl", parts, false)).toBe(
      '"Host=ep-cool-paper-b5x598eh.us-east-2.aws.neon.tech; Database=neondb; Username=neondb_owner; Password=p%40ss; SSL Mode=VerifyFull; Channel Binding=Require;"'
    );
  });
});
