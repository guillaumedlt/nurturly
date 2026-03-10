import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { contactProperties } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(contactProperties)
    .where(eq(contactProperties.userId, session.user.id))
    .orderBy(asc(contactProperties.position));

  const parsed = rows.map((r) => ({
    ...r,
    options: r.options ? JSON.parse(r.options) : null,
  }));

  return NextResponse.json({ properties: parsed });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  if (!body.label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  // Generate name from label (snake_case)
  const name = body.label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const propType = body.type || "text";
  const [created] = await db
    .insert(contactProperties)
    .values({
      userId: session.user.id,
      name,
      label: body.label.trim(),
      type: propType,
      groupName: body.groupName || "Custom",
      options: body.options ? JSON.stringify(body.options) : null,
      aiPrompt: propType === "ai" ? (body.aiPrompt || null) : null,
      aiConfigId: propType === "ai" ? (body.aiConfigId || null) : null,
      required: body.required || false,
      position: body.position ?? 0,
    })
    .returning();

  return NextResponse.json({
    ...created,
    options: created.options ? JSON.parse(created.options) : null,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  if (!body.id) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label.trim();
  if (body.groupName !== undefined) updates.groupName = body.groupName;
  if (body.options !== undefined) updates.options = body.options ? JSON.stringify(body.options) : null;
  if (body.required !== undefined) updates.required = body.required;
  if (body.position !== undefined) updates.position = body.position;
  if (body.aiPrompt !== undefined) updates.aiPrompt = body.aiPrompt;
  if (body.aiConfigId !== undefined) updates.aiConfigId = body.aiConfigId;

  const [updated] = await db
    .update(contactProperties)
    .set(updates)
    .where(and(eq(contactProperties.id, body.id), eq(contactProperties.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...updated,
    options: updated.options ? JSON.parse(updated.options) : null,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  if (!body.id) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  await db
    .delete(contactProperties)
    .where(and(eq(contactProperties.id, body.id), eq(contactProperties.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
