# Research: ChatGPT Image-Based Listing Generator

**Feature**: 003-chatgpt-image-listing | **Date**: 2026-03-20

## R1: How to send images via the Codex backend Responses API

**Decision**: Extend the existing `sendChatGPTPrompt` function (or create a new `sendChatGPTImagePrompt` variant) that includes an `input_image` content block alongside the `input_text` content block in the user message. The image is sent as a base64-encoded data URL.

The payload shape for image + text:

```json
{
  "model": "gpt-5.4",
  "instructions": "System prompt with Etsy best practices...",
  "store": false,
  "stream": true,
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_image",
          "image_url": "data:image/jpeg;base64,{base64data}"
        },
        {
          "type": "input_text",
          "text": "Brief product description from user"
        }
      ]
    }
  ]
}
```

**Rationale**: The OpenAI Responses API (both Platform and Codex backend) supports multi-modal input via the `content` array. The `input_image` type accepts base64 data URLs (`data:image/{format};base64,...`) or fully qualified URLs. Since we receive the image as a file upload on the server, base64 encoding is the natural approach — no need to host the image anywhere. The existing `sendChatGPTPrompt` already uses the Responses API format with `input` array and `content` blocks; extending it for images is a minimal change.

**Alternatives considered**:
- **Hosting the image temporarily and sending a URL**: Requires a file hosting service or exposing a local endpoint. Violates Constitution Principle V (Simplicity). Rejected.
- **Using the Files API to upload to OpenAI first**: The Files API is a Platform API feature. ChatGPT OAuth tokens likely don't have access to it. Also adds an extra round-trip. Rejected.
- **Sending the image in a separate request**: The Responses API supports multi-part content in a single message. No reason to split. Rejected.

## R2: Image size limits and format considerations

**Decision**: Accept JPEG, PNG, and WebP uploads up to 20 MB. Convert the file to base64 on the server side before sending to ChatGPT. Use the `detail` parameter implicitly (default/auto) to let the model decide the appropriate resolution.

Image token cost estimates (GPT-4o+ models):
- `low` detail: 85 tokens (512x512)
- `high` detail: ~765 tokens for 1024x1024, up to ~1,105 tokens for large images
- `auto`: model selects based on image complexity

For typical product photos (1-5 MB JPEG), expect 500-1,500 tokens per image, well within the 128K context window.

**Rationale**: 20 MB is a generous limit that covers high-resolution product photos from smartphones and cameras. JPEG, PNG, and WebP cover virtually all product photography. Base64 encoding increases payload size by ~33%, so a 20 MB image becomes ~27 MB base64, which is within typical HTTP request limits for local applications. The `auto` detail level balances cost and quality without requiring user configuration.

**Alternatives considered**:
- **Client-side image resizing before upload**: Would reduce payload size but adds client-side complexity and may degrade image quality for detail-sensitive products (jewelry, engravings). Rejected for now; can be added later if needed.
- **Smaller file limit (5 MB)**: Too restrictive for RAW-converted or high-res product photos. 20 MB is a practical ceiling.

## R3: Getting structured JSON output from ChatGPT via the Codex backend

**Decision**: Use prompt-based JSON instruction in the `instructions` field (system prompt) to request structured JSON output. Parse the response text as JSON on the server, with error handling for malformed responses.

The system prompt will explicitly instruct ChatGPT to:
1. Respond ONLY with a JSON object (no markdown fences, no commentary)
2. Follow a specific schema with named fields
3. Include all required fields

If the response contains markdown code fences (```json ... ```), the server will strip them before parsing. If parsing fails, return a user-friendly error and allow retry.

**Rationale**: The Codex backend endpoint (`chatgpt.com/backend-api/codex/responses`) may not support the `response_format` / `text.format` parameter that the Platform API offers for structured outputs. Since we cannot guarantee structured output enforcement at the API level, robust prompt engineering combined with defensive parsing is the reliable approach. GPT-4o and newer models follow JSON formatting instructions with high fidelity when the system prompt is explicit.

**Alternatives considered**:
- **Using `response_format: { type: "json_schema", json_schema: {...} }`**: The Platform API supports this, but the Codex backend is a different endpoint with potentially different parameter support. If the Codex backend does support it, this can be added as an enhancement. Deferred.
- **Using function calling / tools**: Requires the Codex backend to support the `tools` parameter. Uncertain support. Also adds complexity to the payload and response parsing. Rejected.
- **Post-processing with a second prompt**: If the first response isn't valid JSON, send a follow-up prompt asking ChatGPT to fix it. Adds latency and complexity. The simpler approach is to retry the original request. Rejected.

## R4: Etsy listing SEO best practices (March 2026) for the system prompt

**Decision**: Encode the following Etsy SEO best practices into the system prompt. The prompt instructs ChatGPT to apply these when generating listing fields.

