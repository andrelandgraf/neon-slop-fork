import { describe, expect, test } from "bun:test";
import { buildLogQL, levelOf } from "./logql";

describe("buildLogQL", () => {
  test("storage with an exact bucket", () => {
    expect(buildLogQL({ entity: "storage", serviceName: "uploads", serviceNameMatch: "exact" })).toBe(
      '{entity_type="storage", service_name="neon-storage/uploads"}'
    );
  });

  test("functions exclude the Realtime socket and match names loosely", () => {
    expect(buildLogQL({ entity: "function", serviceName: "he.llo" })).toBe(
      '{entity_type="function", service_name!="neon-function/neonrealtimesocket", service_name=~"(?i).*he\\\\.llo.*"}'
    );
  });

  test("realtime ignores the service name filter", () => {
    expect(buildLogQL({ entity: "realtime", serviceName: "ignored" })).toBe(
      '{service_name="neon-function/neonrealtimesocket", scope_name=~"realtime-proxy|neon_realtime"}'
    );
  });

  test("severity toggles become a prefix regex and search a line filter", () => {
    expect(buildLogQL({ entity: "storage", levels: ["error", "fatal"], search: "timeout" })).toBe(
      '{entity_type="storage", severity_text=~"(?i)^(crit|err|fatal|panic).*"} |~ "(?i)timeout"'
    );
  });

  test("levelOf maps severity text the way the Console does", () => {
    expect(levelOf("WARNING")).toBe("warning");
    expect(levelOf("log")).toBe("info");
    expect(levelOf("PANIC")).toBe("fatal");
    expect(levelOf(undefined)).toBe("unknown");
  });
});
