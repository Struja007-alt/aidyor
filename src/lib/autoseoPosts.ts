import { supabase } from "@/integrations/supabase/client";

// autoseo_posts is not in the generated Supabase types, so use an untyped client.
const db = supabase as any;

export interface DisplayPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  tags: string[];
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  infographicImageUrl?: string | null;
  faq?: { question: string; answer: string }[] | null;
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function toDisplay(row: any): DisplayPost {
  const html: string = row.content_html ?? "";
  const text = stripHtml(html || row.content_markdown || "");
  const words = text.split(" ").filter(Boolean).length;
  const description: string = row.meta_description || text.slice(0, 155);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: description,
    date: row.published_at || row.created_at,
    category: "Guides",
    readTime: `${Math.max(1, Math.round(words / 200))} min`,
    metaTitle: `${row.title} | AIDYOR`,
    metaDescription: description,
    content: html,
    tags: Array.isArray(row.keywords) ? row.keywords : [],
    heroImageUrl: row.hero_image_url ?? null,
    heroImageAlt: row.hero_image_alt ?? null,
    infographicImageUrl: row.infographic_image_url ?? null,
    faq: Array.isArray(row.faq_schema) ? row.faq_schema : null,
  };
}

export async function fetchAutoseoPosts(): Promise<DisplayPost[]> {
  try {
    const { data, error } = await db
      .from("autoseo_posts")
      .select(
        "slug,title,meta_description,content_html,keywords,published_at,created_at,hero_image_url,hero_image_alt",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return data.map(toDisplay);
  } catch {
    return [];
  }
}

export async function fetchAutoseoPost(slug: string): Promise<DisplayPost | null> {
  try {
    const { data, error } = await db
      .from("autoseo_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return toDisplay(data);
  } catch {
    return null;
  }
}
