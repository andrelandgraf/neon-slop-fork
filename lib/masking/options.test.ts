import { describe, expect, test } from "bun:test";
import { columnKind, optionToRule, ruleToOption } from "./options";

describe("masking rules", () => {
  test("literal replacements become masking_value", () => {
    expect(optionToRule("$NULL", "email")).toEqual({ masking_value: "NULL" });
    expect(optionToRule("$'{}'", "tags")).toEqual({ masking_value: "'{}'" });
  });

  test("unique email uses the Console's UUID expression and reads back", () => {
    const rule = optionToRule("random_unique_email", "email");
    expect(rule).toEqual({
      masking_function: "pg_catalog.concat(anon.dummy_uuidv4(), '@example.com')",
    });
    expect(ruleToOption(rule)).toBe("random_unique_email");
  });

  test("functions get the Console's default arguments", () => {
    expect(optionToRule("anon.dummy_name", "name")).toEqual({ masking_function: "anon.dummy_name()" });
    expect(optionToRule("anon.partial", 'na"me')).toEqual({
      masking_function: `anon.partial("na""me", 1, 'XXX', 1)`,
    });
    expect(optionToRule("anon.random_int_between", "age")).toEqual({
      masking_function: "anon.random_int_between(start := 0, stop := 100000)",
    });
  });

  test("custom expressions are not mapped to a menu option", () => {
    expect(ruleToOption({ masking_function: "upper(name)" })).toBeNull();
    expect(ruleToOption({ masking_function: "anon.lorem_ipsum(paragraphs := 5)" })).toBe("anon.lorem_ipsum");
  });

  test("column kinds follow information_schema types", () => {
    expect(columnKind("character varying", "varchar")).toBe("text");
    expect(columnKind("timestamp with time zone", "timestamptz")).toBe("timestamp");
    expect(columnKind("USER-DEFINED", "citext")).toBe("text");
    expect(columnKind("USER-DEFINED", "mood")).toBe("enum");
    expect(columnKind("tsvector", "tsvector")).toBeNull();
  });
});
