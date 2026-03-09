import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sequences } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createDefaultWorkflow } from "@/lib/sequences/types";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: sequences.id,
      name: sequences.name,
      description: sequences.description,
      status: sequences.status,
      triggerType: sequences.triggerType,
      totalEnrolled: sequences.totalEnrolled,
      totalCompleted: sequences.totalCompleted,
      folderId: sequences.folderId,
      createdAt: sequences.createdAt,
      updatedAt: sequences.updatedAt,
    })
    .from(sequences)
    .where(eq(sequences.userId, session.user.id))
    .orderBy(desc(sequences.updatedAt));

  return NextResponse.json({ sequences: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
  const name = (body.name as string)?.trim() || "Untitled sequence";
  const workflowData = (body.workflowData as string) || JSON.stringify(createDefaultWorkflow());

  const [created] = await db
    .insert(sequences)
    .values({
      userId: session.user.id,
      name,
      status: "draft",
      workflowData,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
