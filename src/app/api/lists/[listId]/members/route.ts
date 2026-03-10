import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, listMemberships, contacts } from "@/lib/db/schema";
import { eq, and, sql, desc, ilike, or, ne, not, isNull, isNotNull } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";
import type { ContactFilters, FilterCondition } from "@/lib/contacts/filters";
import type { SQL } from "drizzle-orm";

// ── Filter SQL builder (server-side, mirrors contacts route) ──

const COLUMN_MAP = {
  email: contacts.email,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  company: contacts.company,
  jobTitle: contacts.jobTitle,
  phone: contacts.phone,
} as const;
type ColumnMapKey = keyof typeof COLUMN_MAP;

function buildConditionSql(c: FilterCondition): SQL | null {
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

  if (c.field === "subscribed") {
    switch (c.operator) {
      case "is_true": return eq(contacts.subscribed, true);
      case "is_false": return eq(contacts.subscribed, false);
      default: return null;
    }
  }

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

  if (!(c.field in COLUMN_MAP)) return null;
  const col = COLUMN_MAP[c.field as ColumnMapKey];
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
    if (group.logic === "or") groupConditions.push(or(...condSqls)!);
    else groupConditions.push(and(...condSqls)!);
  }
  if (groupConditions.length === 0) return null;
  if (filters.logic === "or") return or(...groupConditions)!;
  return and(...groupConditions)!;
}

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

  // Dynamic list: compute members from filters
  if (list.type === "dynamic" && list.filterRules) {
    try {
      const filters: ContactFilters = JSON.parse(list.filterRules);
      const filterSql = buildFiltersSql(filters);
      const scope = await workspaceScope(contacts.userId, session.user.id);
      const conditions: SQL[] = [scope];
      if (filterSql) conditions.push(filterSql);

      const members = await db
        .select({
          id: contacts.id,
          email: contacts.email,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          company: contacts.company,
          subscribed: contacts.subscribed,
          addedAt: contacts.createdAt,
        })
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.createdAt))
        .limit(500);

      // Update contact count on list
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(and(...conditions));
      await db.update(lists).set({ contactCount: countResult.count }).where(eq(lists.id, listId));

      return NextResponse.json(members);
    } catch {
      return NextResponse.json([]);
    }
  }

  // Static list: return from memberships
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
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  const { contactIds } = body as { contactIds: string[] };

  if (!contactIds?.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const [list] = await db.select().from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (list.type === "dynamic") {
    return NextResponse.json({ error: "Cannot manually add contacts to a dynamic audience" }, { status: 400 });
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
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  const { contactId } = body as { contactId: string };

  await db.delete(listMemberships)
    .where(and(eq(listMemberships.listId, listId), eq(listMemberships.contactId, contactId)));

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(listMemberships).where(eq(listMemberships.listId, listId));
  await db.update(lists).set({ contactCount: countResult.count }).where(eq(lists.id, listId));

  return NextResponse.json({ success: true });
}
