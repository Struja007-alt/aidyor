import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { blogPosts } from "@/data/blogPosts";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, string> = {
  Security: "bg-primary/15 text-primary border-primary/30",
  Guides: "bg-accent/15 text-accent border-accent/30",
  Development: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const Blog = () => {
  useEffect(() => {
    document.title = "Security Blog | AIDYOR";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Crypto security guides, honeypot detection tutorials, and DeFi safety research from the AIDYOR team."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="mb-10 flex items-start gap-4">
          <div className="w-1 h-12 bg-primary rounded-full shrink-0" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-wide">
              Security Blog
            </h1>
            <p className="text-muted-foreground mt-1">
              Research, guides and security analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="glass-card p-6 flex flex-col gap-3 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
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
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p
                className="text-sm text-muted-foreground overflow-hidden"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between mt-auto pt-2 text-xs text-muted-foreground">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <span className="text-primary group-hover:translate-x-0.5 transition-transform">
                  Read article →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;