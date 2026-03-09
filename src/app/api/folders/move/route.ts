import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, sequences, emails, lists, marketingCampaigns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { itemId, folderId, entityType } = body as {
    itemId: string;
    folderId: string | null;
    entityType: "transactional" | "sequence" | "email" | "audience" | "campaign";
  };

  if (!itemId || !entityType) {
    return NextResponse.json({ error: "itemId and entityType required" }, { status: 400 });
  }

  if (entityType === "transactional") {
    await db
      .update(campaigns)
      .set({ folderId })
      .where(and(eq(campaigns.id, itemId), eq(campaigns.userId, session.user.id)));
  } else if (entityType === "sequence") {
    await db
      .update(sequences)
      .set({ folderId })
      .where(and(eq(sequences.id, itemId), eq(sequences.userId, session.user.id)));
  } else if (entityType === "email") {
    await db
      .update(emails)
      .set({ folderId })
      .where(and(eq(emails.id, itemId), eq(emails.userId, session.user.id)));
  } else if (entityType === "audience") {
    await db
      .update(lists)
      .set({ folderId })
      .where(and(eq(lists.id, itemId), eq(lists.userId, session.user.id)));
  } else if (entityType === "campaign") {
    await db
      .update(marketingCampaigns)
      .set({ folderId })
      .where(and(eq(marketingCampaigns.id, itemId), eq(marketingCampaigns.userId, session.user.id)));
  }

  return NextResponse.json({ ok: true });
}
