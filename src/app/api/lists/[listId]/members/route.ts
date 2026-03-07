import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, listMemberships, contacts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

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

  const members = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      company: contacts.company,
      subscribed: contacts.subscribed,
      addedAt: listMemberships.addedAt,
    })
    .from(listMemberships)
    .innerJoin(contacts, eq(listMemberships.contactId, contacts.id))
    .where(eq(listMemberships.listId, listId));

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const body = await request.json();
  const { contactIds } = body as { contactIds: string[] };

  if (!contactIds?.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const [list] = await db.select().from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.insert(listMemberships)
    .values(contactIds.map((contactId) => ({ listId, contactId })))
    .onConflictDoNothing();

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(listMemberships).where(eq(listMemberships.listId, listId));
  await db.update(lists).set({ contactCount: countResult.count }).where(eq(lists.id, listId));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const body = await request.json();
  const { contactId } = body as { contactId: string };

  await db.delete(listMemberships)
    .where(and(eq(listMemberships.listId, listId), eq(listMemberships.contactId, contactId)));

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(listMemberships).where(eq(listMemberships.listId, listId));
  await db.update(lists).set({ contactCount: countResult.count }).where(eq(lists.id, listId));

  return NextResponse.json({ success: true });
}
