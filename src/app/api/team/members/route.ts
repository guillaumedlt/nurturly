import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers, users } from "@/lib/db/schema";
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
    return NextResponse.json({ members: [] });
  }

  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspace.workspaceId));

  return NextResponse.json({ members });
}

export async function PATCH(request: NextRequest) {
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

  const { memberId, role } = body;
  if (!memberId || !role || !["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Can't change owner role
  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.workspaceId)));

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 });
  }

  // Only owners can promote to admin
  if (role === "admin" && !hasRole(workspace.role, "owner")) {
    return NextResponse.json({ error: "Only owners can promote to admin" }, { status: 403 });
  }

  await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.workspaceId)));

  return NextResponse.json({ ok: true });
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

  const { memberId } = body;

  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.workspaceId)));

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot remove workspace owner" }, { status: 403 });
  }
  // Admins can only remove members, not other admins
  if (target.role === "admin" && !hasRole(workspace.role, "owner")) {
    return NextResponse.json({ error: "Only owners can remove admins" }, { status: 403 });
  }

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.workspaceId)));

  return NextResponse.json({ ok: true });
}
