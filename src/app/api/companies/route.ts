import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { companies, contacts } from "@/lib/db/schema";
import { eq, desc, and, ilike, or, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;
  const all = params.get("all"); // for autocomplete

  const conditions = [eq(companies.userId, session.user.id)];

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(companies.name, q),
        ilike(companies.domain, q),
        ilike(companies.industry, q),
      )!
    );
  }

  const where = and(...conditions);

  // Simple list for autocomplete
  if (all === "true") {
    const rows = await db
      .select({ id: companies.id, name: companies.name, domain: companies.domain })
      .from(companies)
      .where(where)
      .orderBy(companies.name)
      .limit(200);
    return NextResponse.json({ companies: rows });
  }

  // Get contact counts per company
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(where)
      .orderBy(desc(companies.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(companies)
      .where(where),
  ]);

  // Get contact counts
  const companyIds = rows.map((r) => r.id);
  let contactCounts: Record<string, number> = {};
  if (companyIds.length > 0) {
    const counts = await db
      .select({
        companyId: contacts.companyId,
        count: count(),
      })
      .from(contacts)
      .where(and(
        eq(contacts.userId, session.user.id),
        sql`${contacts.companyId} IN (${sql.join(companyIds.map((id) => sql`${id}`), sql`, `)})`
      ))
      .groupBy(contacts.companyId);

    for (const c of counts) {
      if (c.companyId) contactCounts[c.companyId] = Number(c.count);
    }
  }

  const parsed = rows.map((r) => ({
    ...r,
    properties: r.properties ? JSON.parse(r.properties) : {},
    contactCount: contactCounts[r.id] || 0,
  }));

  return NextResponse.json({
    companies: parsed,
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
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(companies)
    .values({
      userId: session.user.id,
      name: body.name.trim(),
      domain: body.domain?.trim() || null,
      industry: body.industry?.trim() || null,
      size: body.size?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      address: body.address?.trim() || null,
      description: body.description?.trim() || null,
      properties: body.properties ? JSON.stringify(body.properties) : null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
