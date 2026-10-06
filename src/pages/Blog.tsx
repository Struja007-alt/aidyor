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

const glossaryLinks = [
  { slug: "honeypot", label: "Honeypot" },
  { slug: "rug-pull", label: "Rug Pull" },
  { slug: "liquidity-lock", label: "Liquidity Lock" },
  { slug: "renounced-contract", label: "Renounced Contract" },
  { slug: "tokenomics", label: "Tokenomics" },
  { slug: "smart-contract", label: "Smart Contract" },
];

const PAGE_TITLE = "Crypto Security Blog: Honeypot & Rug Pull Guides | AIDYOR";
const PAGE_DESCRIPTION =
  "Crypto security guides from AIDYOR: how to detect honeypots and rug pulls, check token safety, and avoid scam tokens. Free research for DeFi investors.";

const sortedPosts = [...blogPosts].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

const Blog = () => {
  useEffect(() => {
    document.title = PAGE_TITLE;

    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", PAGE_DESCRIPTION);

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "blog-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "AIDYOR Security Blog",
      url: "https://aidyor.app/blog",
      description: PAGE_DESCRIPTION,
      publisher: {
        "@type": "Organization",
        name: "AIDYOR",
        logo: {
          "@type": "ImageObject",
          url: "https://aidyor.app/icon-512.png",
        },
      },
      blogPost: sortedPosts.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: `https://aidyor.app/blog/${post.slug}`,
        datePublished: post.date,
      })),
    });
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
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
          {sortedPosts.map((post) => (
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

        <section className="glass-card p-6 md:p-8 mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            New to crypto security?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Learn the key terms in our glossary, then check any token for free.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {glossaryLinks.map((item) => (
              <Link
                key={item.slug}
                to={`/glossary/${item.slug}`}
                className="inline-flex items-center rounded-full bg-secondary/40 border border-border/40 px-3 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/glossary"
              className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              All terms →
            </Link>
          </div>
          <Link
            to="/#scanner"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            Open the free token scanner →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;