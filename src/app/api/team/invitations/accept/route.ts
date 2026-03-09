import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvitations, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(and(
      eq(workspaceInvitations.token, token),
      eq(workspaceInvitations.status, "pending")
    ));

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  // Check expiration
  if (new Date() > new Date(invitation.expiresAt)) {
    await db
      .update(workspaceInvitations)
      .set({ status: "expired" })
      .where(eq(workspaceInvitations.id, invitation.id));
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  // Check email matches the logged-in user
  // Note: we could also allow any logged-in user to accept if the invite was generic
  // For now, email must match
  if (invitation.email !== session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "This invitation was sent to a different email" }, { status: 403 });
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, invitation.workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ));

  if (existing) {
    await db
      .update(workspaceInvitations)
      .set({ status: "accepted" })
      .where(eq(workspaceInvitations.id, invitation.id));
    return NextResponse.json({ ok: true, message: "Already a member" });
  }

  // Add as member
  await db.insert(workspaceMembers).values({
    workspaceId: invitation.workspaceId,
    userId: session.user.id,
    role: invitation.role,
  });

  await db
    .update(workspaceInvitations)
    .set({ status: "accepted" })
    .where(eq(workspaceInvitations.id, invitation.id));

  return NextResponse.json({ ok: true });
}
