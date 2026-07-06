import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  Features: [
    { label: "Token Scanner", href: "/#scanner" },
    { label: "Bug Scanner", href: "/#bug-scanner" },
    { label: "Security Alerts", href: "/#security-news" },
    { label: "Whale Alerts", href: "/#whale-alerts" },
    { label: "Watchlist", href: "/#watchlist" },
    { label: "API Access", href: "/api-docs" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "FAQ", href: "/faq" },
    { label: "Glossary", href: "/glossary" },
    { label: "Transparency", href: "/transparency" },
    { label: "Pro Plan", href: "/subscription" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

export const Footer = () => (
  <footer className="border-t border-border/50 bg-secondary/10 mt-16">
    <div className="container mx-auto px-4 py-12">
      {/* Main grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              AI<span className="text-primary">DYOR</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
            AI-powered crypto security. Detect honeypots, rug pulls, and scam tokens across 9 chains.
          </p>
          {/* Socials */}
          <div className="flex items-center gap-3 pt-1">
            <a
              href="https://x.com/aidyor33641"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow AIDYOR on X (Twitter)"
              className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="mailto:aidyor.app@gmail.com"
              aria-label="Email AIDYOR"
              className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([section, links]) => (
          <div key={section} className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
              {section}
            </h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} AIDYOR. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Not financial advice. Always do your own research.
        </p>
      </div>
    </div>
  </footer>
);
