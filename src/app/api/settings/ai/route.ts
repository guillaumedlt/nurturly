import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      aiProvider: users.aiProvider,
      aiApiKey: users.aiApiKey,
      aiModel: users.aiModel,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mask the API key for display
  const maskedKey = user.aiApiKey
    ? `${user.aiApiKey.slice(0, 8)}...${user.aiApiKey.slice(-4)}`
    : null;

  return NextResponse.json({
    provider: user.aiProvider || null,
    apiKey: maskedKey,
    hasApiKey: !!user.aiApiKey,
    model: user.aiModel || null,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const updates: Record<string, unknown> = {};

  if (body.provider !== undefined) {
    const valid = ["openai", "anthropic", "google", null];
    if (!valid.includes(body.provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    updates.aiProvider = body.provider;
  }

  if (body.apiKey !== undefined) {
    updates.aiApiKey = body.apiKey || null;
  }

  if (body.model !== undefined) {
    updates.aiModel = body.model || null;
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
