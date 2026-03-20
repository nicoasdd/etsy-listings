import type { ListingPayload } from "@/lib/types/etsy";
import type { UploadResult } from "@/lib/types/app";

const ETSY_API_BASE = "https://api.etsy.com/v3/application";

const ARRAY_FIELDS = new Set([
  "tags",
  "materials",
  "styles",
  "image_ids",
  "production_partner_ids",
]);

/**
 * Converts a ListingPayload into URL-encoded form data string.
 * Array fields are encoded as repeated keys (e.g., tags[]=foo&tags[]=bar).
 */
function toFormBody(listing: ListingPayload): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(listing)) {
    if (value === undefined || value === null) continue;

    if (ARRAY_FIELDS.has(key) && Array.isArray(value)) {
      for (const item of value) {
        params.append(`${key}[]`, String(item));
      }
    } else if (typeof value === "boolean") {
      params.append(key, value ? "true" : "false");
    } else {
      params.append(key, String(value));
    }
  }

  return params.toString();
}

export async function createDraftListing(
  shopId: number,
  accessToken: string,
  apiKey: string,
  listing: ListingPayload,
  index: number
): Promise<UploadResult> {
  const url = `${ETSY_API_BASE}/shops/${shopId}/listings`;
  const title = listing.title || "(no title)";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: toFormBody(listing),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let etsyErrors: Record<string, unknown>[] = [];
      try {
        const parsed = JSON.parse(errorBody);
        etsyErrors = Array.isArray(parsed.errors)
          ? parsed.errors
          : [parsed];
      } catch {
        etsyErrors = [{ error: errorBody }];
      }

      return {
        index,
        title,
        status: "error",
        error: `Etsy API error (${response.status}): ${etsyErrors.map((e) => e.error || JSON.stringify(e)).join("; ")}`,
        etsy_errors: etsyErrors,
      };
    }

    const data = await response.json();
    const listingId = data.listing_id as number;

    return {
      index,
      title,
      status: "success",
      listing_id: listingId,
      listing_url: `https://www.etsy.com/listing/${listingId}`,
    };
  } catch (err) {
    return {
      index,
      title,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
