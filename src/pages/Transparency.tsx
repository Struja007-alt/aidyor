import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, Info, Calculator, Eye, EyeOff, Zap, Search, CheckCircle, XCircle } from "lucide-react";

const LAST_UPDATED = "October 14, 2026";

type Metric = { dot: string; title: string; text: string };

const marketMetrics: Metric[] = [
  { dot: "bg-safe", title: "Liquidity", text: "≥$100K = Safe (+15 pts) | $10K-$100K = Warning | <$10K = Danger (-15 pts)" },
  { dot: "bg-safe", title: "24h Trading Volume", text: "≥$50K = Safe (+10 pts) | $5K-$50K = Warning | <$5K = Danger (-10 pts)" },
  { dot: "bg-safe", title: "Transaction Activity", text: "≥100 txns = Safe (+10 pts) | 20-100 txns = Warning | <20 txns = Danger (-10 pts)" },
  { dot: "bg-safe", title: "Buy/Sell Ratio", text: "0.7-1.5 ratio = Healthy (+5 pts) | <0.3 ratio = More sells than buys (-10 pts)" },
  { dot: "bg-safe", title: "Price Stability", text: "-10% to +50% (24h) = Stable (+5 pts) | >30% drop = Danger (-15 pts)" },
  { dot: "bg-safe", title: "Social Presence", text: "Has verified website/socials = +5 pts" },
];

const securityMetrics: Metric[] = [
  { dot: "bg-danger", title: "Honeypot Detection", text: "If detected = CRITICAL (-50 pts) | Not detected = Safe (+15 pts)" },
  { dot: "bg-warning", title: "Contract Verification", text: "Verified source code = Safe (+10 pts) | Unverified = Warning (-5 pts)" },
  { dot: "bg-danger", title: "Tax Analysis", text: ">10% buy/sell tax = Danger (-15 pts) | 5-10% = Warning (-5 pts) | <5% = Safe (+5 pts)" },
  { dot: "bg-safe", title: "Holder Count", text: "≥1,000 holders = Safe (+10 pts) | 100-1,000 = Warning | <100 = Danger (-10 pts)" },
  { dot: "bg-warning", title: "Dangerous Contract Features", text: "Mintable tokens (-5 pts) | Hidden owner (-10 pts) | Can reclaim ownership (-10 pts) | Pausable transfers (-5 pts)" },
];

const limitations: { title: string; text: string }[] = [
  { title: "Future Contract Changes", text: "Owners can modify contract behavior, renounce ownership, or change tax rates after our scan. A safe score today doesn't guarantee safety tomorrow." },
  { title: "Team Legitimacy & Intent", text: "We cannot verify the identity, track record, or intentions of project teams. Doxxed teams can still rug pull; anonymous teams can be legitimate." },
  { title: "Off-Chain Activities", text: "Private sales, team allocations, and other off-chain commitments are not visible on-chain and cannot be verified." },
  { title: "Sophisticated Scam Techniques", text: "Advanced rug pull mechanisms, delayed honeypots, or exploits not yet known to security APIs may evade detection." },
  { title: "Market Manipulation", text: "Wash trading, coordinated pump-and-dump schemes, and artificial liquidity can make dangerous tokens appear legitimate." },
  { title: "Regulatory & Legal Risks", text: "We do not assess compliance with securities laws, tax implications, or jurisdictional restrictions that may affect your ability to trade." },
  { title: "Cross-Chain Bridge Risks", text: "We identify bridged tokens but cannot verify the security of bridging mechanisms or the legitimacy of cross-chain transfers." },
  { title: "Solana-Specific Limitations", text: "Solana tokens are analyzed differently. Traditional honeypot detection doesn't apply, and we focus on holder counts and mint/freeze authorities instead." },
];

const dataSources: { name: string; text: string }[] = [
  { name: "DEXScreener", text: "Real-time market data including price, liquidity, volume, and trading activity across decentralized exchanges." },
  { name: "GoPlus Security", text: "Smart contract security analysis for EVM-compatible chains including honeypot detection, tax analysis, and ownership risks." },
  { name: "SolanaFM", text: "Solana-specific token analysis including holder counts, mint authority, and freeze authority status." },
];

