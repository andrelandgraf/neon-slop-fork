import type { ServerRegion } from "@/components/neon-ui/region-select";

/**
 * Mirrors the eight regions the Console offers, with datacenter
 * coordinates. Names match `/api/v2/regions` so the two paths render
 * identically.
 */
export const FALLBACK_REGIONS: ServerRegion[] = [
  {
    id: "aws-us-east-1",
    name: "US East 1 (N. Virginia)",
    provider: "AWS",
    lat: 38.9,
    lng: -77.4,
  },
  {
    id: "aws-us-east-2",
    name: "US East 2 (Ohio)",
    provider: "AWS",
    lat: 40.1,
    lng: -83,
  },
  {
    id: "aws-us-west-2",
    name: "US West 2 (Oregon)",
    provider: "AWS",
    lat: 45.6,
    lng: -121.2,
  },
  {
    id: "aws-ap-southeast-1",
    name: "Asia Pacific 1 (Singapore)",
    provider: "AWS",
    lat: 1.35,
    lng: 103.82,
  },
  {
    id: "aws-ap-southeast-2",
    name: "Asia Pacific 2 (Sydney)",
    provider: "AWS",
    lat: -33.87,
    lng: 151.21,
  },
  {
    id: "aws-eu-central-1",
    name: "Europe Central 1 (Frankfurt)",
    provider: "AWS",
    lat: 50.11,
    lng: 8.68,
  },
  {
    id: "aws-eu-west-2",
    name: "Europe West 2 (London)",
    provider: "AWS",
    lat: 51.51,
    lng: -0.13,
  },
  {
    id: "aws-sa-east-1",
    name: "South America East 1 (São Paulo)",
    provider: "AWS",
    lat: -23.55,
    lng: -46.63,
  },
];

/**
 * Regions where Object storage, Functions, the AI Gateway, Realtime, and
 * branch logs are wired up. Checked against the API (the other four regions
 * answer 404 for every one of them); `lib/capabilities.ts` still probes each
 * project, this table only drives the create-project form.
 */
export const APP_BACKEND_REGIONS: ReadonlySet<string> = new Set([
  "aws-us-east-1",
  "aws-us-east-2",
  "aws-ap-southeast-1",
  "aws-eu-central-1",
]);

/** "aws-us-east-2" → "AWS US East 2 (Ohio)", as the Console labels it. */
export function regionLabel(regionId: string): string {
  const region = FALLBACK_REGIONS.find((r) => r.id === regionId);
  if (!region) return regionId;
  return region.provider ? `${region.provider} ${region.name}` : region.name;
}
