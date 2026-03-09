import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, lists, emails } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await workspaceScope(campaigns.userId, session.user.id);
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      emailId: campaigns.emailId,
      emailName: emails.name,
      listId: campaigns.listId,
      listName: lists.name,
      totalRecipients: campaigns.totalRecipients,
      totalSent: campaigns.totalSent,
      totalOpened: campaigns.totalOpened,
      scheduledAt: campaigns.scheduledAt,
      sentAt: campaigns.sentAt,
      folderId: campaigns.folderId,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaigns)
    .leftJoin(lists, eq(campaigns.listId, lists.id))
    .leftJoin(emails, eq(campaigns.emailId, emails.id))
    .where(scope)
    .orderBy(desc(campaigns.updatedAt));

  return NextResponse.json({ campaigns: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  const name = (body.name as string)?.trim() || "Untitled campaign";

  const [created] = await db
    .insert(campaigns)
    .values({
      userId: session.user.id,
      name,
      status: "draft",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
