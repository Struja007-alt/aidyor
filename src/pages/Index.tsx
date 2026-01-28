import { Header } from "@/components/Header";
import { TokenScanner } from "@/components/TokenScanner";
import { Watchlist } from "@/components/Watchlist";
import { WhaleAlerts } from "@/components/WhaleAlerts";
import { CryptoSecurityNews } from "@/components/CryptoSecurityNews";
import DisclaimerDialog from "@/components/DisclaimerDialog";
import { Shield, Zap, Eye, Info } from "lucide-react";
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
        <section className="text-center py-8 md:py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Real-time Token Analysis
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight inline-flex items-center justify-center gap-2 flex-wrap">
            Protect Your <span className="text-gradient-safe">Crypto</span>
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Advanced token scanner with risk analysis and screenshot-based token detection.
          </p>
          
          {/* Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
              <span>🔐</span>
              <span className="text-muted-foreground">No wallet connection required</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
              <span>📡</span>
              <span className="text-muted-foreground">Real-time blockchain data</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
              <span>🛡️</span>
              <span className="text-muted-foreground">Scam pattern detection</span>
            </div>
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
