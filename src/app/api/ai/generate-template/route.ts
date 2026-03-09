import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigurations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

const BASE_SYSTEM_PROMPT = `You are an expert email marketing copywriter. Generate professional, conversion-optimized email content.

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
      // { "type": "buttonBlock", "attrs": { "text": "CTA text", "href": "#", "bgColor": "#000000", "textColor": "#ffffff", "align": "center", "borderRadius": 6, "size": "md" } }
      // { "type": "spacerBlock", "attrs": { "height": 24 } }
      // { "type": "dividerBlock", "attrs": { "color": "#e5e5e5", "style": "solid", "thickness": 1, "width": 100 } }
      // For variables use: { "type": "variable", "attrs": { "name": "firstName" } } inside paragraph content
    ]
  }
}

Rules:
- Include a clear CTA button
- Use spacers between sections (height 16-32)
- Use {{firstName}} variable when addressing the reader
- Return ONLY valid JSON, no markdown or code blocks`;

interface GenerateOptions {
  tone?: string;
  style?: string;
  length?: string;
  language?: string;
}

function buildSystemPrompt(options?: GenerateOptions): string {
  if (!options) return BASE_SYSTEM_PROMPT + "\n- Write professional but warm copy\n- Keep emails concise (3-6 paragraphs max)";

  const parts: string[] = [BASE_SYSTEM_PROMPT];

  // Tone
  const toneMap: Record<string, string> = {
    professional: "Write in a professional, polished tone",
    casual: "Write in a casual, conversational tone",
    friendly: "Write in a friendly, approachable tone",
    urgent: "Write with a sense of urgency and importance",
    persuasive: "Write in a persuasive, compelling tone that drives action",
  };
  parts.push(`- ${toneMap[options.tone || "professional"] || toneMap.professional}`);

  // Style
  const styleMap: Record<string, string> = {
    minimal: "Keep copy minimal and concise — short sentences, no fluff",
    detailed: "Write detailed, thorough copy that explains value clearly",
    storytelling: "Use storytelling techniques — paint a picture, create narrative flow",
    bullet_points: "Use bullet points and short paragraphs for easy scanning",
  };
  parts.push(`- ${styleMap[options.style || "detailed"] || styleMap.detailed}`);

  // Length
  const lengthMap: Record<string, string> = {
    short: "Keep the email very short (2-3 paragraphs max)",
    medium: "Keep emails concise (4-6 paragraphs)",
    long: "Write a comprehensive email (7+ paragraphs with sections)",
  };
  parts.push(`- ${lengthMap[options.length || "medium"] || lengthMap.medium}`);

  // Language
  const lang = options.language || "english";
  if (lang !== "english") {
    parts.push(`- Write the ENTIRE email in ${lang} (subject, preheader, and all content)`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { prompt, configId, options } = body;
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  let provider: string;
  let apiKey: string;
  let model: string;

  if (configId) {
    // Use specific AI config
    const [config] = await db
      .select()
      .from(aiConfigurations)
      .where(and(eq(aiConfigurations.id, configId), eq(aiConfigurations.userId, session.user.id)));

    if (!config) {
      return NextResponse.json({ error: "AI configuration not found" }, { status: 404 });
    }
    provider = config.provider;
    apiKey = config.apiKey;
    model = config.model;
  } else {
    // Fallback: try default config, then legacy user columns
    const [defaultConfig] = await db
      .select()
      .from(aiConfigurations)
      .where(and(eq(aiConfigurations.userId, session.user.id), eq(aiConfigurations.isDefault, true)))
      .limit(1);

    if (defaultConfig) {
      provider = defaultConfig.provider;
      apiKey = defaultConfig.apiKey;
      model = defaultConfig.model;
    } else {
      // Legacy fallback
      const [user] = await db
        .select({ aiProvider: users.aiProvider, aiApiKey: users.aiApiKey, aiModel: users.aiModel })
        .from(users)
        .where(eq(users.id, session.user.id));

      if (!user?.aiApiKey || !user?.aiProvider || !user?.aiModel) {
        return NextResponse.json(
          { error: "AI not configured. Go to Settings > AI to add your API key." },
          { status: 400 }
        );
      }
      provider = user.aiProvider;
      apiKey = user.aiApiKey;
      model = user.aiModel;
    }
  }

  const systemPrompt = buildSystemPrompt(options as GenerateOptions);

  try {
    const result = await callLLM(provider, apiKey, model, systemPrompt, prompt);
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
  systemPrompt: string,
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
          { role: "system", content: systemPrompt },
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
        system: systemPrompt,
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
                { text: `${systemPrompt}\n\nUser request: ${prompt}` },
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
