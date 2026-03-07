import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, lists } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      listId: campaigns.listId,
      listName: lists.name,
      totalRecipients: campaigns.totalRecipients,
      totalSent: campaigns.totalSent,
      totalOpened: campaigns.totalOpened,
      sentAt: campaigns.sentAt,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaigns)
    .leftJoin(lists, eq(campaigns.listId, lists.id))
    .where(eq(campaigns.userId, session.user.id))
    .orderBy(desc(campaigns.updatedAt));

  return NextResponse.json({ campaigns: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name as string)?.trim() || "Untitled campaign";

  const [created] = await db
    .insert(campaigns)
    .values({
      userId: session.user.id,
      name,
      status: "draft",
      editorContent: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
