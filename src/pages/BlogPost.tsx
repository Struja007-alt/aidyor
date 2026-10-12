import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getBlogPost } from "@/data/blogPosts";
import { fetchAutoseoPost, type DisplayPost } from "@/lib/autoseoPosts";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, string> = {
  Security: "bg-primary/15 text-primary border-primary/30",
  Guides: "bg-accent/15 text-accent border-accent/30",
  Development: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const staticPost = slug ? getBlogPost(slug) : undefined;

  const [dbPost, setDbPost] = useState<DisplayPost | null>(null);
  const [loading, setLoading] = useState<boolean>(!staticPost);

  // Static posts win; otherwise look the slug up in autoseo_posts.
  useEffect(() => {
    if (!slug || staticPost) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAutoseoPost(slug).then((p) => {
      if (!cancelled) {
        setDbPost(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug, staticPost]);

  const post = (staticPost as DisplayPost | undefined) ?? dbPost ?? undefined;

  useEffect(() => {
    if (!post) return;
    document.title = post.metaTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", post.metaDescription);
  }, [post]);

  // FAQ structured data (AutoSEO posts only)
  useEffect(() => {
    if (!post?.faq?.length) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <p className="text-center text-muted-foreground">Loading article…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/blog"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Blog
          </Link>

          <div className="flex items-center gap-3 mt-6 mb-4">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                categoryStyles[post.category] ||
                  "bg-secondary/40 border-border/40 text-muted-foreground"
              )}
            >
              {post.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {post.readTime} read
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground" dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-wide mb-8">
            {post.title}
          </h1>

          {post.heroImageUrl && (
            <img
              src={post.heroImageUrl}
              alt={post.heroImageAlt || post.title}
              className="w-full rounded-lg mb-8"
            />
          )}

          <article
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.infographicImageUrl && (
            <img
              src={post.infographicImageUrl}
              alt={`${post.title} infographic`}
              loading="lazy"
              className="w-full rounded-lg mt-8"
            />
          )}

          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-secondary/40 border border-border/40 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="glass-card p-6 md:p-8 mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Scan any token now
              </h3>
              <p className="text-sm text-muted-foreground">
                Free, instant, no wallet needed.
              </p>
            </div>
            <Button asChild>
              <Link to="/#scanner">Open Scanner →</Link>
            </Button>
          </div>
        </div>
      </main>

      <style>{`
.blog-prose h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  border-left: 3px solid hsl(var(--primary));
  padding-left: 0.75rem;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  line-height: 1.3;
}
.blog-prose h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}
.blog-prose p {
  color: hsl(var(--muted-foreground));
  line-height: 1.7;
  margin-bottom: 1rem;
}
.blog-prose a {
  color: hsl(var(--primary));
  text-decoration: underline;
}
.blog-prose strong {
  color: hsl(var(--foreground));
  font-weight: 600;
}
.blog-prose img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}
.blog-prose blockquote {
  border-left: 3px solid hsl(var(--border));
  padding-left: 1rem;
  margin: 1rem 0;
  color: hsl(var(--muted-foreground));
}
.blog-prose ol {
  list-style: decimal;
  padding-left: 1.5rem;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}
.blog-prose ul {
  list-style: none;
  padding-left: 0;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.blog-prose li {
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
  padding-left: 1.25rem;
  position: relative;
}
.blog-prose ol li {
  padding-left: 0.25rem;
}
.blog-prose ul li::before {
  content: '▸';
  color: hsl(var(--primary));
  position: absolute;
  left: 0;
  top: 0;
}
.blog-prose code {
  background: hsl(var(--secondary));
  color: hsl(var(--primary));
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.blog-prose pre {
  background: hsl(var(--secondary));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
.blog-prose pre code {
  background: none;
  color: hsl(var(--foreground));
  padding: 0;
  border-radius: 0;
  font-size: 0.8rem;
  line-height: 1.6;
  white-space: pre;
  display: block;
}
.blog-prose table {
  display: block;
  overflow-x: auto;
  max-width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.blog-prose th, .blog-prose td {
  border: 1px solid hsl(var(--border));
  padding: 0.5rem 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: left;
}
`}</style>
      <Footer />
    </div>
  );
};

export default BlogPost;
