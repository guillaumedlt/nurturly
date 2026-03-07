import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and, ilike, or, sql, desc, asc, type SQL } from "drizzle-orm";
import { validateContactInput } from "@/lib/contacts/validation";
import type { ContactsListResponse } from "@/lib/contacts/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50")));
  const search = searchParams.get("search")?.trim();
  const subscribed = searchParams.get("subscribed");
  const source = searchParams.get("source");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const conditions: SQL[] = [eq(contacts.userId, session.user.id)];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(contacts.email, pattern),
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        ilike(contacts.company, pattern)
      )!
    );
  }

  if (subscribed === "true") conditions.push(eq(contacts.subscribed, true));
  if (subscribed === "false") conditions.push(eq(contacts.subscribed, false));

  if (source && ["manual", "import", "api"].includes(source)) {
    conditions.push(eq(contacts.source, source as "manual" | "import" | "api"));
  }

  const where = and(...conditions);

  const sortCol = {
    email: contacts.email,
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    company: contacts.company,
    createdAt: contacts.createdAt,
  }[sortBy] ?? contacts.createdAt;

  const orderFn = sortOrder === "asc" ? asc : desc;

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(where),
    db.select().from(contacts).where(where)
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    contacts: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  } satisfies ContactsListResponse);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { valid, errors } = validateContactInput(body);
  if (!valid) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  try {
    const [created] = await db.insert(contacts).values({
      userId: session.user.id,
      email: body.email.toLowerCase().trim(),
      firstName: body.firstName?.trim() || null,
      lastName: body.lastName?.trim() || null,
      company: body.company?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      phone: body.phone?.trim() || null,
      tags: body.tags ?? [],
      source: "manual",
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("contacts_user_email_idx")) {
      return NextResponse.json({ error: "Contact with this email already exists" }, { status: 409 });
    }
    throw err;
  }
}
