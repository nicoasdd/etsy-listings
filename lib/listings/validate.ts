import type { WhoMade, WhenMade } from "@/lib/types/etsy";
import type { ValidationError } from "@/lib/types/app";

const KNOWN_FIELDS = new Set([
  "quantity", "title", "description", "price", "who_made", "when_made",
  "taxonomy_id", "shipping_profile_id", "return_policy_id", "materials",
  "shop_section_id", "processing_min", "processing_max", "tags", "styles",
  "item_weight", "item_length", "item_width", "item_height",
  "item_weight_unit", "item_dimensions_unit", "is_personalizable",
  "personalization_is_required", "personalization_char_count_max",
  "personalization_instructions", "production_partner_ids", "image_ids",
  "is_supply", "is_customizable", "should_auto_renew", "is_taxable", "type",
]);

const WHO_MADE_VALUES: WhoMade[] = ["i_did", "someone_else", "collective"];

const WHEN_MADE_VALUES: WhenMade[] = [
  "made_to_order",
  "2020_2026",
  "2010_2019",
  "2007_2009",
  "before_2007",
  "2000_2006",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
  "1940s",
  "1930s",
  "1920s",
  "1910s",
  "1900s",
  "1800s",
  "1700s",
  "before_1700",
];

function validateSingleListing(
  listing: Record<string, unknown>,
  index: number
): ValidationError | null {
  const errors: string[] = [];
  const title =
    typeof listing.title === "string" && listing.title.length > 0
      ? listing.title
      : "(no title)";

  if (typeof listing.title !== "string" || listing.title.length === 0) {
    errors.push("Missing required field: title");
  } else if (listing.title.length > 140) {
    errors.push("title must be 140 characters or fewer");
  }

  if (
    typeof listing.description !== "string" ||
    listing.description.length === 0
  ) {
    errors.push("Missing required field: description");
  }

  if (typeof listing.price !== "number" || listing.price <= 0) {
    errors.push("Missing or invalid required field: price (must be a positive number)");
  }

  if (typeof listing.quantity !== "number" || listing.quantity <= 0 || !Number.isInteger(listing.quantity)) {
    errors.push("Missing or invalid required field: quantity (must be a positive integer)");
  }

  if (typeof listing.taxonomy_id !== "number" || listing.taxonomy_id <= 0 || !Number.isInteger(listing.taxonomy_id)) {
    errors.push("Missing or invalid required field: taxonomy_id (must be a positive integer)");
  }

  if (
    typeof listing.who_made !== "string" ||
    !WHO_MADE_VALUES.includes(listing.who_made as WhoMade)
  ) {
    errors.push(
      `Invalid who_made value: '${listing.who_made ?? ""}'. Must be one of: ${WHO_MADE_VALUES.join(", ")}`
    );
  }

  if (
    typeof listing.when_made !== "string" ||
    !WHEN_MADE_VALUES.includes(listing.when_made as WhenMade)
  ) {
    errors.push(
      `Invalid when_made value: '${listing.when_made ?? ""}'. Must be one of: ${WHEN_MADE_VALUES.join(", ")}`
    );
  }

  if (listing.tags && Array.isArray(listing.tags) && listing.tags.length > 13) {
    errors.push("tags must have 13 or fewer items");
  }

  if (listing.styles && Array.isArray(listing.styles) && listing.styles.length > 2) {
    errors.push("styles must have 2 or fewer items");
  }

  if (listing.image_ids && Array.isArray(listing.image_ids) && listing.image_ids.length > 10) {
    errors.push("image_ids must have 10 or fewer items");
  }

  if (errors.length === 0) return null;
  return { index, title, errors };
}

/**
 * Validates an array of parsed listing objects.
 * Returns an array of per-listing errors (empty if all valid).
 */
export function validateListings(
  listings: unknown[]
): ValidationError[] {
  const allErrors: ValidationError[] = [];

  for (let i = 0; i < listings.length; i++) {
    const item = listings[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      allErrors.push({
        index: i,
        title: "(invalid)",
        errors: ["Each listing must be a JSON object"],
      });
      continue;
    }
    const error = validateSingleListing(
      item as Record<string, unknown>,
      i
    );
    if (error) allErrors.push(error);
  }

  return allErrors;
}

/**
 * Returns per-listing warnings for unrecognized fields.
 * These are non-blocking — the upload still proceeds.
 */
export function getWarnings(
  listings: unknown[]
): { index: number; warnings: string[] }[] {
  const allWarnings: { index: number; warnings: string[] }[] = [];

  for (let i = 0; i < listings.length; i++) {
    const item = listings[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;

    const warnings: string[] = [];
    for (const key of Object.keys(item as Record<string, unknown>)) {
      if (!KNOWN_FIELDS.has(key)) {
        warnings.push(`Unrecognized field "${key}" will be sent to Etsy (may be ignored or cause an error)`);
      }
    }
    if (warnings.length > 0) allWarnings.push({ index: i, warnings });
  }

  return allWarnings;
}

/**
 * Parses raw JSON input and normalizes to an array.
 * Throws if JSON syntax is invalid.
 */
export function parseAndNormalize(raw: string): unknown[] {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null) return [parsed];
  throw new Error("Input must be a JSON object or array of objects");
}