const steps: { title: string; text: string }[] = [
  { title: "Input Recognition", text: "Accepts contract addresses (0x... for EVM, base58 for Solana), token names, or screenshots containing addresses." },
  { title: "Multi-Chain Query", text: "Simultaneously queries DEXScreener across all supported networks (Ethereum, BNB Chain, Solana, Polygon, Avalanche, Base, Arbitrum, Optimism, Robinhood Chain)." },
  { title: "Security API Fetch", text: "For each found token, fetches security data from GoPlus (EVM chains) or SolanaFM (Solana) to analyze contract safety." },
  { title: "Score Calculation", text: "Combines market data (60%) and security analysis (40%) into a weighted risk score from 0-100." },
  { title: "Result Classification", text: 'Multi-chain results are classified as "original" (highest liquidity), "bridged" (cross-chain version), or "suspicious" (low liquidity/high risk).' },
];

const positiveSignals: { title: string; text: string }[] = [
  { title: "Verified Contract", text: "Source code published on block explorer" },
  { title: "High Liquidity", text: "$100K+ locked in trading pools" },
  { title: "Active Trading", text: "100+ transactions in 24 hours" },
  { title: "Healthy Holder Count", text: "1,000+ unique token holders" },
  { title: "Low Taxes", text: "Buy/sell tax under 5%" },
  { title: "Social Presence", text: "Verified website and social links" },
  { title: "Not a Honeypot", text: "Sell transactions confirmed possible" },
  { title: "Balanced Trading", text: "Healthy buy/sell ratio (0.7-1.5)" },
];

