import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Called on a schedule (cron). Requires header: x-cryptonews-secret: <CRYPTONEWS_CRON_SECRET>
// Pulls each active publisher's rss_url (RSS 2.0 or Atom) and upserts items.

const MAX_ITEMS_PER_FEED = 30;
const EXCERPT_LEN = 200;
const PRUNE_DAYS = 90;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function cleanText(raw: string): string {
  const noCdata = raw.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  return decodeEntities(decodeEntities(noCdata))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}

function attr(xml: string, tagName: string, attrName: string, mustContain?: RegExp): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  for (const m of xml.matchAll(re)) {
    if (mustContain && !mustContain.test(m[0])) continue;
    const a = m[0].match(new RegExp(`${attrName}\\s*=\\s*"([^"]+)"`, "i"));
    if (a) return decodeEntities(a[1]);
  }
  return null;
}

function httpsOnly(u: string | null): string | null {
  if (!u) return null;
  const t = u.trim();
  try {
    const parsed = new URL(t);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function sha256Hex32(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

interface ParsedItem {
  title: string;
  excerpt: string | null;
  url: string;
  image_url: string | null;
  published_at: string;
}

function parseFeed(xml: string): ParsedItem[] {
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  const out: ParsedItem[] = [];
  for (const b of blocks.slice(0, MAX_ITEMS_PER_FEED)) {
    const title = cleanText(tag(b, "title") ?? "");
    const link =
      httpsOnly(cleanText(tag(b, "link") ?? "")) ??
      httpsOnly(attr(b, "link", "href", /rel\s*=\s*"alternate"|^(?:(?!rel=).)*$/i));
    if (!title || !link) continue;

    const dateRaw =
      tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const d = dateRaw ? new Date(cleanText(dateRaw)) : null;
    if (!d || isNaN(d.getTime())) continue;

    const descRaw =
      tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content:encoded") ?? tag(b, "content");
    const excerpt = descRaw ? cleanText(descRaw).slice(0, EXCERPT_LEN) || null : null;

    const image =
      httpsOnly(attr(b, "media:content", "url")) ??
      httpsOnly(attr(b, "media:thumbnail", "url")) ??
      httpsOnly(attr(b, "enclosure", "url", /type\s*=\s*"image/i));

    out.push({
      title: title.slice(0, 200),
      excerpt,
      url: link,
      image_url: image,
      published_at: d.toISOString(),
    });
  }
  return out;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRYPTONEWS_CRON_SECRET");
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRYPTONEWS_CRON_SECRET not configured" }), { status: 500 });
  }
  if (req.headers.get("x-cryptonews-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: publishers, error } = await sb
    .from("news_publishers")
    .select("id, name, rss_url")
    .eq("active", true)
    .not("rss_url", "is", null);

  if (error) {
    console.error("ingest: publishers query failed:", error);
    return new Response(JSON.stringify({ error: "Query failed" }), { status: 500 });
  }

  const results: Record<string, unknown>[] = [];

  for (const pub of publishers ?? []) {
    try {
      const feedUrl = httpsOnly(pub.rss_url);
      if (!feedUrl) {
        results.push({ publisher: pub.name, ok: false, reason: "rss_url must be https" });
        continue;
      }

      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent": "AIDYORBot/1.0 (+https://aidyor.app)",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.log(`ingest: ${pub.name} feed HTTP ${res.status}`);
        results.push({ publisher: pub.name, ok: false, reason: `HTTP ${res.status}` });
        continue;
      }

      const parsed = parseFeed(await res.text());
      const rows = await Promise.all(
        parsed.map(async (it) => ({
          id: await sha256Hex32(it.url),
          publisher_id: pub.id,
          ...it,
        })),
      );

      if (rows.length > 0) {
        const { error: upErr } = await sb.from("news_items").upsert(rows, { onConflict: "id" });
        if (upErr) throw upErr;
      }
      results.push({ publisher: pub.name, ok: true, items: rows.length });
    } catch (e) {
      console.error(`ingest: ${pub.name} failed:`, e);
      results.push({ publisher: pub.name, ok: false, reason: String(e) });
    }
  }

  const cutoff = new Date(Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: pruneErr } = await sb.from("news_items").delete().lt("published_at", cutoff);
  if (pruneErr) console.error("ingest: prune failed:", pruneErr);

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
