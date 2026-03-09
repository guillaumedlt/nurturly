import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketingCampaigns, marketingCampaignItems, campaigns, sequences, lists } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;

  const [campaign] = await db
    .select()
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.userId, session.user.id)));

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get all items
  const items = await db
    .select()
    .from(marketingCampaignItems)
    .where(eq(marketingCampaignItems.campaignId, campaignId));

  // Resolve item details
  const transactionalIds = items.filter((i) => i.itemType === "transactional").map((i) => i.itemId);
  const sequenceIds = items.filter((i) => i.itemType === "sequence").map((i) => i.itemId);
  const audienceIds = items.filter((i) => i.itemType === "audience").map((i) => i.itemId);

  const [transactionalItems, sequenceItems, audienceItems] = await Promise.all([
    transactionalIds.length > 0
      ? db.select({
          id: campaigns.id, name: campaigns.name, status: campaigns.status,
          totalSent: campaigns.totalSent, totalDelivered: campaigns.totalDelivered,
          totalOpened: campaigns.totalOpened, totalClicked: campaigns.totalClicked,
          totalBounced: campaigns.totalBounced, totalRecipients: campaigns.totalRecipients,
          sentAt: campaigns.sentAt,
        }).from(campaigns).where(inArray(campaigns.id, transactionalIds))
      : [],
    sequenceIds.length > 0
      ? db.select({
          id: sequences.id, name: sequences.name, status: sequences.status,
          totalEnrolled: sequences.totalEnrolled, totalCompleted: sequences.totalCompleted,
        }).from(sequences).where(inArray(sequences.id, sequenceIds))
      : [],
    audienceIds.length > 0
      ? db.select({ id: lists.id, name: lists.name, contactCount: lists.contactCount }).from(lists).where(inArray(lists.id, audienceIds))
      : [],
  ]);

  return NextResponse.json({
    ...campaign,
    transactional: transactionalItems,
    sequences: sequenceItems,
    audiences: audienceItems,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.startDate !== undefined) updates.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;

  const [updated] = await db
    .update(marketingCampaigns)
    .set(updates)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;

  await db
    .delete(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
