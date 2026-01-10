import { Shield, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-safe">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-wide">
                TOKEN<span className="text-primary">GUARD</span>
              </h1>
              <p className="text-xs text-muted-foreground">Crypto Security Scanner</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#scanner" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Scanner
            </a>
            <a href="#games" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              P2E Checker
            </a>
            <a href="#upload" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Screenshot
            </a>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          mobileMenuOpen ? "max-h-40 mt-4" : "max-h-0"
        )}>
          <div className="flex flex-col gap-2 py-2">
            <a href="#scanner" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              Scanner
            </a>
            <a href="#games" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              P2E Checker
            </a>
            <a href="#upload" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              Screenshot
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};
