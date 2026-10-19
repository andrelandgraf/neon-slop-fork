import { describe, expect, test } from "bun:test";
import { legacyTarget } from "./legacy-routes";

const q = (s = "") => new URLSearchParams(s);

describe("legacyTarget", () => {
  test("overview tabs map to their own pages", () => {
    expect(legacyTarget(["overview"], q())).toEqual({ path: "" });
    expect(legacyTarget(["overview"], q("tab=computes"))).toEqual({ path: "computes" });
    expect(legacyTarget(["overview"], q("tab=roles-databases"))).toEqual({ path: "roles" });
    expect(legacyTarget(["overview"], q("tab=child-branches"))).toEqual({ path: "branches", projectLevel: true });
  });

  test("renamed pages", () => {
    expect(legacyTarget(["sql"], q())).toEqual({ path: "sql-editor" });
    expect(legacyTarget(["backup"], q())).toEqual({ path: "restore" });
    expect(legacyTarget(["masking"], q())).toEqual({ path: "data-masking" });
    expect(legacyTarget(["api-keys"], q())).toEqual({ path: "settings/credentials", projectLevel: true });
  });

  test("configuration tabs moved to Settings", () => {
    expect(legacyTarget(["auth"], q("tab=configuration"))).toEqual({ path: "settings/auth", projectLevel: true });
    expect(legacyTarget(["data-api"], q("tab=settings"))).toEqual({ path: "settings/postgres", projectLevel: true });
    expect(legacyTarget(["data-api"], q())).toEqual({ path: "data-api" });
  });

  test("bucket pages keep the bucket", () => {
    expect(legacyTarget(["storage", "uploads"], q("prefix=a%2F"))).toEqual({ path: "storage/uploads" });
  });

  test("unknown paths are not redirected", () => {
    expect(legacyTarget(["nope"], q())).toBeNull();
    expect(legacyTarget(["tables", "extra"], q())).toBeNull();
  });
});
