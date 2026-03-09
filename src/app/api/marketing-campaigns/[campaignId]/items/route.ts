import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketingCampaigns, marketingCampaignItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;

  // Verify ownership
  const [campaign] = await db
    .select({ id: marketingCampaigns.id })
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.userId, session.user.id)));

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { itemType, itemId } = body;

  if (!itemType || !itemId) {
    return NextResponse.json({ error: "itemType and itemId required" }, { status: 400 });
  }

  try {
    const [item] = await db
      .insert(marketingCampaignItems)
      .values({ campaignId, itemType, itemId })
      .returning();

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item already added" }, { status: 409 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  // Verify ownership
  const [campaign] = await db
    .select({ id: marketingCampaigns.id })
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.userId, session.user.id)));

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(marketingCampaignItems)
    .where(and(
      eq(marketingCampaignItems.campaignId, campaignId),
      eq(marketingCampaignItems.id, itemId)
    ));

  return NextResponse.json({ ok: true });
}
