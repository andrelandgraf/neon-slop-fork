import "server-only";

import type { ServerRegion } from "@/components/neon-ui/region-select";
import { neon } from "./neon";
import { FALLBACK_REGIONS } from "./region-catalog";

/**
 * Regions offered on the new-project screen, shaped for the region picker
 * and globe.
 *
 * `GET /api/v2/regions` is the source of truth and already carries the
 * coordinates the globe needs, so we ask for it first. Organization-scoped
 * API keys are rejected by that endpoint though ("not allowed for
 * organization API keys"), and this app authenticates with exactly such a
 * key — so in practice the fallback below is what most deployments render.
 * Keeping the live call means a personal-key deployment, or a future
 * permission change, picks up new regions with no code change.
 */

/** Splits "aws-us-east-1" into the provider label the console prefixes. */
function providerOf(regionId: string): string | undefined {
  const [provider] = regionId.split("-");
  return provider ? provider.toUpperCase() : undefined;
}



export const DEFAULT_REGION_ID = "aws-us-east-2";

/** Postgres versions the Console offers, newest first. */
export const PG_VERSIONS = [18, 17, 16, 15, 14] as const;

/**
 * The API returns coordinates as strings and leaves them empty when a
 * region's location is unknown. A region without a usable position can't be
 * plotted, so fall back to the static table's coordinates when we have them
 * and drop the marker otherwise.
 */
function toServerRegion(region: {
  region_id: string;
  name: string;
  geo_lat: string;
  geo_long: string;
}): ServerRegion | null {
  const lat = Number.parseFloat(region.geo_lat);
  const lng = Number.parseFloat(region.geo_long);
  const known = FALLBACK_REGIONS.find((r) => r.id === region.region_id);
  const position = Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : known && { lat: known.lat, lng: known.lng };

  if (!position) return null;

  return {
    id: region.region_id,
    name: region.name,
    provider: providerOf(region.region_id),
    ...position,
  };
}

let cached: ServerRegion[] | undefined;

export async function listRegions(): Promise<ServerRegion[]> {
  if (cached) return cached;

  try {
    const { data } = await neon.listActiveRegions();
    const regions = data.regions
      .map(toServerRegion)
      .filter((region): region is ServerRegion => region !== null);
    if (regions.length > 0) {
      cached = regions;
      return regions;
    }
  } catch {
    // Org-scoped keys can't read /regions; the static table is equivalent.
  }

  cached = FALLBACK_REGIONS;
  return FALLBACK_REGIONS;
}