### Title Optimization (max 140 characters)
- **Front-load primary keywords** in the first 40 characters (mobile search truncation)
- Use the formula: **Primary keyword + Key attribute + Style/Use case + Audience/Occasion**
- Separate phrases with commas for readability
- Avoid keyword stuffing; titles should read naturally when spoken aloud
- Include 2-3 distinct, high-value long-tail phrases
- No excessive symbols (!!!, ***, ===); use commas or pipes (|)
- No repetitive phrasing (e.g., "Gift for Mom - Mother's Day Gift - Custom Gift")

### Description Optimization
- **First 160 characters** serve as meta description for external search (Google, Bing) — make it a keyword-rich, compelling summary
- Use storytelling: explain why the product was made, materials quality, craftsmanship
- Include bullet points for technical specs: dimensions, weight, materials, care instructions
- Weave keywords naturally into descriptive sentences rather than listing them
- Structure: Hook (1-2 sentences) → Benefits ("why") → Details (bulleted specs) → Trust (quality commitment) → CTA ("Favorite this item")
- Etsy's NLP understands semantic relationships (e.g., "macrame wall hanging" relates to "boho wedding decor")

### Tags Strategy (max 13 tags, 20 characters each)
- **Use all 13 tag slots** — leaving tags empty is leaving discoverability on the table
- Use multi-word phrases per tag (e.g., "handmade gift" not separate "handmade" and "gift")
- Include long-tail keyword variations that buyers actually search
- Avoid duplicating exact phrases already in the title
- Cover: material variants, style descriptors, use cases, occasions, recipient types
- Include semantic relatives and synonyms (e.g., "dangle earrings" + "drop earrings")
- Use Etsy autocomplete-style phrases

### Materials
- List all materials accurately using common buyer-search terms
- Include specific qualifiers when relevant (e.g., "OEKO-TEX certified linen" not just "linen")

### Category Suggestion
- Suggest the most specific Etsy category name (the AI cannot know exact taxonomy IDs)
- The user maps the suggestion to an actual taxonomy_id

### Attributes and Styles
- Suggest up to 2 styles that describe the product aesthetic
- Attributes (color, material, occasion) are "free tags" — don't waste tag slots on them

**Rationale**: These best practices are sourced from multiple 2026 Etsy SEO guides and reflect the current state of Etsy's AI-driven search algorithm. Key shifts in 2026 include: NLP-powered semantic matching (not just exact keyword matching), Listing Quality Score based on conversion rates, mobile-first title truncation at ~40 characters, and the importance of description crawling for SEO signals.

**Alternatives considered**:
- **Making the system prompt user-editable**: Adds UI complexity and most users are not prompt engineers. The curated prompt is maintained by the developer. Advanced users can modify the source code. Rejected for initial release.
- **Fetching best practices dynamically**: No reliable API for this. Best practices change slowly (annually). A hardcoded prompt updated with each app release is sufficient. Rejected.

## R5: Generated fields schema and what the AI should vs. should not generate

**Decision**: ChatGPT generates the following fields:

| Field | Generated? | Notes |
|-------|-----------|-------|
| `title` | Yes | SEO-optimized, max 140 chars |
| `description` | Yes | Detailed, keyword-rich, structured |
| `tags` | Yes | Array of 10-13 tags, max 20 chars each |
| `materials` | Yes | Array of material strings |
| `styles` | Yes | Array of 0-2 style strings |
| `suggested_category` | Yes | Plain-text category name (not taxonomy_id) |
| `price` | No | Business decision — user provides |
| `quantity` | No | Business decision — user provides |
| `who_made` | No | Business decision — user provides |
| `when_made` | No | Business decision — user provides |
| `taxonomy_id` | No | Requires exact Etsy ID — user maps from suggested_category |
| `shipping_profile_id` | No | Account-specific — user provides if needed |

**Rationale**: The AI excels at creative content (titles, descriptions, tags) and factual extraction (materials from image). It cannot determine business specifics like pricing, inventory levels, or production history. The `taxonomy_id` requires an exact numeric ID from Etsy's taxonomy tree, which the AI cannot reliably provide — suggesting the category name in plain text is more useful and the user maps it.

## R6: Timeout considerations for image+generation requests

**Decision**: Increase the request timeout from 30 seconds (current `sendChatGPTPrompt`) to 60 seconds for image-based generation requests. Image analysis + structured JSON generation is a heavier workload than simple text prompts.

**Rationale**: Image processing adds latency: the model must analyze the image pixels, identify the product, reason about materials and aesthetics, then compose a structured JSON response with SEO-optimized content. 30 seconds may be insufficient for complex products. 60 seconds provides comfortable headroom while still failing fast enough to be useful.

**Alternatives considered**:
- **Same 30-second timeout**: Risk of false timeouts on legitimate image analysis. Rejected.
- **Longer timeout (120 seconds)**: Too long — if ChatGPT hasn't responded in 60 seconds, something is likely wrong. The user experience degrades past 60 seconds. Rejected.
- **Configurable timeout**: Over-engineering for this use case. Rejected.
