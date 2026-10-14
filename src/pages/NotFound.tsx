import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Page Not Found | AIDYOR";

    // Tell search engines not to index this "soft 404"
    const robots = document.querySelector('meta[name="robots"]');
    const previous = robots?.getAttribute("content") ?? null;
    robots?.setAttribute("content", "noindex, follow");

    return () => {
      // Restore normal indexing when leaving the 404 page
      if (robots && previous !== null) robots.setAttribute("content", previous);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-display text-6xl font-bold text-primary mb-4">404</p>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            The page <code>{location.pathname}</code> doesn't exist or has moved.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/#scanner">Open Scanner</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/blog">Read the Blog</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;