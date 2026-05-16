import { describe, expect, test } from "bun:test";
import { splitSqlStatements } from "./sql-split";

describe("splitSqlStatements", () => {
  test("splits a simple two-statement script on semicolons", () => {
    expect(
      splitSqlStatements(`SELECT 1; SELECT 2;`),
    ).toEqual(["SELECT 1", "SELECT 2"]);
  });

  test("drops empty / whitespace-only statements", () => {
    expect(splitSqlStatements(`;\n   ;\nSELECT 1;;`)).toEqual(["SELECT 1"]);
  });

  test("keeps semicolons inside single-quoted strings", () => {
    expect(
      splitSqlStatements(`INSERT INTO t VALUES ('a;b'); SELECT 1`),
    ).toEqual([`INSERT INTO t VALUES ('a;b')`, "SELECT 1"]);
  });

  test("handles doubled-quote escapes inside strings", () => {
    expect(
      splitSqlStatements(`INSERT INTO t VALUES ('it''s; ok'); SELECT 1`),
    ).toEqual([`INSERT INTO t VALUES ('it''s; ok')`, "SELECT 1"]);
  });

  test("keeps semicolons inside double-quoted identifiers", () => {
    expect(
      splitSqlStatements(`SELECT "a;b" FROM t; SELECT 1`),
    ).toEqual([`SELECT "a;b" FROM t`, "SELECT 1"]);
  });

  test("handles dollar-quoted strings with internal semicolons", () => {
    const sql = `CREATE FUNCTION f() RETURNS void AS $$ BEGIN ; END; $$ LANGUAGE plpgsql; SELECT 1`;
    expect(splitSqlStatements(sql)).toEqual([
      `CREATE FUNCTION f() RETURNS void AS $$ BEGIN ; END; $$ LANGUAGE plpgsql`,
      "SELECT 1",
    ]);
  });

  test("handles tagged dollar-quoted strings", () => {
    const sql = `DO $body$ BEGIN ; END $body$; SELECT 1`;
    expect(splitSqlStatements(sql)).toEqual([
      `DO $body$ BEGIN ; END $body$`,
      "SELECT 1",
    ]);
  });

  test("ignores semicolons in line comments", () => {
    expect(
      splitSqlStatements(`SELECT 1; -- inline; comment\nSELECT 2`),
    ).toEqual(["SELECT 1", `-- inline; comment\nSELECT 2`]);
  });

  test("ignores semicolons in block comments", () => {
    expect(
      splitSqlStatements(`SELECT 1; /* a; b; c */ SELECT 2`),
    ).toEqual(["SELECT 1", `/* a; b; c */ SELECT 2`]);
  });

  test("returns a single statement when no trailing semicolon is present", () => {
    expect(splitSqlStatements(`SELECT 1`)).toEqual(["SELECT 1"]);
  });

  test("returns an empty array for input that contains no statements", () => {
    expect(splitSqlStatements("")).toEqual([]);
    expect(splitSqlStatements(";;;")).toEqual([]);
    expect(splitSqlStatements("  \n\n  ")).toEqual([]);
  });

  test("trims whitespace from each statement", () => {
    expect(splitSqlStatements(`\n  SELECT 1  ;\n\n SELECT 2;\n`)).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });
});
