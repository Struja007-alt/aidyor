import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getBlogPost } from "@/data/blogPosts";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, string> = {
  Security: "bg-primary/15 text-primary border-primary/30",
  Guides: "bg-accent/15 text-accent border-accent/30",
  Development: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  useEffect(() => {
    if (!post) return;
    document.title = post.metaTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", post.metaDescription);
  }, [post]);

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

          <article
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

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
        .blog-prose p {
          color: hsl(var(--muted-foreground));
          line-height: 1.7;
          margin-bottom: 1rem;
        }
        .blog-prose strong {
          color: hsl(var(--foreground));
          font-weight: 600;
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
        .blog-prose li::before {
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
      `}</style>
    </div>
  );
};

export default BlogPost;