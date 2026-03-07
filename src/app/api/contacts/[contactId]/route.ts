import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;

  const [contact] = await db.select().from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)));

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;
  const body = await request.json();

  const allowedFields = ["email", "firstName", "lastName", "company", "jobTitle", "phone", "tags", "subscribed"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const [updated] = await db.update(contacts)
    .set(updates)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;

  const [deleted] = await db.delete(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)))
    .returning({ id: contacts.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
