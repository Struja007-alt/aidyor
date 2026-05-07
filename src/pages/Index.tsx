import { Header } from "@/components/Header";
import { TokenScanner } from "@/components/TokenScanner";
import { Watchlist } from "@/components/Watchlist";
import { WhaleAlerts } from "@/components/WhaleAlerts";
import { CryptoSecurityNews } from "@/components/CryptoSecurityNews";
import DisclaimerDialog from "@/components/DisclaimerDialog";
import { Shield, Zap, Eye, Info, Mail, Twitter } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DisclaimerDialog />
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section className="relative text-center py-10 md:py-16 overflow-hidden">
          {/* Ambient neon glows */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-10 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6 backdrop-blur-sm shadow-lg shadow-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <Zap className="w-4 h-4" />
            Real-time Token Analysis
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight inline-flex items-center justify-center gap-3 flex-wrap">
            Protect Your <span className="text-gradient-safe drop-shadow-[0_0_25px_hsl(var(--primary)/0.35)]">Crypto</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-center">
                  <p>Analysis is informational only. No financial advice or guarantees.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Advanced multi-chain token scanner. Paste a contract, search by name, or drop a screenshot — we surface the risk in seconds.
          </p>
          
          {/* Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 text-sm">
            {[
              { icon: '🔐', label: 'No wallet connection required' },
              { icon: '📡', label: 'Real-time blockchain data' },
              { icon: '🛡️', label: 'Scam pattern detection' },
              { icon: '⚡', label: 'AI-powered OCR' },
            ].map((chip) => (
              <div
                key={chip.label}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-border/40 hover:border-primary/40 hover:bg-secondary/60 transition-colors"
              >
                <span>{chip.icon}</span>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {chip.label}
                </span>
              </div>
            ))}
          </div>

          {/* JunkStartups Badge */}
          <div className="mt-6 flex justify-center">
            <a
              href="https://junkstartups.com/api/go/aidyor-ai-crypto-scanner"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Featured on JunkStartups"
            >
              <img
                src="https://junkstartups.com/api/badge/aidyor-ai-crypto-scanner?theme=dark"
                alt="Featured on JunkStartups"
                width={250}
                height={44}
                loading="lazy"
              />
            </a>
          </div>
        </section>

        {/* Feature Stats */}
        <section className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Shield, label: "Tokens Scanned", value: "2.4M+" },
            { icon: Eye, label: "Scams Detected", value: "128K" },
            { icon: Zap, label: "Networks", value: "9" },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Token Scanner Section */}
        <section id="scanner" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Token Scanner</h2>
          </div>
          <TokenScanner />
        </section>


        {/* Security News Section */}
        <section id="security-news" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-destructive rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Security Alerts</h2>
          </div>
          <CryptoSecurityNews />
        </section>

        {/* Whale Alerts Section */}
        <section id="whale-alerts" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-blue-500 rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Whale Alerts</h2>
          </div>
          <WhaleAlerts />
        </section>

        {/* Watchlist Section */}
        <section id="watchlist" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-warning rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Watchlist</h2>
          </div>
          <Watchlist />
        </section>


        {/* Contact Section */}
        <section id="contact" className="scroll-mt-20">
          <div className="glass-card p-6 max-w-2xl mx-auto text-center space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Get in Touch</h2>
            <p className="text-sm text-muted-foreground">
              Questions, feedback, or partnership inquiries? Reach out below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:aidyor.app@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                aria-label="Email AIDYOR support"
              >
                <Mail className="w-4 h-4" />
                aidyor.app@gmail.com
              </a>
              <a
                href="https://x.com/aidyor33641"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground hover:bg-secondary transition-colors text-sm font-medium"
                aria-label="Follow AIDYOR on X"
              >
                <Twitter className="w-4 h-4" />
                @aidyor33641
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 pt-8 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display text-foreground">AIDYOR</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Always DYOR. This tool provides analysis but not financial advice.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a 
                  href="/privacy-policy" 
                  className="text-sm text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                <a 
                  href="/terms-of-service" 
                  className="text-sm text-primary hover:underline"
                >
                  Terms of Service
                </a>
                <a 
                  href="/cookie-policy" 
                  className="text-sm text-primary hover:underline"
                >
                  Cookie Policy
                </a>
                <a 
                  href="/disclaimer" 
                  className="text-sm text-primary hover:underline"
                >
                  Disclaimer
                </a>
                <a 
                  href="/transparency" 
                  className="text-sm text-primary hover:underline"
                >
                  Transparency
                </a>
                <a 
                  href="/faq" 
                  className="text-sm text-primary hover:underline"
                >
                  FAQ
                </a>
                <a 
                  href="/glossary" 
                  className="text-sm text-primary hover:underline"
                >
                  Glossary
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
