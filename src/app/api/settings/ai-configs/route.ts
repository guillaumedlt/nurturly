import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigurations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

const VALID_PROVIDERS = ["openai", "anthropic", "google"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await db
    .select()
    .from(aiConfigurations)
    .where(eq(aiConfigurations.userId, session.user.id))
    .orderBy(aiConfigurations.createdAt);

  const masked = configs.map((c) => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    model: c.model,
    maskedKey: `${c.apiKey.slice(0, 8)}...${c.apiKey.slice(-4)}`,
    isDefault: c.isDefault,
    createdAt: c.createdAt,
  }));

  return NextResponse.json({ configs: masked });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { name, provider, apiKey, model } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }
  if (!model?.trim()) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }

  // Check if this is the first config — make it default
  const existing = await db
    .select({ id: aiConfigurations.id })
    .from(aiConfigurations)
    .where(eq(aiConfigurations.userId, session.user.id));

  const isDefault = existing.length === 0;

  const [created] = await db
    .insert(aiConfigurations)
    .values({
      userId: session.user.id,
      name: name.trim(),
      provider,
      apiKey: apiKey.trim(),
      model,
      isDefault,
    })
    .returning();

  return NextResponse.json({
    id: created.id,
    name: created.name,
    provider: created.provider,
    model: created.model,
    maskedKey: `${created.apiKey.slice(0, 8)}...${created.apiKey.slice(-4)}`,
    isDefault: created.isDefault,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { id, name, provider, apiKey, model, isDefault } = body;

  if (!id) {
    return NextResponse.json({ error: "Config id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name.trim();
  if (provider !== undefined) {
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    updates.provider = provider;
  }
  if (apiKey !== undefined && apiKey.trim()) updates.apiKey = apiKey.trim();
  if (model !== undefined) updates.model = model;

  // If setting as default, unset all others first
  if (isDefault === true) {
    await db
      .update(aiConfigurations)
      .set({ isDefault: false })
      .where(eq(aiConfigurations.userId, session.user.id));
    updates.isDefault = true;
  }

  const [updated] = await db
    .update(aiConfigurations)
    .set(updates)
    .where(and(eq(aiConfigurations.id, id), eq(aiConfigurations.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    provider: updated.provider,
    model: updated.model,
    maskedKey: `${updated.apiKey.slice(0, 8)}...${updated.apiKey.slice(-4)}`,
    isDefault: updated.isDefault,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "Config id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(aiConfigurations)
    .where(and(eq(aiConfigurations.id, id), eq(aiConfigurations.userId, session.user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  // If deleted was default, promote the first remaining config
  if (deleted.isDefault) {
    const remaining = await db
      .select({ id: aiConfigurations.id })
      .from(aiConfigurations)
      .where(eq(aiConfigurations.userId, session.user.id))
      .limit(1);
    if (remaining.length > 0) {
      await db
        .update(aiConfigurations)
        .set({ isDefault: true })
        .where(eq(aiConfigurations.id, remaining[0].id));
    }
  }

  return NextResponse.json({ success: true });
}
