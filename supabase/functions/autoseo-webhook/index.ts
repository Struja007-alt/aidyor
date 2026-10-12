import { createClient } from "npm:@supabase/supabase-js@2";

const TOKEN = Deno.env.get("AUTOSEO_WEBHOOK_TOKEN");
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://aidyor.app").replace(/\/$/, "");
const BLOG_PATH = Deno.env.get("BLOG_PATH") ?? "/blog";
const BUCKET = "autoseo-images";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const enc = new TextEncoder();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function hmacHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

async function mirrorImage(
  sourceUrl: string,
  articleId: number,
  label: string,
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${sourceUrl}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT[type] ?? sourceUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${articleId}/${label}.${ext}`;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type || "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!TOKEN) return json({ error: "Server not configured" }, 500);

    // 1. Bearer token
    const auth = req.headers.get("authorization") ?? "";
    if (!safeEqual(auth, `Bearer ${TOKEN}`)) return json({ error: "Unauthorized" }, 401);

    // 2. Signature over raw body (verified when header is present)
    const raw = await req.text();
    const sigHeader = (req.headers.get("x-autoseo-signature") ?? "")
      .replace(/^sha256=/i, "")
      .trim()
      .toLowerCase();
    if (sigHeader) {
      const expected = await hmacHex(TOKEN, raw);
      if (!safeEqual(sigHeader, expected)) return json({ error: "Invalid signature" }, 401);
    }

    let p: any;
    try {
      p = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    // 3. Test event
    if (p.event === "test") return json({ url: `${SITE_URL}/test` });

    if (p.event !== "article.published" && p.event !== "article.updated") {
      return json({ error: "Unsupported event" }, 400);
    }
    if (!Number.isInteger(p.id) || !p.slug || !p.title) {
      return json({ error: "Missing id, slug or title" }, 400);
    }

    // 4. Images (reuse previous copy if the source URL hasn't changed)
    const { data: existing, error: selErr } = await supabase
      .from("autoseo_posts")
      .select(
        "hero_image_url, hero_image_source_url, infographic_image_url, infographic_image_source_url",
      )
      .eq("autoseo_id", p.id)
      .maybeSingle();
    if (selErr) throw selErr;

    let heroUrl: string | null = null;
    if (p.heroImageUrl) {
      heroUrl =
        existing?.hero_image_source_url === p.heroImageUrl && existing.hero_image_url
          ? existing.hero_image_url
          : await mirrorImage(p.heroImageUrl, p.id, "hero");
    }
    let infoUrl: string | null = null;
    if (p.infographicImageUrl) {
      infoUrl =
        existing?.infographic_image_source_url === p.infographicImageUrl &&
          existing.infographic_image_url
          ? existing.infographic_image_url
          : await mirrorImage(p.infographicImageUrl, p.id, "infographic");
    }

    // 5. Upsert on autoseo_id
    const { error } = await supabase.from("autoseo_posts").upsert(
      {
        autoseo_id: p.id,
        source_article_id: p.sourceArticleId ?? null,
        title: p.title,
        slug: p.slug,
        meta_description: p.metaDescription ?? null,
        content_html: p.content_html ?? null,
        content_markdown: p.content_markdown ?? null,
        hero_image_url: heroUrl,
        hero_image_source_url: p.heroImageUrl ?? null,
        hero_image_alt: p.heroImageAlt ?? null,
        infographic_image_url: infoUrl,
        infographic_image_source_url: p.infographicImageUrl ?? null,
        keywords: p.keywords ?? [],
        meta_keywords: p.metaKeywords ?? null,
        faq_schema: p.faqSchema ?? null,
        language_code: p.languageCode ?? "en",
        status: "published",
        published_at: p.publishedAt ?? null,
        source_updated_at: p.updatedAt ?? null,
        source_created_at: p.createdAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "autoseo_id" },
    );
    if (error) throw error;

    return json({ url: `${SITE_URL}${BLOG_PATH}/${p.slug}` });
  } catch (err) {
    console.error("autoseo-webhook error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
