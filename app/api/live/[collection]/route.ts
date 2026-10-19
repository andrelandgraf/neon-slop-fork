import { isLiveCollectionName, sealLive } from "@/lib/live/load";
import { verifyPageIdentity } from "@/lib/tenancy";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Renews a sealed live query. The page sends the user and org it was
 * rendered for; a different session or active org gets 401 so the tab
 * reloads instead of subscribing as someone else.
 */
export async function POST(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isLiveCollectionName(collection)) {
    return Response.json({ error: `Unknown live collection: ${collection}` }, { status: 404, headers: NO_STORE });
  }
  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    !("userId" in body) ||
    !("orgId" in body) ||
    typeof body.userId !== "string" ||
    typeof body.orgId !== "string"
  ) {
    return Response.json({ error: "Body must be { userId, orgId }." }, { status: 400, headers: NO_STORE });
  }
  const identity = { userId: body.userId, orgId: body.orgId };
  const check = await verifyPageIdentity(identity);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status, headers: NO_STORE });
  return Response.json(await sealLive(collection, identity), { headers: NO_STORE });
}
