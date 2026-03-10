import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigurations, contacts, contactProperties, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody, isErrorResponse } from "@/lib/api-utils";

const SYSTEM_PROMPT = `You are a CRM data enrichment assistant. You will be given a contact's information and a prompt describing what to generate for this contact.

Analyze the contact data and respond with ONLY the generated value — no explanations, no quotes, no formatting. Just the raw value.

Examples:
- If asked "What industry is this person likely in?", respond: "SaaS / Technology"
- If asked "Write a one-line summary of this contact", respond: "Senior marketing executive at a mid-size e-commerce company"
- If asked "Score this lead from 1-10", respond: "7"

Rules:
- Return ONLY the value, nothing else
- Keep responses concise (1-3 sentences max unless the prompt asks for more)
- If you cannot determine the answer from the data provided, respond with "Unknown"
- Use the contact's language if discernible, otherwise use English`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (isErrorResponse(body)) return body;

  const { contactId, propertyId, configId } = body;
  if (!contactId || !propertyId) {
    return NextResponse.json({ error: "contactId and propertyId are required" }, { status: 400 });
  }

  // Fetch contact
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, session.user.id)));
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Fetch property
  const [prop] = await db
    .select()
    .from(contactProperties)
    .where(and(eq(contactProperties.id, propertyId), eq(contactProperties.userId, session.user.id)));
  if (!prop || prop.type !== "ai" || !prop.aiPrompt) {
    return NextResponse.json({ error: "AI property not found or misconfigured" }, { status: 404 });
  }

  // Resolve AI config: use property's config, provided configId, or default
  let provider: string;
  let apiKey: string;
  let model: string;

  const resolveConfigId = configId || prop.aiConfigId;

  if (resolveConfigId) {
    const [config] = await db
      .select()
      .from(aiConfigurations)
      .where(and(eq(aiConfigurations.id, resolveConfigId), eq(aiConfigurations.userId, session.user.id)));
    if (!config) {
      return NextResponse.json({ error: "AI configuration not found" }, { status: 404 });
    }
    provider = config.provider;
    apiKey = config.apiKey;
    model = config.model;
  } else {
    // Fallback to default config, then legacy
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

  // Build contact context
  let properties: Record<string, unknown> = {};
  try { properties = contact.properties ? JSON.parse(contact.properties) : {}; } catch { /* */ }

  const contactContext = [
    `Email: ${contact.email}`,
    contact.firstName && `First name: ${contact.firstName}`,
    contact.lastName && `Last name: ${contact.lastName}`,
    contact.company && `Company: ${contact.company}`,
    contact.jobTitle && `Job title: ${contact.jobTitle}`,
    contact.phone && `Phone: ${contact.phone}`,
    contact.tags && `Tags: ${contact.tags}`,
    `Subscribed: ${contact.subscribed ? "Yes" : "No"}`,
    `Source: ${contact.source}`,
    ...Object.entries(properties).map(([k, v]) => v ? `${k}: ${v}` : null),
  ].filter(Boolean).join("\n");

  const userPrompt = `Contact information:\n${contactContext}\n\nTask: ${prop.aiPrompt}`;

  try {
    const value = await callLLM(provider, apiKey, model, SYSTEM_PROMPT, userPrompt);

    // Auto-save the generated value to the contact
    const newProps = { ...properties, [prop.name]: value };
    await db
      .update(contacts)
      .set({ properties: JSON.stringify(newProps), updatedAt: new Date() })
      .where(eq(contacts.id, contactId));

    return NextResponse.json({ value });
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
): Promise<string> {
  let responseText: string;

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 500,
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
        max_tokens: 500,
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
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
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

  return responseText.trim();
}
