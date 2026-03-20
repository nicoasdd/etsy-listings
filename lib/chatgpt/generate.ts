import { collectStreamedResponse } from "@/lib/chatgpt/api";
import type { GeneratedListingFields } from "@/lib/types/chatgpt";

const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";
const IMAGE_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_MODEL = "gpt-5.4";

export const ETSY_LISTING_SYSTEM_PROMPT = `You are an expert Etsy listing copywriter and SEO specialist (March 2026 best practices). Analyze the provided product image and optional description, then generate optimized listing fields.

Respond ONLY with a valid JSON object — no markdown fences, no commentary, no explanation. The JSON must match this exact schema:

{
  "title": "string (max 140 chars)",
  "description": "string",
  "tags": ["string array, 10-13 items, each max 20 chars"],
  "materials": ["string array"],
  "styles": ["string array, 0-2 items"],
  "suggested_category": "string"
}

TITLE RULES (max 140 characters):
- Front-load primary keywords in the first 40 characters (mobile search truncation)
- Formula: Primary keyword + Key attribute + Style/Use case + Audience/Occasion
- Separate phrases with commas for readability
- Include 2-3 distinct long-tail keyword phrases
- Must read naturally when spoken aloud — no keyword stuffing
- No excessive symbols (!!!, ***, ===); use commas or pipes (|)
- No repetitive phrasing

DESCRIPTION RULES:
- First 160 characters = meta description for external search — make it a keyword-rich, compelling summary
- Structure: Hook (1-2 sentences) → Benefits → Details (bulleted specs: dimensions, weight, materials, care) → Trust → CTA
- Weave keywords naturally into descriptive sentences
- Use storytelling: explain craftsmanship, materials quality, why it was made
- Include bullet points for technical specifications

TAG RULES (exactly 13 tags, each max 20 characters):
- Use ALL 13 tag slots
- Use multi-word phrases per tag (e.g., "handmade gift" not separate "handmade" and "gift")
- Include long-tail keyword variations that buyers actually search
- Do NOT duplicate exact phrases already in the title
- Cover: material variants, style descriptors, use cases, occasions, recipient types
- Include synonyms and semantic relatives

MATERIALS RULES:
- List all visible/identifiable materials using common buyer-search terms
- Include specific qualifiers when relevant (e.g., "OEKO-TEX certified linen" not just "linen")

STYLES RULES (0-2 items):
- Suggest up to 2 style descriptors matching the product aesthetic (e.g., "Bohemian", "Minimalist", "Vintage")

CATEGORY RULES:
- Suggest the most specific Etsy category path in plain text (e.g., "Home & Living > Kitchen & Dining > Drinkware > Mugs")`;

export async function sendChatGPTImageGeneration(
  accessToken: string,
  imageBase64: string,
  mimeType: string,
  description?: string
): Promise<{ fields: GeneratedListingFields; model: string }> {
  const content: Array<Record<string, string>> = [
    {
      type: "input_image",
      image_url: `data:${mimeType};base64,${imageBase64}`,
    },
  ];

  if (description?.trim()) {
    content.push({
      type: "input_text",
      text: description.trim(),
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(CODEX_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        instructions: ETSY_LISTING_SYSTEM_PROMPT,
        store: false,
        stream: true,
        input: [
          {
            role: "user",
            content,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`ChatGPT request failed (${res.status}): ${errorBody}`);
    }

    const rawText = await collectStreamedResponse(res);
    const fields = parseGeneratedFields(rawText);
    return { fields, model: DEFAULT_MODEL };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseGeneratedFields(rawText: string): GeneratedListingFields {
  let cleaned = rawText.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "ChatGPT returned an unexpected format. Please try again."
    );
  }

  const missing: string[] = [];
  if (!parsed.title || typeof parsed.title !== "string") missing.push("title");
  if (!parsed.description || typeof parsed.description !== "string") missing.push("description");
  if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) missing.push("tags");
  if (!Array.isArray(parsed.materials) || parsed.materials.length === 0) missing.push("materials");

  if (missing.length > 0) {
    throw new Error(
      `ChatGPT response missing: ${missing.join(", ")}. Please try again.`
    );
  }

  let title = String(parsed.title);
  if (title.length > 140) {
    title = title.slice(0, 140);
  }

  let tags = (parsed.tags as unknown[]).map((t) => String(t).slice(0, 20));
  if (tags.length > 13) {
    tags = tags.slice(0, 13);
  }

  const materials = (parsed.materials as unknown[]).map((m) => String(m));

  let styles: string[] = [];
  if (Array.isArray(parsed.styles)) {
    styles = (parsed.styles as unknown[]).map((s) => String(s)).slice(0, 2);
  }

  const suggestedCategory = typeof parsed.suggested_category === "string"
    ? parsed.suggested_category
    : "";

  return {
    title,
    description: String(parsed.description),
    tags,
    materials,
    styles,
    suggested_category: suggestedCategory,
  };
}
