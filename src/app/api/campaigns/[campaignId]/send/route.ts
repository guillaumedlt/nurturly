import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, lists } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;

  // Get the campaign
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, session.user.id)));

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json(
      { error: "Campaign has already been sent or cancelled" },
      { status: 400 }
    );
  }

  if (!campaign.subject?.trim()) {
    return NextResponse.json({ error: "Subject line is required" }, { status: 400 });
  }

  if (!campaign.listId) {
    return NextResponse.json({ error: "Please select an audience list" }, { status: 400 });
  }

  // Get recipient count from list
  let recipientCount = 0;
  if (campaign.listId) {
    const [list] = await db
      .select({ contactCount: lists.contactCount })
      .from(lists)
      .where(eq(lists.id, campaign.listId));
    recipientCount = list?.contactCount ?? 0;
  }

  // Simulate send (actual SES integration in Phase 7)
  const [updated] = await db
    .update(campaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      totalRecipients: recipientCount,
      totalSent: recipientCount,
      totalDelivered: Math.floor(recipientCount * 0.95),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .returning();

  return NextResponse.json(updated);
}