const MetricList = ({ items }: { items: Metric[] }) => (
  <div className="space-y-4">
    {items.map((m) => (
      <div key={m.title} className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full ${m.dot} mt-2 shrink-0`} />
        <div>
          <strong className="text-foreground">{m.title}</strong>
          <p className="text-sm text-muted-foreground">{m.text}</p>
        </div>
      </div>
    ))}
  </div>
);

const Transparency = () => {
  useEffect(() => {
    document.title = "Transparency | AIDYOR";
  }, []);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Transparency</h1>
        </div>

        <p className="text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-card/50 border border-border rounded-xl p-6">
            <p className="text-lg text-foreground/90">
              AIDYOR is committed to transparency. This page explains how our risk scores are calculated,
              what data sources we use, and importantly, what our analysis <strong>cannot</strong> detect.
              Understanding these limitations is crucial for making informed decisions.
            </p>
          </section>

          {/* How Risk Scores Work */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">How Risk Scores Are Calculated</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Our risk score is a combined metric from 0-100, where higher scores indicate lower risk.
              The score is derived from two primary data sources:
            </p>

            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-primary">Market Data Analysis (60% weight)</h3>
              <p className="text-muted-foreground mb-4">
                Sourced from DEXScreener API, this evaluates trading activity and market health:
              </p>
              <MetricList items={marketMetrics} />
            </div>

            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-primary">Security Analysis (40% weight)</h3>
              <p className="text-muted-foreground mb-4">
                Sourced from GoPlus Security API (EVM chains) and SolanaFM API (Solana), this evaluates smart contract safety:
              </p>
              <MetricList items={securityMetrics} />
            </div>

            <div className="bg-warning/5 border border-warning/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-2 text-warning">Incomplete Data</h3>
              <p className="text-sm text-muted-foreground">
                If one of the two data sources is unavailable for a token, the score is based on partial data.
                A result built on a single source is a weaker signal and should never be read as a full
                safety assessment. Treat any score from incomplete data with extra caution and verify the token yourself.
              </p>
            </div>
          </section>

          {/* Score Interpretation */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Score Interpretation</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-safe/10 border border-safe/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-safe mb-2">70-100</div>
                <div className="font-semibold text-safe">SAFE</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Lower risk indicators, but not a guarantee of safety
                </p>
              </div>
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-warning mb-2">40-69</div>
                <div className="font-semibold text-warning">CAUTION</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Mixed signals, requires additional research
                </p>
              </div>
              <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-danger mb-2">0-39</div>
                <div className="font-semibold text-danger">DANGER</div>
                <p className="text-sm text-muted-foreground mt-2">
                  High risk indicators detected, extreme caution advised
                </p>
              </div>
            </div>
          </section>

          {/* What We Cannot Detect */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <EyeOff className="w-6 h-6 text-danger" />
              <h2 className="text-2xl font-semibold">What We Cannot Detect</h2>
            </div>
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-6">
              <p className="text-muted-foreground mb-6">
                <strong className="text-foreground">Important:</strong> Our automated analysis has significant limitations.
                The following risks <strong>cannot</strong> be detected by our tools:
              </p>
              <div className="space-y-4">
                {limitations.map((l) => (
                  <div key={l.title} className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground">{l.title}</strong>
                      <p className="text-sm text-muted-foreground">{l.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Our Data Sources</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dataSources.map((d) => (
                <div key={d.name} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-lg mb-2">{d.name}</h3>
                  <p className="text-sm text-muted-foreground">{d.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Detection Logic */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Detection Logic Explained</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Here is how our scanner identifies potential threats and red flags:
            </p>

            {/* Scanning Process */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
                <Search className="w-5 h-5" />
                Scanning Process Flow
              </h3>
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <div key={s.title} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <strong className="text-foreground">{s.title}</strong>
                      <p className="text-sm text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Threat Detection */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-danger flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Threat Detection Methods
              </h3>
              <div className="space-y-6">
                <div className="border-l-4 border-danger pl-4">
                  <h4 className="font-semibold text-foreground mb-2">Honeypot Detection</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    GoPlus API simulates buy and sell transactions to detect if selling is blocked:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {[
                      "Sell function reverts or fails",
                      "Hidden transfer restrictions in code",
                      "Blacklist functions that block sellers",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-danger shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-l-4 border-danger pl-4">
                  <h4 className="font-semibold text-foreground mb-2">Rug Pull Indicators</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Multiple signals that suggest potential rug pull risk:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {[
                      "Unlocked or low liquidity (<$10K)",
                      "Owner can mint unlimited tokens",
                      "Hidden owner or reclaim ownership functions",
                      "Few holders with concentrated supply",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-danger shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-l-4 border-warning pl-4">
                  <h4 className="font-semibold text-foreground mb-2">Tax Manipulation</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Detects excessive or modifiable transaction taxes:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {[
                      "Buy/sell tax exceeding 10%",
                      "Modifiable tax functions in contract",
                      "Asymmetric taxes (high sell, low buy)",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-l-4 border-warning pl-4">
                  <h4 className="font-semibold text-foreground mb-2">Suspicious Activity Patterns</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Market behavior that may indicate manipulation:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {[
                      "Extreme sell pressure (buy/sell ratio <0.3)",
                      "Very low transaction count (<20 in 24h)",
                      "Severe price drops (>30% in 24h)",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Positive Signals */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-safe flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Positive Signals Detected
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {positiveSignals.map((p) => (
                  <div key={p.title} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-safe mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground text-sm">{p.title}</strong>
                      <p className="text-xs text-muted-foreground">{p.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final Note */}
          <section className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Always Do Your Own Research</h2>
            <p className="text-muted-foreground">
              AIDYOR (AI + DYOR) is designed to assist, not replace, your own research. Our risk scores
              provide a starting point, but you should always verify information through multiple sources,
              review contract code yourself if possible, and never invest more than you can afford to lose.
              The cryptocurrency market is inherently high-risk, and even "safe" tokens can lose value rapidly.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>For questions about our methodology, please review our other policies:</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to="/disclaimer" className="text-primary hover:text-primary/80 transition-colors">
              Disclaimer
            </Link>
            <Link to="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transparency;
