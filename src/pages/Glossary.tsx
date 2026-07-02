import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";

interface GlossaryTerm {
  term: string;
  slug: string;
  shortDefinition: string;
  category: "security" | "trading" | "tokenomics" | "defi" | "general";
}

const glossaryTerms: GlossaryTerm[] = [
  { term: "Airdrop", slug: "airdrop", shortDefinition: "Free distribution of tokens to wallet addresses, often used for marketing or community building.", category: "general" },
  { term: "AMM (Automated Market Maker)", slug: "amm", shortDefinition: "A decentralized exchange protocol that uses algorithms to price assets instead of order books.", category: "defi" },
  { term: "Ape In", slug: "ape-in", shortDefinition: "Buying a token quickly without doing proper research, often driven by FOMO.", category: "trading" },
  { term: "Burn", slug: "burn", shortDefinition: "Permanently removing tokens from circulation by sending them to an inaccessible wallet.", category: "tokenomics" },
  { term: "DEX (Decentralized Exchange)", slug: "dex", shortDefinition: "A peer-to-peer marketplace for trading cryptocurrencies without intermediaries.", category: "defi" },
  { term: "Diamond Hands", slug: "diamond-hands", shortDefinition: "Holding an asset through volatility without selling, regardless of price movements.", category: "trading" },
  { term: "DYOR (Do Your Own Research)", slug: "dyor", shortDefinition: "A reminder to investigate projects thoroughly before investing.", category: "general" },
  { term: "FDV (Fully Diluted Valuation)", slug: "fdv", shortDefinition: "The total market cap if all tokens were in circulation at the current price.", category: "tokenomics" },
  { term: "FOMO (Fear Of Missing Out)", slug: "fomo", shortDefinition: "Anxiety-driven buying based on fear of missing profitable opportunities.", category: "trading" },
  { term: "FUD (Fear, Uncertainty, Doubt)", slug: "fud", shortDefinition: "Negative information spread to create panic selling or distrust.", category: "trading" },
  { term: "Gas Fees", slug: "gas-fees", shortDefinition: "Transaction fees paid to network validators for processing blockchain operations.", category: "general" },
  { term: "Honeypot", slug: "honeypot", shortDefinition: "A malicious contract that allows buying but prevents selling tokens.", category: "security" },
  { term: "Impermanent Loss", slug: "impermanent-loss", shortDefinition: "Temporary loss when providing liquidity due to price changes between paired assets.", category: "defi" },
  { term: "Liquidity", slug: "liquidity", shortDefinition: "The ease of buying or selling an asset without significantly affecting its price.", category: "trading" },
  { term: "Liquidity Lock", slug: "liquidity-lock", shortDefinition: "Locking LP tokens in a time-locked contract to prevent developers from removing liquidity.", category: "security" },
  { term: "Liquidity Pool", slug: "liquidity-pool", shortDefinition: "Smart contracts holding token pairs that enable trading on decentralized exchanges.", category: "defi" },
  { term: "LP Tokens", slug: "lp-tokens", shortDefinition: "Tokens representing your share in a liquidity pool, received when providing liquidity.", category: "defi" },
  { term: "Market Cap", slug: "market-cap", shortDefinition: "The total value of a cryptocurrency calculated by price × circulating supply.", category: "tokenomics" },
  { term: "Minting", slug: "minting", shortDefinition: "Creating new tokens, either programmatically or by the contract owner.", category: "tokenomics" },
  { term: "Paper Hands", slug: "paper-hands", shortDefinition: "Selling an asset at the first sign of price decline or trouble.", category: "trading" },
  { term: "Presale", slug: "presale", shortDefinition: "A token sale before public launch, often at discounted prices.", category: "general" },
  { term: "Renounced Contract", slug: "renounced-contract", shortDefinition: "A smart contract where ownership has been given up, preventing future modifications.", category: "security" },
  { term: "Rug Pull", slug: "rug-pull", shortDefinition: "A scam where developers abandon a project and steal investor funds.", category: "security" },
  { term: "Slippage", slug: "slippage", shortDefinition: "The difference between expected and actual trade price due to market movement.", category: "trading" },
  { term: "Smart Contract", slug: "smart-contract", shortDefinition: "Self-executing code on the blockchain that automatically enforces agreement terms.", category: "general" },
  { term: "Tokenomics", slug: "tokenomics", shortDefinition: "The economic model and distribution structure of a cryptocurrency.", category: "tokenomics" },
  { term: "Wallet Drain", slug: "wallet-drain", shortDefinition: "Malicious contracts or approvals that steal all tokens from a connected wallet.", category: "security" },
  { term: "Whale", slug: "whale", shortDefinition: "An individual or entity holding a large amount of cryptocurrency.", category: "trading" },
];

const categoryColors: Record<string, string> = {
  security: "bg-red-500/20 text-red-400 border-red-500/30",
  trading: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tokenomics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  defi: "bg-green-500/20 text-green-400 border-green-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Glossary = () => {
  useEffect(() => {
    document.title = "Glossary | AIDYOR";
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return glossaryTerms.filter((term) => {
      const matchesSearch = term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.shortDefinition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = !activeFilter || term.category === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach((term) => {
      const letter = term.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const availableLetters = Object.keys(groupedTerms);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Crypto Glossary</h1>
              <p className="text-muted-foreground">Essential terms every crypto investor should know</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                !activeFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
              }`}
            >
              All
            </button>
            {["security", "trading", "tokenomics", "defi", "general"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors capitalize ${
                  activeFilter === cat ? categoryColors[cat] : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {cat === "defi" ? "DeFi" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* A-Z Navigation */}
        <div className="mb-6 flex flex-wrap gap-1 justify-center bg-card/50 rounded-lg p-3 border border-border">
          {alphabet.map((letter) => (
            <a
              key={letter}
              href={availableLetters.includes(letter) ? `#letter-${letter}` : undefined}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                availableLetters.includes(letter)
                  ? "bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground/30 cursor-default"
              }`}
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Terms List */}
        <div className="space-y-8">
          {alphabet.map((letter) => {
            const terms = groupedTerms[letter];
            if (!terms) return null;
            
            return (
              <div key={letter} id={`letter-${letter}`} className="scroll-mt-20">
                <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">
                  {letter}
                </h2>
                <div className="grid gap-3">
                  {terms.map((term) => (
                    <Link
                      key={term.slug}
                      to={`/glossary/${term.slug}`}
                      className="block p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {term.term}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs border ${categoryColors[term.category]}`}>
                              {term.category === "defi" ? "DeFi" : term.category}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {term.shortDefinition}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTerms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No terms found matching your search.</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link to="/transparency" className="hover:text-primary transition-colors">Transparency</Link>
            <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
          <p>© {new Date().getFullYear()} AIDyor. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Glossary;
