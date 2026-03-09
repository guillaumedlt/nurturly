import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

const SYSTEM_PROMPT = `You are an expert email marketing copywriter. Generate professional, conversion-optimized email content.

Return a JSON object with this exact structure:
{
  "subject": "The email subject line (50-60 chars, compelling)",
  "preheader": "Preview text for inbox (40-80 chars)",
  "content": {
    "type": "doc",
    "content": [
      // Use these Tiptap node types:
      // { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "..." }] }
      // { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "..." }] }
      // { "type": "paragraph", "content": [{ "type": "text", "text": "..." }] }
      // { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "..." }] }
      // { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "italic" }], "text": "..." }] }
      // { "type": "buttonBlock", "attrs": { "text": "CTA text", "url": "#", "bgColor": "#000000", "textColor": "#ffffff", "align": "center", "borderRadius": 6, "paddingX": 24, "paddingY": 12 } }
      // { "type": "spacerBlock", "attrs": { "height": 24 } }
      // { "type": "dividerBlock", "attrs": { "color": "#e5e5e5", "style": "solid", "thickness": 1, "width": 100 } }
      // For variables use: { "type": "variable", "attrs": { "id": "firstName" } } inside paragraph content
    ]
  }
}

Rules:
- Keep emails concise (3-6 paragraphs max)
- Include a clear CTA button
- Use spacers between sections (height 16-32)
- Use {{firstName}} variable when addressing the reader
- Write professional but warm copy
- Return ONLY valid JSON, no markdown or code blocks`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { prompt } = body;
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Get user's AI settings
  const [user] = await db
    .select({
      aiProvider: users.aiProvider,
      aiApiKey: users.aiApiKey,
      aiModel: users.aiModel,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.aiApiKey || !user?.aiProvider || !user?.aiModel) {
    return NextResponse.json(
      { error: "AI not configured. Go to Settings > AI to add your API key." },
      { status: 400 }
    );
  }

  try {
    const result = await callLLM(
      user.aiProvider,
      user.aiApiKey,
      user.aiModel,
      prompt
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callLLM(
  provider: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ subject: string; preheader: string; content: unknown }> {
  let responseText: string;

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`);
    }
    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content || "";
  } else if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic API error: ${res.status}`);
    }
    const data = await res.json();
    responseText = data.content?.[0]?.text || "";
  } else if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nUser request: ${prompt}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Google AI error: ${res.status}`);
    }
    const data = await res.json();
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Parse the JSON response - strip markdown code blocks if present
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.subject || !parsed.content) {
      throw new Error("Invalid response structure");
    }
    return {
      subject: parsed.subject,
      preheader: parsed.preheader || "",
      content: parsed.content,
    };
  } catch {
    throw new Error("Failed to parse AI response. Try again with a different prompt.");
  }
}
