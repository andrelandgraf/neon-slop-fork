import { describe, expect, test } from "bun:test";
import { previewSql, rowKey } from "./preview-sql";

describe("previewSql", () => {
  test("orders by the primary key and pages with LIMIT and OFFSET", () => {
    expect(previewSql({ schema: "public", table: "todos", page: 3, pageSize: 25 }, ["org_id", "id"])).toBe(
      'SELECT * FROM "public"."todos" ORDER BY "org_id", "id" LIMIT 25 OFFSET 50'
    );
  });

  test("keeps heap order without a primary key", () => {
    expect(previewSql({ schema: "public", table: "log", page: 1, pageSize: 10 }, [])).toBe(
      'SELECT * FROM "public"."log" LIMIT 10 OFFSET 0'
    );
  });

  test("quotes identifiers so a name can't end the identifier", () => {
    expect(previewSql({ schema: 'a"b', table: 'x"; DROP TABLE y; --', page: 1, pageSize: 10 }, ['i"d'])).toBe(
      'SELECT * FROM "a""b"."x""; DROP TABLE y; --" ORDER BY "i""d" LIMIT 10 OFFSET 0'
    );
  });
});

describe("rowKey", () => {
  test("combines the primary-key values", () => {
    expect(rowKey({ org_id: "7", id: "1", title: "a" }, ["org_id", "id"])).toBe('["7","1"]');
  });
});
