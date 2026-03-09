import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { contacts, listMemberships, lists, analyticsEvents, sequenceEnrollments, sequences } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;

  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)));

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get lists this contact belongs to
  const contactLists = await db
    .select({
      id: lists.id,
      name: lists.name,
      type: lists.type,
      addedAt: listMemberships.addedAt,
    })
    .from(listMemberships)
    .innerJoin(lists, eq(lists.id, listMemberships.listId))
    .where(eq(listMemberships.contactId, contactId));

  // Get recent activity (last 20 events)
  const activity = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.contactId, contactId))
    .orderBy(desc(analyticsEvents.occurredAt))
    .limit(20);

  // Get sequence enrollments
  const enrollments = await db
    .select({
      id: sequenceEnrollments.id,
      sequenceId: sequenceEnrollments.sequenceId,
      sequenceName: sequences.name,
      status: sequenceEnrollments.status,
      currentStep: sequenceEnrollments.currentStepPosition,
      enrolledAt: sequenceEnrollments.enrolledAt,
      completedAt: sequenceEnrollments.completedAt,
    })
    .from(sequenceEnrollments)
    .innerJoin(sequences, eq(sequences.id, sequenceEnrollments.sequenceId))
    .where(eq(sequenceEnrollments.contactId, contactId))
    .orderBy(desc(sequenceEnrollments.enrolledAt));

  return NextResponse.json({
    ...contact,
    properties: contact.properties ? JSON.parse(contact.properties) : {},
    lists: contactLists,
    activity,
    enrollments,
  });
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
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  // Build update object from body
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.firstName !== undefined) updates.firstName = body.firstName?.trim() || null;
  if (body.lastName !== undefined) updates.lastName = body.lastName?.trim() || null;
  if (body.company !== undefined) updates.company = body.company?.trim() || null;
  if (body.jobTitle !== undefined) updates.jobTitle = body.jobTitle?.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.companyId !== undefined) updates.companyId = body.companyId || null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.subscribed !== undefined) updates.subscribed = body.subscribed;
  if (body.properties !== undefined) updates.properties = JSON.stringify(body.properties);

  const [updated] = await db
    .update(contacts)
    .set(updates)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...updated,
    properties: updated.properties ? JSON.parse(updated.properties) : {},
  });
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

  await db
    .delete(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
