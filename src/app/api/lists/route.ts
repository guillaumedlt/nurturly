import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await workspaceScope(lists.userId, session.user.id);
  const rows = await db.select().from(lists)
    .where(scope)
    .orderBy(desc(lists.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [created] = await db.insert(lists).values({
    userId: session.user.id,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    type: body.type || "static",
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
