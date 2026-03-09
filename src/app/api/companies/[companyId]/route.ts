import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { companies, contacts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await params;

  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.userId, session.user.id)));

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get associated contacts
  const associatedContacts = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      jobTitle: contacts.jobTitle,
      phone: contacts.phone,
      subscribed: contacts.subscribed,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.userId, session.user.id)))
    .orderBy(desc(contacts.createdAt));

  return NextResponse.json({
    ...company,
    properties: company.properties ? JSON.parse(company.properties) : {},
    contacts: associatedContacts,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await params;
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.domain !== undefined) updates.domain = body.domain?.trim() || null;
  if (body.industry !== undefined) updates.industry = body.industry?.trim() || null;
  if (body.size !== undefined) updates.size = body.size?.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.website !== undefined) updates.website = body.website?.trim() || null;
  if (body.address !== undefined) updates.address = body.address?.trim() || null;
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.properties !== undefined) updates.properties = JSON.stringify(body.properties);
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(companies)
    .set(updates)
    .where(and(eq(companies.id, companyId), eq(companies.userId, session.user.id)))
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
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await params;

  await db
    .delete(companies)
    .where(and(eq(companies.id, companyId), eq(companies.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
