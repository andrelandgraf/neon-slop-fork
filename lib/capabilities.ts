import "server-only";
import { notFound } from "next/navigation";
import { NeonApiError } from "@neon/sdk";

import { neon, neonSdk } from "./neon";

/**
 * Which of the App Backend features a project can actually use.
 *
 * Object storage, AI Gateway, Functions, Realtime, and branch logs are rolled
 * out per region: a project in `aws-us-east-2` gets all of them, while one in
 * `aws-us-west-2` gets none. The Console hides the nav entries it can't serve rather
 * than linking to dead screens, and this is how we reproduce that.
 *
 * There is no capability field on the project object, so availability has to
 * be probed. Storage, AI Gateway, and logs answer with a documented,
 * machine-readable `reason`, which is what we key off; Functions and Realtime
 * only return a generic 404, so there we fall back to the status code.
 */
export interface ProjectCapabilities {
  storage: boolean;
  aiGateway: boolean;
  functions: boolean;
  realtime: boolean;
  logs: boolean;
  /**
   * Credentials are branch-scoped tokens whose every scope
   * (`storage:*`, `ai_gateway:invoke`, `functions:invoke`) targets one of the
   * features above, so the screen is only meaningful when at least one of
   * them exists. Derived rather than probed.
   */
  credentials: boolean;
}

const ALL_AVAILABLE: ProjectCapabilities = {
  aiGateway: true,
  credentials: true,
  functions: true,
  logs: true,
  realtime: true,
  storage: true,
};

/**
 * `reason` values that mean "this deployment cannot offer the feature at
 * all". The others (`branch_directory_missing`, `branch_not_found`) describe
 * a branch that isn't provisioned yet, which is a state the feature's own
 * screen already handles — so the nav entry should stay.
 */
const STORAGE_UNAVAILABLE_REASONS = new Set([
  "region_unavailable",
  "org_not_entitled",
]);
const AI_GATEWAY_UNAVAILABLE_REASONS = new Set(["ai_gateway_unavailable"]);
const LOGS_UNAVAILABLE_REASONS = new Set(["telemetry_not_enabled"]);

/**
 * Reads the `reason` discriminant off a Neon error body without asserting a
 * shape onto it — the field is documented for storage and AI Gateway, absent
 * everywhere else.
 */
function unavailableReason(error: unknown): string | null {
  if (!(error instanceof NeonApiError)) return null;
  const { body } = error;
  if (typeof body !== "object" || body === null || !("reason" in body)) {
    return null;
  }
  const { reason } = body;
  return typeof reason === "string" ? reason : null;
}

function isNotFound(error: unknown): boolean {
  return error instanceof NeonApiError && error.status === 404;
}

/**
 * Probes one feature. Anything other than a definitive "not available"
 * answer counts as available: a timeout or a 500 should not silently strip
 * screens out of the nav, and the feature's own page degrades gracefully.
 */
async function probe(
  request: () => Promise<unknown>,
  isUnavailable: (error: unknown) => boolean
): Promise<boolean> {
  try {
    await request();
    return true;
  } catch (error) {
    return !isUnavailable(error);
  }
}

/**
 * A project never changes region, and availability is a property of that
 * region (the API's own wording: "the project's region has no storage admin
 * service wired"), so the answer is stable enough to cache per project. The
 * TTL keeps a long-lived server from pinning a stale answer once Neon lights
 * a feature up somewhere new.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; value: ProjectCapabilities }>();

export async function getProjectCapabilities(
  projectId: string,
  branchId: string
): Promise<ProjectCapabilities> {
  // Without a branch there is nothing to probe against. Assume everything is
  // on offer and let the feature screens report their own state.
  if (!branchId) return ALL_AVAILABLE;

  const cached = cache.get(projectId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const [storage, aiGateway, functions, realtime, logs] = await Promise.all([
    probe(
      () => neon.getBranchStorage(projectId, branchId),
      (error) => {
        const reason = unavailableReason(error);
        return reason !== null && STORAGE_UNAVAILABLE_REASONS.has(reason);
      }
    ),
    probe(
      () => neon.getBranchAiGateway(projectId, branchId),
      (error) => {
        const reason = unavailableReason(error);
        return reason !== null && AI_GATEWAY_UNAVAILABLE_REASONS.has(reason);
      }
    ),
    probe(
      () => neon.listFunctionsFirstPage(projectId, branchId),
      // No documented reason on this endpoint. For a project and branch we
      // just loaded, a 404 can only mean the platform isn't there.
      isNotFound
    ),
    probe(() => neonSdk.realtime.get({ projectId, branchId }), isNotFound),
    probe(
      () => neonSdk.logs.fields({ projectId, branchId }),
      (error) => {
        const reason = unavailableReason(error);
        return reason !== null && LOGS_UNAVAILABLE_REASONS.has(reason);
      }
    ),
  ]);

  const value: ProjectCapabilities = {
    aiGateway,
    credentials: storage || aiGateway || functions,
    functions,
    logs,
    realtime,
    storage,
  };

  cache.set(projectId, { at: Date.now(), value });
  return value;
}

/**
 * Guards a feature screen whose nav entry is hidden in this region. The
 * Console answers such a deep link with its Not Found page, so the route
 * should not exist here either.
 */
export async function requireCapability(
  projectId: string,
  branchId: string,
  capability: keyof ProjectCapabilities
): Promise<void> {
  const capabilities = await getProjectCapabilities(projectId, branchId);
  if (!capabilities[capability]) notFound();
}
