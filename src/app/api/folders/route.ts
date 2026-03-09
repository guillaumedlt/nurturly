import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { folders, campaigns, sequences, emails, lists, marketingCampaigns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entityType = req.nextUrl.searchParams.get("entityType");
  const where = entityType
    ? and(eq(folders.userId, session.user.id), eq(folders.entityType, entityType))
    : eq(folders.userId, session.user.id);

  const rows = await db.select().from(folders).where(where);
  return NextResponse.json({ folders: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  if (isErrorResponse(body)) return body;
  const name = (body.name as string)?.trim();
  const entityType = body.entityType as string;

  if (!name || !entityType) {
    return NextResponse.json({ error: "name and entityType required" }, { status: 400 });
  }

  const [created] = await db
    .insert(folders)
    .values({ userId: session.user.id, name, entityType })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  if (isErrorResponse(body)) return body;
  const { id, name } = body as { id: string; name: string };

  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  const [updated] = await db
    .update(folders)
    .set({ name: name.trim() })
    .where(and(eq(folders.id, id), eq(folders.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  if (isErrorResponse(body)) return body;
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Unset folderId on all items in this folder before deleting
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, session.user.id)));

  if (!folder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (folder.entityType === "transactional") {
    await db.update(campaigns).set({ folderId: null }).where(eq(campaigns.folderId, id));
  } else if (folder.entityType === "sequence") {
    await db.update(sequences).set({ folderId: null }).where(eq(sequences.folderId, id));
  } else if (folder.entityType === "email") {
    await db.update(emails).set({ folderId: null }).where(eq(emails.folderId, id));
  } else if (folder.entityType === "audience") {
    await db.update(lists).set({ folderId: null }).where(eq(lists.folderId, id));
  } else if (folder.entityType === "campaign") {
    await db.update(marketingCampaigns).set({ folderId: null }).where(eq(marketingCampaigns.folderId, id));
  }

  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
