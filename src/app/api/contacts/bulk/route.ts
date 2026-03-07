import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, listMemberships, lists } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, contactIds, listId } = body as {
    action: "delete" | "addToList";
    contactIds: string[];
    listId?: string;
  };

  if (!contactIds?.length) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
  }

  if (action === "delete") {
    await db.delete(contacts)
      .where(and(
        inArray(contacts.id, contactIds),
        eq(contacts.userId, session.user.id)
      ));
    return NextResponse.json({ success: true, deleted: contactIds.length });
  }

  if (action === "addToList" && listId) {
    const [list] = await db.select().from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const memberships = contactIds.map((contactId) => ({
      listId,
      contactId,
    }));

    await db.insert(listMemberships).values(memberships)
      .onConflictDoNothing();

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(listMemberships).where(eq(listMemberships.listId, listId));
    await db.update(lists).set({ contactCount: countResult.count }).where(eq(lists.id, listId));

    return NextResponse.json({ success: true, added: contactIds.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
