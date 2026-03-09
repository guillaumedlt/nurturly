import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";
import { workspaceScope } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isTemplate = request.nextUrl.searchParams.get("isTemplate") === "true";

  const scope = await workspaceScope(emails.userId, session.user.id);
  const rows = await db
    .select({
      id: emails.id,
      name: emails.name,
      subject: emails.subject,
      isTemplate: emails.isTemplate,
      folderId: emails.folderId,
      updatedAt: emails.updatedAt,
      createdAt: emails.createdAt,
    })
    .from(emails)
    .where(and(scope, eq(emails.isTemplate, isTemplate)))
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
  const isTemplate = body.isTemplate === true;
  const templateId = body.templateId as string | undefined;

  // If creating from a template, copy its content
  let subject = "";
  let editorContent = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
  let htmlContent: string | null = null;
  let preheaderText: string | null = null;

  if (templateId) {
    const scope = await workspaceScope(emails.userId, session.user.id);
    const [template] = await db
      .select()
      .from(emails)
      .where(and(scope, eq(emails.id, templateId)));

    if (template) {
      subject = template.subject;
      editorContent = template.editorContent;
      htmlContent = template.htmlContent;
      preheaderText = template.preheaderText;
    }
  }

  // Allow overriding subject/content from body
  if (body.subject) subject = body.subject;
  if (body.editorContent) editorContent = body.editorContent;

  const [created] = await db
    .insert(emails)
    .values({
      userId: session.user.id,
      name,
      subject,
      preheaderText,
      editorContent,
      htmlContent,
      isTemplate,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
