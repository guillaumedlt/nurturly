import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await workspaceScope(emails.userId, session.user.id);
  const rows = await db
    .select({
      id: emails.id,
      name: emails.name,
      subject: emails.subject,
      folderId: emails.folderId,
      updatedAt: emails.updatedAt,
      createdAt: emails.createdAt,
    })
    .from(emails)
    .where(scope)
    .orderBy(desc(emails.updatedAt));

  return NextResponse.json({ emails: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;
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
