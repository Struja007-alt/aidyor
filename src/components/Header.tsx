/**
 * @fileoverview Header component for AIDYOR application
 * Provides navigation and branding for the app
 */

import { Shield, Menu, Crown, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Main application header with responsive navigation.
 * Features the AIDYOR logo (links home), desktop navigation links,
 * and a mobile hamburger menu.
 */
export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-3"
            aria-label="AIDYOR home"
          >
            <div className="relative w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-safe">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-xl font-bold text-foreground tracking-wide">
                AI<span className="text-primary">DYOR</span>
              </div>
              <p className="text-xs text-muted-foreground">Do Your Own Research</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <a href="/#scanner" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Scanner
            </a>
            <a href="/#watchlist" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Watchlist
            </a>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Blog
            </Link>
            <a
              href="mailto:aidyor.app@gmail.com"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="Email AIDYOR support at aidyor.app@gmail.com"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
            <Link
              to="/subscription"
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Crown className="w-4 h-4" />
              Pro
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            mobileMenuOpen ? "max-h-96 mt-4" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-2 py-2">
            <Link
              to="/"
              onClick={closeMenu}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <a
              href="/#scanner"
              onClick={closeMenu}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Scanner
            </a>
            <a
              href="/#watchlist"
              onClick={closeMenu}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Watchlist
            </a>
            <Link
              to="/blog"
              onClick={closeMenu}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Blog
            </Link>
            <a
              href="mailto:aidyor.app@gmail.com"
              onClick={closeMenu}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="Email AIDYOR support at aidyor.app@gmail.com"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
            <Link
              to="/subscription"
              onClick={closeMenu}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Crown className="w-4 h-4" />
              Pro
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};