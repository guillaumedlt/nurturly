import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketingCampaigns, marketingCampaignItems, campaigns, sequences, lists } from "@/lib/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.userId, session.user.id))
    .orderBy(desc(marketingCampaigns.updatedAt));

  // Get item counts for each campaign
  const campaignIds = rows.map((r) => r.id);
  let itemCounts: Record<string, { transactional: number; sequence: number; audience: number }> = {};

  if (campaignIds.length > 0) {
    const counts = await db
      .select({
        campaignId: marketingCampaignItems.campaignId,
        itemType: marketingCampaignItems.itemType,
        count: sql<number>`count(*)`,
      })
      .from(marketingCampaignItems)
      .where(inArray(marketingCampaignItems.campaignId, campaignIds))
      .groupBy(marketingCampaignItems.campaignId, marketingCampaignItems.itemType);

    for (const c of counts) {
      if (!itemCounts[c.campaignId]) {
        itemCounts[c.campaignId] = { transactional: 0, sequence: 0, audience: 0 };
      }
      itemCounts[c.campaignId][c.itemType as "transactional" | "sequence" | "audience"] = Number(c.count);
    }
  }

  const result = rows.map((r) => ({
    ...r,
    items: itemCounts[r.id] || { transactional: 0, sequence: 0, audience: 0 },
  }));

  return NextResponse.json({ campaigns: result });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  if (isErrorResponse(body)) return body;

  const [created] = await db
    .insert(marketingCampaigns)
    .values({
      userId: session.user.id,
      name: body.name || "Untitled campaign",
      description: body.description || null,
    })
    .returning();

  return NextResponse.json(created);
}
