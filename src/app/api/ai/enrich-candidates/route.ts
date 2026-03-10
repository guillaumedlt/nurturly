import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, contactProperties, listMemberships, lists } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { propertyId, contactIds, listId, limit = 50, skipExisting = true } = body;

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  // Validate property exists and is AI type
  const [prop] = await db
    .select()
    .from(contactProperties)
    .where(and(eq(contactProperties.id, propertyId), eq(contactProperties.userId, session.user.id)));

  if (!prop || prop.type !== "ai") {
    return NextResponse.json({ error: "AI property not found" }, { status: 404 });
  }

  const scope = await workspaceScope(contacts.userId, session.user.id);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 500);

  let candidateIds: string[];

  if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
    // Specific contacts provided
    candidateIds = contactIds.slice(0, safeLimit);
  } else if (listId) {
    // From an audience
    const [list] = await db.select().from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, session.user.id)));
    if (!list) {
      return NextResponse.json({ error: "Audience not found" }, { status: 404 });
    }

    // Get member IDs from list
    const members = await db
      .select({ id: contacts.id, properties: contacts.properties })
      .from(listMemberships)
      .innerJoin(contacts, eq(listMemberships.contactId, contacts.id))
      .where(eq(listMemberships.listId, listId))
      .limit(safeLimit * 2); // fetch extra to account for filtering

    if (skipExisting) {
      candidateIds = members
        .filter((m) => {
          try {
            const props = m.properties ? JSON.parse(m.properties) : {};
            return !props[prop.name] || String(props[prop.name]).trim() === "";
          } catch { return true; }
        })
        .map((m) => m.id)
        .slice(0, safeLimit);
    } else {
      candidateIds = members.map((m) => m.id).slice(0, safeLimit);
    }
  } else {
    // All contacts
    const rows = await db
      .select({ id: contacts.id, properties: contacts.properties })
      .from(contacts)
      .where(scope)
      .orderBy(desc(contacts.createdAt))
      .limit(safeLimit * 2);

    if (skipExisting) {
      candidateIds = rows
        .filter((r) => {
          try {
            const props = r.properties ? JSON.parse(r.properties) : {};
            return !props[prop.name] || String(props[prop.name]).trim() === "";
          } catch { return true; }
        })
        .map((r) => r.id)
        .slice(0, safeLimit);
    } else {
      candidateIds = rows.map((r) => r.id).slice(0, safeLimit);
    }
  }

  // Get total count for context
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(scope);

  return NextResponse.json({
    candidates: candidateIds,
    total: totalRow.count,
    propertyName: prop.name,
    propertyLabel: prop.label,
  });
}
