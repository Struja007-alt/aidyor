import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TokenScanner } from "@/components/TokenScanner";
import { BugScanner } from "@/components/BugScanner";
import { Watchlist } from "@/components/Watchlist";
import { WhaleAlerts } from "@/components/WhaleAlerts";
import { CryptoSecurityNews } from "@/components/CryptoSecurityNews";
import DisclaimerDialog from "@/components/DisclaimerDialog";
import { Shield, Zap, Eye, Info, Search, Cpu, ShieldCheck } from "lucide-react";
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
      
      <main className="container mx-auto px-4 py-8 space-y-8 md:space-y-12">
        {/* Hero Section */}
        <section className="relative text-center py-6 md:py-16 overflow-hidden">
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

        </section>

        {/* Feature Stats */}
        <section className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto">
          {[
            { icon: Shield, label: "Tokens Scanned", value: "2.4M+" },
            { icon: Eye, label: "Scams Detected", value: "128K" },
            { icon: Zap, label: "Networks", value: "9" },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-3 sm:p-4 text-center">
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* How It Works Section */}
        <section className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h2 className="font-display text-2xl font-bold text-foreground">How It Works</h2>
              <div className="w-1 h-8 bg-primary rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Institutional-grade crypto security analysis in three steps — no wallet, no sign-up required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 relative">
            {/* Connector lines — desktop only */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 z-0" />

            {[
              {
                step: "01",
                icon: Search,
                title: "Input Your Token",
                description: "Paste a contract address, search by token name, or drop a screenshot — our OCR engine extracts the address automatically.",
                color: "text-primary",
                border: "border-primary/30",
                bg: "bg-primary/10",
              },
              {
                step: "02",
                icon: Cpu,
                title: "Real-Time Analysis",
                description: "We cross-check 7+ security APIs simultaneously — GoPlus, RugCheck, Unicrypt, DexScreener and more — across 9 blockchain networks.",
                color: "text-accent",
                border: "border-accent/30",
                bg: "bg-accent/10",
              },
              {
                step: "03",
                icon: ShieldCheck,
                title: "Get Your Risk Score",
                description: "Receive a 0–100 safety score with AI-powered plain-English explanations of every risk factor. No jargon, no guesswork.",
                color: "text-emerald-400",
                border: "border-emerald-400/30",
                bg: "bg-emerald-400/10",
              },
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center px-4 md:px-6">
                <div className={`w-16 h-16 rounded-2xl ${item.bg} border ${item.border} flex items-center justify-center mb-4 relative`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                  <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background border ${item.border} text-[10px] font-bold ${item.color} flex items-center justify-center`}>
                    {item.step.slice(1)}
                  </span>
                </div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="#scanner"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Zap className="w-4 h-4" />
              Try it free — no wallet needed
            </a>
          </div>
        </section>

        {/* Token Scanner Section */}
        <section id="scanner" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Token Scanner</h2>
          </div>
          <TokenScanner />
        </section>

        {/* Bug Scanner Section */}
        <section id="bug-scanner" className="scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-accent rounded-full" />
            <h2 className="font-display text-2xl font-bold text-foreground">Smart Contract Bug Scanner</h2>
          </div>
          <BugScanner />
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


      </main>
      <Footer />
    </div>
  );
};

export default Index;
