import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;

  const [list] = await db.select().from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(list);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const [updated] = await db.update(lists)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.filterRules !== undefined && { filterRules: body.filterRules }),
      updatedAt: new Date(),
    })
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;

  const [deleted] = await db.delete(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)))
    .returning({ id: lists.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
