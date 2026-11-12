-- Additive only: new table, new bucket, new policies. No existing objects touched.

CREATE TABLE IF NOT EXISTS public.autoseo_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autoseo_id bigint NOT NULL UNIQUE,
  source_article_id bigint,
  title text NOT NULL,
  slug text NOT NULL,
  meta_description text,
  content_html text,
  content_markdown text,
  hero_image_url text,
  hero_image_source_url text,
  hero_image_alt text,
  infographic_image_url text,
  infographic_image_source_url text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_keywords text,
  faq_schema jsonb,
  language_code text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'published',
  published_at timestamptz,
  source_updated_at timestamptz,
  source_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autoseo_posts_slug_idx ON public.autoseo_posts (slug);
CREATE INDEX IF NOT EXISTS autoseo_posts_lang_idx ON public.autoseo_posts (language_code);

ALTER TABLE public.autoseo_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'autoseo_posts'
      AND policyname = 'Public can read published autoseo posts'
  ) THEN
    CREATE POLICY "Public can read published autoseo posts"
      ON public.autoseo_posts FOR SELECT
      USING (status = 'published');
  END IF;
END $$;

-- Public bucket for downloaded images
INSERT INTO storage.buckets (id, name, public)
VALUES ('autoseo-images', 'autoseo-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read autoseo images'
  ) THEN
    CREATE POLICY "Public read autoseo images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'autoseo-images');
  END IF;
END $$;
