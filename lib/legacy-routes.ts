/**
 * Where a pre-October-2026 project URL lives now. Old pages took the branch
 * as `?branch=`; new branch pages carry it in the path.
 */
export interface LegacyTarget {
  /** Path under `/projects/P/branches/B`, or under `/projects/P` when `projectLevel`. */
  path: string;
  projectLevel?: boolean;
}

const OVERVIEW_TABS: Record<string, LegacyTarget> = {
  computes: { path: "computes" },
  "roles-databases": { path: "roles" },
  "child-branches": { path: "branches", projectLevel: true },
};

export function legacyTarget(
  segments: string[],
  query: URLSearchParams
): LegacyTarget | null {
  const [first, ...rest] = segments;
  const tab = query.get("tab");
  switch (first) {
    case "overview":
      return (tab && OVERVIEW_TABS[tab]) || { path: "" };
    case "sql":
      return { path: "sql-editor" };
    case "backup":
      return { path: "restore" };
    case "masking":
      return { path: "data-masking" };
    case "credentials":
    case "api-keys":
      return { path: "settings/credentials", projectLevel: true };
    case "auth":
      return tab === "configuration"
        ? { path: "settings/auth", projectLevel: true }
        : { path: "auth" };
    case "data-api":
      return tab === "settings"
        ? { path: "settings/postgres", projectLevel: true }
        : { path: "data-api" };
    case "storage":
      return { path: ["storage", ...rest].join("/") };
    case "tables":
    case "monitoring":
    case "functions":
    case "ai-gateway":
      return rest.length === 0 ? { path: first } : null;
    default:
      return null;
  }
}

/** Query params the old page understood that mean nothing on the new one. */
export const CONSUMED_PARAMS = ["branch", "tab"];
