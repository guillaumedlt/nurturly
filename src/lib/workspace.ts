import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, inArray, SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Get the user's current workspace (first one they belong to).
 * In the future, we can support workspace switching.
 */
export async function getUserWorkspace(userId: string) {
  const [membership] = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      role: workspaceMembers.role,
      ownerId: workspaces.ownerId,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return membership || null;
}

/**
 * Check if user has at least the given role in the workspace.
 */
export function hasRole(userRole: string, requiredRole: "owner" | "admin" | "member"): boolean {
  const hierarchy = { owner: 3, admin: 2, member: 1 };
  return (hierarchy[userRole as keyof typeof hierarchy] || 0) >= hierarchy[requiredRole];
}

/**
 * Get all user IDs that belong to the same workspace as the given user.
 * This enables workspace-wide data sharing: all team members see the same data.
 */
export async function getWorkspaceUserIds(userId: string): Promise<string[]> {
  const workspace = await getUserWorkspace(userId);
  if (!workspace) return [userId];

  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspace.workspaceId));

  return members.map((m) => m.userId);
}

/**
 * Create a workspace-scoped condition for a userId column.
 * Returns `inArray(column, [user1, user2, ...])` for all workspace members,
 * or `eq(column, userId)` if user has no workspace.
 */
export async function workspaceScope(column: PgColumn, userId: string): Promise<SQL> {
  const userIds = await getWorkspaceUserIds(userId);
  if (userIds.length === 1) return eq(column, userIds[0]);
  return inArray(column, userIds);
}
