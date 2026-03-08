import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending not configured. Add RESEND_API_KEY to your environment variables." },
      { status: 500 }
    );
  }

  const { emailId } = await params;
  const { to } = await request.json();

  if (!to || typeof to !== "string" || !to.includes("@")) {
    return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
  }

  const [email] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, emailId), eq(emails.userId, session.user.id)));

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  if (!email.htmlContent) {
    return NextResponse.json(
      { error: "Save the email first to generate HTML content" },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Nurturly <onboarding@resend.dev>",
    to: [to],
    subject: `[Test] ${email.subject || "Untitled"}`,
    html: email.htmlContent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
