import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

const MAX_TOTAL = 20;
const MAX_PER_PUBLISHER_ORGANIC = 3;
const SPONSORED_MAX_AGE_DAYS = 30;

interface NewsCard {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  image_url: string | null;
  published_at: string;
  source: string;
  source_logo: string | null;
  sponsored: boolean;
  slot: number | null;
  tier: string | null;
}

function first<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    const [placementsRes, itemsRes] = await Promise.all([
      sb
        .from("news_placements")
        .select("slot, tier, publisher_id")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .order("slot", { ascending: true }),
      sb
        .from("news_items")
        .select(
          "id, title, excerpt, url, image_url, published_at, publisher_id, news_publishers!inner(name, logo_url, active)",
        )
        .eq("news_publishers.active", true)
        .order("published_at", { ascending: false })
        .limit(150),
    ]);

    if (placementsRes.error) throw placementsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const placements = placementsRes.data ?? [];
    const items = itemsRes.data ?? [];

    const toCard = (row: any, sponsored: boolean, slot: number | null, tier: string | null): NewsCard => {
      const pub = first<any>(row.news_publishers);
      return {
        id: row.id,
        title: row.title,
        excerpt: row.excerpt,
        url: row.url,
        image_url: row.image_url,
        published_at: row.published_at,
        source: pub?.name ?? "Unknown",
        source_logo: pub?.logo_url ?? null,
        sponsored,
        slot,
        tier,
      };
    };

    const used = new Set<string>();
    const cards: NewsCard[] = [];
    const cutoff = Date.now() - SPONSORED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    // 1) Paid slots, pinned in slot order. A publisher holding several slots
    //    gets its newest article in the first slot, next newest in the next.
    for (const p of placements) {
      const row = items.find(
        (it: any) =>
          it.publisher_id === p.publisher_id &&
          !used.has(it.id) &&
          new Date(it.published_at).getTime() >= cutoff,
      );
      if (!row) continue; // paid publisher has no fresh article: slot stays empty
      used.add(row.id);
      cards.push(toCard(row, true, p.slot, p.tier));
    }

    // 2) Organic items below, newest first, capped per publisher.
    const perPublisher = new Map<string, number>();
    for (const row of items) {
      if (cards.length >= MAX_TOTAL) break;
      if (used.has(row.id)) continue;
      const count = perPublisher.get(row.publisher_id) ?? 0;
      if (count >= MAX_PER_PUBLISHER_ORGANIC) continue;
      perPublisher.set(row.publisher_id, count + 1);
      used.add(row.id);
      cards.push(toCard(row, false, null, null));
    }

    return new Response(
      JSON.stringify({
        items: cards,
        total: cards.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("crypto-news error:", error);
    return new Response(
      JSON.stringify({ items: [], total: 0, error: "Failed to load news" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
