import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sequences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sequenceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sequenceId } = await params;

  const [sequence] = await db
    .select()
    .from(sequences)
    .where(and(eq(sequences.id, sequenceId), eq(sequences.userId, session.user.id)));

  if (!sequence) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(sequence);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sequenceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sequenceId } = await params;
  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.triggerType !== undefined) updates.triggerType = body.triggerType;
  if (body.triggerListId !== undefined) updates.triggerListId = body.triggerListId || null;
  if (body.workflowData !== undefined) updates.workflowData = body.workflowData;

  const [updated] = await db
    .update(sequences)
    .set(updates)
    .where(and(eq(sequences.id, sequenceId), eq(sequences.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sequenceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sequenceId } = await params;

  const [deleted] = await db
    .delete(sequences)
    .where(and(eq(sequences.id, sequenceId), eq(sequences.userId, session.user.id)))
    .returning({ id: sequences.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
