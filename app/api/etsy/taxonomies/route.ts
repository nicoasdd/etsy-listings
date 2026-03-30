import { NextResponse } from "next/server";

const ETSY_API_BASE = "https://api.etsy.com/v3/application";

interface TaxonomyNode {
  id: number;
  level: number;
  name: string;
  parent_id: number | null;
  children: TaxonomyNode[];
}

interface FlatTaxonomy {
  id: number;
  name: string;
  full_path: string;
}

function flatten(nodes: TaxonomyNode[], parentPath = ""): FlatTaxonomy[] {
  const result: FlatTaxonomy[] = [];
  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
    result.push({ id: node.id, name: node.name, full_path: fullPath });
    if (node.children?.length) {
      result.push(...flatten(node.children, fullPath));
    }
  }
  return result;
}

let cached: FlatTaxonomy[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json({ taxonomies: cached });
  }

  const apiKey = process.env.ETSY_API_KEY;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!apiKey || !sharedSecret) {
    return NextResponse.json(
      { error: "Missing ETSY_API_KEY or ETSY_SHARED_SECRET" },
      { status: 500 },
    );
  }

  const res = await fetch(`${ETSY_API_BASE}/seller-taxonomy/nodes`, {
    headers: { "x-api-key": `${apiKey}:${sharedSecret}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Etsy API error (${res.status}): ${text}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const flat = flatten(data.results ?? []);

  cached = flat;
  cachedAt = Date.now();

  return NextResponse.json({ taxonomies: flat });
}
