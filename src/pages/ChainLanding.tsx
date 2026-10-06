import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { chains, getChain } from "@/data/chains";

const ChainLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const chain = slug ? getChain(slug) : undefined;

  useEffect(() => {
    if (!chain) return;
    document.title = `${chain.name} Token Scanner: Honeypot & Rug Pull Checker | AIDYOR`;

    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      `Check any ${chain.name} token for honeypots, rug pulls, hidden taxes and risky contracts. Free ${chain.name} token safety scanner with a 0-100 risk score. No wallet needed.`
    );
  }, [chain]);

  if (!chain) return <Navigate to="/" replace />;

  const faqs = [
    {
      q: `How do I check if a ${chain.name} token is safe?`,
      a: `Paste the token's contract address into the AIDYOR scanner and select ${chain.name}. You get a 0-100 risk score with the specific warnings behind it. No wallet connection is needed.`,
    },
    {
      q: `Does AIDYOR detect honeypots on ${chain.name}?`,
      a: `AIDYOR checks for honeypot behavior, abnormal buy and sell taxes, liquidity lock status, holder concentration, and contract ownership, and combines several security data sources into one risk score. Coverage can vary by token, and scans with limited data are scored more cautiously.`,
    },
    {
      q: `Is the ${chain.name} token scanner free?`,
      a: `Yes. You get free daily scans with no wallet connection. Pro adds unlimited scans and extra tools.`,
    },
    {
      q: `Where can I verify a ${chain.name} contract myself?`,
      a: `Open the contract on ${chain.explorer} and check that the source code is verified, who owns the contract, and how the supply is distributed.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← AIDYOR
          </Link>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-wide mt-6 mb-4">
            {chain.name} Token Scanner &amp; Safety Checker
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Check any token on {chain.name}, {chain.type}, for honeypots, rug
            pull signals, hidden taxes, and risky contract permissions before
            you buy. Free, instant, and no wallet connection required.
          </p>
          <Button asChild size="lg">
            <Link to="/#scanner">Scan a {chain.name} token →</Link>
          </Button>

          <h2 className="font-display text-xl font-semibold text-foreground mt-12 mb-3">
            Why {chain.name} tokens need checking
          </h2>
          <p className="text-muted-foreground leading-relaxed">{chain.intro}</p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-10 mb-3">
            Common risks on {chain.name}
          </h2>
          <ul className="space-y-2">
            {chain.risks.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-primary mt-1">▸</span>
                {risk}
              </li>
            ))}
          </ul>

          <h2 className="font-display text-xl font-semibold text-foreground mt-10 mb-3">
            How to check a {chain.name} token
          </h2>
          <ol className="space-y-2 list-decimal pl-5 text-muted-foreground">
            <li>
              Copy the token's contract address from the project's official
              channels, never from a DM or ad.
            </li>
            <li>
              Paste it into the <Link to="/#scanner" className="text-primary underline underline-offset-4">AIDYOR scanner</Link> and
              select {chain.name}. You can also scan from a screenshot.
            </li>
            <li>
              Read the risk score and warnings. Low liquidity, unlocked
              liquidity, or high taxes are reasons to stop.
            </li>
            <li>
              Cross-check the contract on {chain.explorer} and the pair on{" "}
              {chain.dexes} before trading.
            </li>
          </ol>
          <p className="text-muted-foreground leading-relaxed mt-4">
            New to this? Read our{" "}
            <Link to="/blog/how-to-check-crypto-token-safety" className="text-primary underline underline-offset-4">
              step-by-step token safety guide
            </Link>{" "}
            or learn what a{" "}
            <Link to="/glossary/honeypot" className="text-primary underline underline-offset-4">
              honeypot
            </Link>{" "}
            and a{" "}
            <Link to="/glossary/rug-pull" className="text-primary underline underline-offset-4">
              rug pull
            </Link>{" "}
            are.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-10 mb-4">
            {chain.name} scanner FAQ
          </h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-foreground mb-1">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl font-semibold text-foreground mt-12 mb-3">
            Other supported networks
          </h2>
          <div className="flex flex-wrap gap-2">
            {chains
              .filter((c) => c.slug !== chain.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  to={`/chains/${c.slug}`}
                  className="inline-flex items-center rounded-full bg-secondary/40 border border-border/40 px-3 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChainLanding;