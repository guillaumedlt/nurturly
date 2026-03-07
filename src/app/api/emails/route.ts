import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: emails.id,
      name: emails.name,
      subject: emails.subject,
      updatedAt: emails.updatedAt,
      createdAt: emails.createdAt,
    })
    .from(emails)
    .where(eq(emails.userId, session.user.id))
    .orderBy(desc(emails.updatedAt));

  return NextResponse.json({ emails: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name as string)?.trim() || "Untitled email";

  const [created] = await db
    .insert(emails)
    .values({
      userId: session.user.id,
      name,
      subject: "",
      editorContent: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
