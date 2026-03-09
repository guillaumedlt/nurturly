import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvitations, workspaceMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserWorkspace, hasRole } from "@/lib/workspace";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ invitations: [] });
  }

  const invitations = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.workspaceId, workspace.workspaceId));

  return NextResponse.json({ invitations });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace || !hasRole(workspace.role, "admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { email, role } = body;
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (role && !["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user is already a member
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (existingUser) {
    const [existingMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspace.workspaceId),
        eq(workspaceMembers.userId, existingUser.id)
      ));
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
  }

  // Check for existing pending invitation
  const [existingInvite] = await db
    .select()
    .from(workspaceInvitations)
    .where(and(
      eq(workspaceInvitations.workspaceId, workspace.workspaceId),
      eq(workspaceInvitations.email, normalizedEmail),
      eq(workspaceInvitations.status, "pending")
    ));

  if (existingInvite) {
    return NextResponse.json({ error: "Invitation already sent to this email" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId: workspace.workspaceId,
      email: normalizedEmail,
      role: role || "member",
      invitedBy: session.user.id,
      expiresAt,
    })
    .returning();

  // TODO: Send invitation email with accept link containing invitation.token

  return NextResponse.json(invitation, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace || !hasRole(workspace.role, "admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { invitationId } = body;

  await db
    .delete(workspaceInvitations)
    .where(and(
      eq(workspaceInvitations.id, invitationId),
      eq(workspaceInvitations.workspaceId, workspace.workspaceId)
    ));

  return NextResponse.json({ ok: true });
}
