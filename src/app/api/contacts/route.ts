import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { contacts, listMemberships } from "@/lib/db/schema";
import { eq, desc, and, ilike, or, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || "";
  const subscribed = params.get("subscribed");
  const source = params.get("source");
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const conditions = [eq(contacts.userId, session.user.id)];

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(contacts.email, q),
        ilike(contacts.firstName, q),
        ilike(contacts.lastName, q),
        ilike(contacts.company, q),
      )!
    );
  }

  if (subscribed === "true") conditions.push(eq(contacts.subscribed, true));
  if (subscribed === "false") conditions.push(eq(contacts.subscribed, false));
  if (source) conditions.push(eq(contacts.source, source as "manual" | "import" | "api"));

  const where = and(...conditions);

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(contacts)
      .where(where),
  ]);

  // Parse properties JSON for each contact
  const parsed = rows.map((r) => ({
    ...r,
    properties: r.properties ? JSON.parse(r.properties) : {},
  }));

  return NextResponse.json({
    contacts: parsed,
    total: totalRow.total,
    page,
    limit,
    totalPages: Math.ceil(totalRow.total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(contacts)
    .values({
      userId: session.user.id,
      email: body.email.trim().toLowerCase(),
      firstName: body.firstName?.trim() || null,
      lastName: body.lastName?.trim() || null,
      company: body.company?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      phone: body.phone?.trim() || null,
      companyId: body.companyId || null,
      tags: body.tags || null,
      properties: body.properties ? JSON.stringify(body.properties) : null,
      source: body.source || "manual",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
