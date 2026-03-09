import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { contacts, listMemberships } from "@/lib/db/schema";
import { eq, ne, desc, and, ilike, or, sql, count, isNull, isNotNull, not } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { workspaceScope } from "@/lib/workspace";
import type { ContactFilters, FilterCondition } from "@/lib/contacts/filters";

// Map of built-in field names to their drizzle column references
const COLUMN_MAP: Record<string, typeof contacts.email> = {
  email: contacts.email,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  company: contacts.company,
  jobTitle: contacts.jobTitle,
  phone: contacts.phone,
};

function buildConditionSql(c: FilterCondition): SQL | null {
  // Custom property (stored in JSON)
  if (c.field.startsWith("prop:")) {
    const propName = c.field.slice(5);
    const jsonExtract = sql`(${contacts.properties}::jsonb ->> ${propName})`;

    switch (c.operator) {
      case "equals": return sql`${jsonExtract} = ${c.value}`;
      case "not_equals": return sql`${jsonExtract} != ${c.value}`;
      case "contains": return sql`${jsonExtract} ILIKE ${"%" + c.value + "%"}`;
      case "not_contains": return sql`${jsonExtract} NOT ILIKE ${"%" + c.value + "%"}`;
      case "starts_with": return sql`${jsonExtract} ILIKE ${c.value + "%"}`;
      case "ends_with": return sql`${jsonExtract} ILIKE ${"%" + c.value}`;
      case "is_empty": return sql`(${jsonExtract} IS NULL OR ${jsonExtract} = '')`;
      case "is_not_empty": return sql`(${jsonExtract} IS NOT NULL AND ${jsonExtract} != '')`;
      case "greater_than": return sql`(${jsonExtract})::numeric > ${Number(c.value)}`;
      case "less_than": return sql`(${jsonExtract})::numeric < ${Number(c.value)}`;
      case "between": return sql`(${jsonExtract})::numeric BETWEEN ${Number(c.value)} AND ${Number(c.value2 || "0")}`;
      case "before": return sql`(${jsonExtract})::date < ${c.value}::date`;
      case "after": return sql`(${jsonExtract})::date > ${c.value}::date`;
      case "is_true": return sql`${jsonExtract} = 'true'`;
      case "is_false": return sql`(${jsonExtract} = 'false' OR ${jsonExtract} IS NULL)`;
      default: return null;
    }
  }

  // Boolean field: subscribed
  if (c.field === "subscribed") {
    switch (c.operator) {
      case "is_true": return eq(contacts.subscribed, true);
      case "is_false": return eq(contacts.subscribed, false);
      default: return null;
    }
  }

  // Select field: source
  if (c.field === "source") {
    switch (c.operator) {
      case "equals": return eq(contacts.source, c.value as "manual" | "import" | "api");
      case "not_equals": return ne(contacts.source, c.value as "manual" | "import" | "api");
      case "in": {
        const vals = c.value.split(",").map((v) => v.trim()).filter(Boolean);
        if (vals.length === 0) return null;
        return or(...vals.map((v) => eq(contacts.source, v as "manual" | "import" | "api")))!;
      }
      case "not_in": {
        const vals = c.value.split(",").map((v) => v.trim()).filter(Boolean);
        if (vals.length === 0) return null;
        return and(...vals.map((v) => ne(contacts.source, v as "manual" | "import" | "api")))!;
      }
      default: return null;
    }
  }

  // Date field: createdAt
  if (c.field === "createdAt") {
    switch (c.operator) {
      case "equals": return sql`${contacts.createdAt}::date = ${c.value}::date`;
      case "before": return sql`${contacts.createdAt}::date < ${c.value}::date`;
      case "after": return sql`${contacts.createdAt}::date > ${c.value}::date`;
      case "between": return sql`${contacts.createdAt}::date BETWEEN ${c.value}::date AND ${c.value2 || c.value}::date`;
      case "is_empty": return isNull(contacts.createdAt);
      case "is_not_empty": return isNotNull(contacts.createdAt);
      default: return null;
    }
  }

  // Text fields
  const col = COLUMN_MAP[c.field];
  if (!col) return null;

  switch (c.operator) {
    case "equals": return eq(col, c.value);
    case "not_equals": return ne(col, c.value);
    case "contains": return ilike(col, `%${c.value}%`);
    case "not_contains": return not(ilike(col, `%${c.value}%`));
    case "starts_with": return ilike(col, `${c.value}%`);
    case "ends_with": return ilike(col, `%${c.value}`);
    case "is_empty": return or(isNull(col), eq(col, ""))!;
    case "is_not_empty": return and(isNotNull(col), ne(col, ""))!;
    default: return null;
  }
}

function buildFiltersSql(filters: ContactFilters): SQL | null {
  if (!filters.groups || filters.groups.length === 0) return null;

  const groupConditions: SQL[] = [];

  for (const group of filters.groups) {
    if (!group.conditions || group.conditions.length === 0) continue;

    const condSqls: SQL[] = [];
    for (const condition of group.conditions) {
      const s = buildConditionSql(condition);
      if (s) condSqls.push(s);
    }

    if (condSqls.length === 0) continue;

    if (group.logic === "or") {
      groupConditions.push(or(...condSqls)!);
    } else {
      groupConditions.push(and(...condSqls)!);
    }
  }

  if (groupConditions.length === 0) return null;

  if (filters.logic === "or") {
    return or(...groupConditions)!;
  }
  return and(...groupConditions)!;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || "";
  const subscribed = params.get("subscribed");
  const source = params.get("source");
  const filtersParam = params.get("filters");
  const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50") || 50));
  const offset = (page - 1) * limit;

  const scope = await workspaceScope(contacts.userId, session.user.id);
  const conditions: SQL[] = [scope];

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

  // Advanced filters
  if (filtersParam) {
    try {
      const filters: ContactFilters = JSON.parse(filtersParam);
      const filterSql = buildFiltersSql(filters);
      if (filterSql) conditions.push(filterSql);
    } catch {
      // Ignore invalid filter JSON
    }
  }

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
    properties: (() => { try { return r.properties ? JSON.parse(r.properties) : {}; } catch { return {}; } })()
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
