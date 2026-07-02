import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, BookOpen, AlertTriangle, TrendingUp, Coins, Landmark, Info } from "lucide-react";

interface TermDetail {
  term: string;
  category: "security" | "trading" | "tokenomics" | "defi" | "general";
  definition: string;
  explanation: string[];
  examples?: string[];
  redFlags?: string[];
  relatedTerms: string[];
}

const termDetails: Record<string, TermDetail> = {
  "honeypot": {
    term: "Honeypot",
    category: "security",
    definition: "A malicious smart contract designed to allow users to buy tokens but prevent them from selling.",
    explanation: [
      "Honeypot scams are one of the most common tactics used by crypto scammers. The contract is programmed with hidden code that blocks sell transactions while allowing buys to proceed normally.",
      "Victims are lured in by seeing the token price rise (since no one can sell), creating artificial demand. When they try to sell, the transaction fails or gets stuck in pending.",
      "These scams often target new investors on decentralized exchanges where there's less oversight. The scammers eventually drain the liquidity pool, leaving holders with worthless tokens."
    ],
    examples: [
      "Transaction reverts with 'insufficient output amount' when selling",
      "Extremely high buy tax that only appears during sell attempts",
      "Whitelist functions that only allow certain wallets to sell"
    ],
    redFlags: [
      "No successful sell transactions on blockchain explorers",
      "Unusual contract functions like 'blacklist' or 'whitelist'",
      "Token showing massive gains with no visible sell pressure",
      "Anonymous team with no verifiable history"
    ],
    relatedTerms: ["rug-pull", "smart-contract", "liquidity-pool"]
  },
  "rug-pull": {
    term: "Rug Pull",
    category: "security",
    definition: "A scam where cryptocurrency developers abandon a project and run away with investors' funds.",
    explanation: [
      "Rug pulls occur when project creators suddenly withdraw all liquidity or dump their holdings, causing the token price to crash to near zero.",
      "There are two main types: hard rug pulls (immediate liquidity removal) and soft rug pulls (gradual selling by insiders over time).",
      "These scams often involve elaborate marketing, fake partnerships, and promises of revolutionary technology to attract victims."
    ],
    examples: [
      "Developers removing 100% of liquidity overnight",
      "Team wallets dumping millions of tokens at once",
      "Project social media accounts suddenly deleted"
    ],
    redFlags: [
      "Unlocked liquidity that can be withdrawn anytime",
      "Anonymous team with no doxxed members",
      "Unrealistic promises of guaranteed returns",
      "Heavy concentration of tokens in few wallets",
      "No audit from reputable security firms"
    ],
    relatedTerms: ["liquidity-lock", "honeypot", "tokenomics"]
  },
  "liquidity-lock": {
    term: "Liquidity Lock",
    category: "security",
    definition: "A mechanism that locks LP (Liquidity Provider) tokens in a time-locked smart contract, preventing developers from removing liquidity.",
    explanation: [
      "When developers add initial liquidity to a trading pair, they receive LP tokens representing their share. A liquidity lock sends these tokens to a time-locked contract.",
      "This provides security for investors because the liquidity cannot be withdrawn until the lock expires, preventing immediate rug pulls.",
      "Reputable projects often lock liquidity for extended periods (6 months to several years) and use trusted lockers like Unicrypt, Team Finance, or PinkSale."
    ],
    examples: [
      "100% of LP tokens locked for 1 year on Unicrypt",
      "Liquidity locked with linear unlock starting after 6 months",
      "Multi-signature lock requiring multiple parties to unlock"
    ],
    redFlags: [
      "No liquidity lock at all",
      "Very short lock period (days or weeks)",
      "Lock on unknown or unverified platforms",
      "Only partial liquidity locked (less than 80%)"
    ],
    relatedTerms: ["liquidity-pool", "lp-tokens", "rug-pull"]
  },
  "airdrop": {
    term: "Airdrop",
    category: "general",
    definition: "Free distribution of tokens to wallet addresses, often used for marketing, community building, or rewarding early supporters.",
    explanation: [
      "Airdrops are a popular way for new projects to distribute tokens and build a community. Recipients typically need to meet certain criteria like holding specific tokens or completing tasks.",
      "While legitimate airdrops exist, many scam airdrops are designed to steal funds. They may require connecting wallets to malicious sites or approving harmful transactions.",
      "Always verify airdrops through official project channels and never approve unlimited token spending permissions."
    ],
    relatedTerms: ["dyor", "wallet-drain", "smart-contract"]
  },
  "amm": {
    term: "AMM (Automated Market Maker)",
    category: "defi",
    definition: "A decentralized exchange protocol that uses mathematical algorithms to price assets instead of traditional order books.",
    explanation: [
      "AMMs use liquidity pools and formulas (like x*y=k) to automatically determine prices based on the ratio of assets in the pool.",
      "This eliminates the need for buyers and sellers to be matched directly, allowing instant trades at algorithmically determined prices.",
      "Popular AMMs include Uniswap, PancakeSwap, and Raydium. They revolutionized DeFi by enabling permissionless trading."
    ],
    relatedTerms: ["dex", "liquidity-pool", "slippage"]
  },
  "dex": {
    term: "DEX (Decentralized Exchange)",
    category: "defi",
    definition: "A peer-to-peer marketplace for trading cryptocurrencies without intermediaries or central authority.",
    explanation: [
      "Unlike centralized exchanges (CEXs), DEXs operate through smart contracts on the blockchain. Users maintain control of their private keys throughout trading.",
      "DEXs offer greater privacy and don't require KYC (Know Your Customer) verification, but may have higher fees and less liquidity than CEXs.",
      "Most DEXs use AMM models, though some implement order book systems on-chain."
    ],
    relatedTerms: ["amm", "liquidity-pool", "smart-contract", "slippage"]
  },
  "fdv": {
    term: "FDV (Fully Diluted Valuation)",
    category: "tokenomics",
    definition: "The total market capitalization of a cryptocurrency if all tokens (including locked, vesting, and unminted) were in circulation at current prices.",
    explanation: [
      "FDV = Current Price × Maximum Total Supply. It represents the theoretical maximum market cap of a project.",
      "Comparing FDV to current market cap reveals dilution risk. A large gap means significant new supply could enter circulation.",
      "High FDV relative to market cap often indicates heavy insider allocation, vesting schedules, or planned emissions that could pressure prices."
    ],
    relatedTerms: ["market-cap", "tokenomics", "minting"]
  },
  "market-cap": {
    term: "Market Cap",
    category: "tokenomics",
    definition: "The total value of a cryptocurrency calculated by multiplying the current price by the circulating supply.",
    explanation: [
      "Market Cap = Current Price × Circulating Supply. It's one of the primary metrics for comparing cryptocurrency sizes.",
      "Unlike FDV, market cap only considers tokens currently available for trading, giving a more accurate picture of current valuation.",
      "Higher market cap generally indicates lower volatility and risk, while low cap tokens are more susceptible to price manipulation."
    ],
    relatedTerms: ["fdv", "tokenomics", "liquidity"]
  },
  "liquidity": {
    term: "Liquidity",
    category: "trading",
    definition: "The ease with which a cryptocurrency can be bought or sold without significantly affecting its price.",
    explanation: [
      "High liquidity means large orders can be executed with minimal price impact (slippage). Low liquidity leads to volatile price swings.",
      "Liquidity is provided by market makers on CEXs and liquidity providers on DEXs. More liquidity generally indicates a healthier market.",
      "New tokens often launch with low liquidity, making them susceptible to manipulation and extreme volatility."
    ],
    relatedTerms: ["liquidity-pool", "slippage", "amm"]
  },
  "liquidity-pool": {
    term: "Liquidity Pool",
    category: "defi",
    definition: "Smart contracts holding pairs of tokens that enable trading on decentralized exchanges.",
    explanation: [
      "Liquidity providers deposit equal values of two tokens into a pool and receive LP tokens representing their share.",
      "Traders swap against these pools, paying fees that are distributed to liquidity providers as yield.",
      "Pool depth determines price impact - larger pools offer better prices for big trades."
    ],
    relatedTerms: ["lp-tokens", "amm", "impermanent-loss"]
  },
  "lp-tokens": {
    term: "LP Tokens",
    category: "defi",
    definition: "Tokens representing your share in a liquidity pool, received when providing liquidity to a DEX.",
    explanation: [
      "When you add liquidity to a pool, you receive LP tokens proportional to your contribution.",
      "LP tokens can be redeemed to withdraw your share of the pool plus any accumulated fees.",
      "These tokens are often locked by legitimate projects to prove commitment and prevent rug pulls."
    ],
    relatedTerms: ["liquidity-pool", "liquidity-lock", "impermanent-loss"]
  },
  "impermanent-loss": {
    term: "Impermanent Loss",
    category: "defi",
    definition: "A temporary loss experienced when providing liquidity due to price divergence between paired assets.",
    explanation: [
      "When token prices in a pool change relative to each other, liquidity providers may end up with less value than if they had simply held the tokens.",
      "The loss is 'impermanent' because it only becomes permanent when you withdraw. If prices return to the original ratio, the loss disappears.",
      "Higher volatility between paired assets increases impermanent loss risk. Stablecoin pairs have minimal IL."
    ],
    relatedTerms: ["liquidity-pool", "lp-tokens", "amm"]
  },
  "slippage": {
    term: "Slippage",
    category: "trading",
    definition: "The difference between the expected trade price and the actual execution price due to market movement or low liquidity.",
    explanation: [
      "Slippage occurs because prices can change between order placement and execution, especially in volatile markets.",
      "DEX traders set slippage tolerance (e.g., 1-5%) to limit acceptable price deviation. High slippage settings can be exploited.",
      "Large trades in low liquidity pools experience significant slippage due to the AMM price curve."
    ],
    relatedTerms: ["amm", "liquidity", "dex"]
  },
  "smart-contract": {
    term: "Smart Contract",
    category: "general",
    definition: "Self-executing code deployed on a blockchain that automatically enforces agreement terms without intermediaries.",
    explanation: [
      "Smart contracts power DeFi applications, NFTs, DAOs, and most blockchain functionality beyond simple transfers.",
      "Once deployed, contract code is immutable (unless designed to be upgradeable), making security audits critical.",
      "Vulnerabilities in smart contracts have led to billions in losses through hacks and exploits."
    ],
    relatedTerms: ["renounced-contract", "honeypot", "dex"]
  },
  "renounced-contract": {
    term: "Renounced Contract",
    category: "security",
    definition: "A smart contract where ownership has been permanently transferred to a null address, preventing any future modifications.",
    explanation: [
      "Renouncing ownership means the original deployer can no longer modify contract parameters, mint tokens, or change fees.",
      "This is considered a positive security signal as it prevents owner-initiated rug pulls or malicious changes.",
      "However, renouncement also means legitimate issues can't be fixed, so it should be done after thorough testing."
    ],
    redFlags: [
      "Contract ownership not renounced on older tokens",
      "Fake renouncement through proxy contracts",
      "Hidden admin functions that persist after renouncement"
    ],
    relatedTerms: ["smart-contract", "rug-pull", "honeypot"]
  },
  "tokenomics": {
    term: "Tokenomics",
    category: "tokenomics",
    definition: "The economic model and distribution structure of a cryptocurrency, including supply, allocation, and utility.",
    explanation: [
      "Tokenomics encompasses total supply, distribution percentages (team, community, investors), vesting schedules, and token utility.",
      "Good tokenomics balance incentives between stakeholders and ensure sustainable growth. Poor tokenomics lead to sell pressure and failure.",
      "Key factors include: fair launch vs. presale allocation, emission schedules, burn mechanisms, and staking rewards."
    ],
    relatedTerms: ["fdv", "market-cap", "minting", "burn"]
  },
  "burn": {
    term: "Burn",
    category: "tokenomics",
    definition: "Permanently removing tokens from circulation by sending them to an inaccessible 'dead' wallet address.",
    explanation: [
      "Token burns reduce circulating supply, theoretically increasing scarcity and value of remaining tokens.",
      "Burns can be one-time events or automatic (a percentage of each transaction is burned).",
      "While often marketed as bullish, burns don't create value - they redistribute existing value among fewer tokens."
    ],
    relatedTerms: ["tokenomics", "minting", "market-cap"]
  },
  "minting": {
    term: "Minting",
    category: "tokenomics",
    definition: "The process of creating new tokens, either programmatically through smart contracts or manually by contract owners.",
    explanation: [
      "Minting increases token supply and can be used for staking rewards, ecosystem incentives, or development funding.",
      "Uncontrolled minting is a red flag as it allows unlimited supply inflation, diluting existing holders.",
      "Legitimate projects have transparent minting schedules and hard caps on maximum supply."
    ],
    redFlags: [
      "Owner can mint unlimited tokens",
      "No maximum supply cap",
      "Hidden minting functions"
    ],
    relatedTerms: ["tokenomics", "burn", "smart-contract"]
  },
  "gas-fees": {
    term: "Gas Fees",
    category: "general",
    definition: "Transaction fees paid to network validators for processing and confirming blockchain operations.",
    explanation: [
      "Gas fees compensate validators for the computational resources needed to execute transactions and smart contracts.",
      "Fees vary based on network congestion - high demand means higher fees. Different blockchains have vastly different fee structures.",
      "Ethereum has historically high fees, while chains like Solana and BNB Chain offer much cheaper transactions."
    ],
    relatedTerms: ["smart-contract", "dex"]
  },
  "whale": {
    term: "Whale",
    category: "trading",
    definition: "An individual or entity holding a large amount of cryptocurrency, capable of significantly influencing market prices.",
    explanation: [
      "Whales can move markets through large buy or sell orders, especially in lower liquidity tokens.",
      "Tracking whale wallets can provide insights into potential market movements and accumulation patterns.",
      "High whale concentration in a token is a risk factor - if major holders sell, prices can crash dramatically."
    ],
    relatedTerms: ["liquidity", "market-cap", "diamond-hands"]
  },
  "dyor": {
    term: "DYOR (Do Your Own Research)",
    category: "general",
    definition: "A common crypto phrase reminding investors to thoroughly investigate projects before investing rather than following others blindly.",
    explanation: [
      "DYOR emphasizes personal responsibility in investment decisions and skepticism toward promotional content.",
      "Proper research includes: reading whitepapers, verifying team identities, checking contract audits, analyzing tokenomics, and reviewing community sentiment.",
      "The phrase is often used as a disclaimer but represents a crucial mindset for avoiding scams."
    ],
    relatedTerms: ["fud", "fomo", "rug-pull"]
  },
  "fomo": {
    term: "FOMO (Fear Of Missing Out)",
    category: "trading",
    definition: "Emotional anxiety driving impulsive buying decisions based on fear of missing profitable opportunities.",
    explanation: [
      "FOMO leads investors to buy assets at peaks after seeing others profit, often resulting in losses when prices correct.",
      "Scammers exploit FOMO through artificial urgency, fake testimonials, and manipulated price pumps.",
      "Successful investors recognize FOMO as an emotional response and stick to research-based strategies."
    ],
    relatedTerms: ["ape-in", "fud", "dyor"]
  },
  "fud": {
    term: "FUD (Fear, Uncertainty, Doubt)",
    category: "trading",
    definition: "Negative information (true or false) spread to create panic selling or distrust in a cryptocurrency project.",
    explanation: [
      "FUD can be legitimate criticism or coordinated disinformation campaigns designed to manipulate prices.",
      "Distinguishing valid concerns from baseless FUD requires research and critical thinking.",
      "Both spreading and dismissing FUD without evidence can lead to poor investment decisions."
    ],
    relatedTerms: ["fomo", "dyor", "whale"]
  },
  "ape-in": {
    term: "Ape In",
    category: "trading",
    definition: "Buying a cryptocurrency quickly and heavily without thorough research, typically driven by FOMO or hype.",
    explanation: [
      "Aping implies impulsive, high-risk behavior similar to 'throwing money' at an investment.",
      "While some apes have profited from early entries, the strategy more often leads to losses, especially in scam tokens.",
      "The term gained popularity during the 2020-2021 DeFi and meme coin boom."
    ],
    relatedTerms: ["fomo", "dyor", "diamond-hands"]
  },
  "diamond-hands": {
    term: "Diamond Hands",
    category: "trading",
    definition: "Holding a cryptocurrency through extreme volatility without selling, regardless of price drops or gains.",
    explanation: [
      "Diamond hands represent conviction in a long-term investment thesis and resistance to emotional selling.",
      "The opposite is 'paper hands' - selling at the first sign of trouble.",
      "While sometimes profitable, diamond hands can also mean holding worthless tokens through a complete collapse."
    ],
    relatedTerms: ["paper-hands", "whale", "fomo"]
  },
  "paper-hands": {
    term: "Paper Hands",
    category: "trading",
    definition: "Selling a cryptocurrency at the first sign of price decline or negative news, often locking in losses.",
    explanation: [
      "Paper hands is considered a derogatory term implying weak conviction and emotional decision-making.",
      "However, cutting losses can be a valid strategy - not every dip recovers.",
      "The key is having a plan rather than reacting emotionally to short-term movements."
    ],
    relatedTerms: ["diamond-hands", "fud", "fomo"]
  },
  "presale": {
    term: "Presale",
    category: "general",
    definition: "A token sale conducted before public launch, typically offering discounted prices to early investors.",
    explanation: [
      "Presales help projects raise initial funding and build community before exchange listings.",
      "Investors get lower prices but often face vesting periods and can't sell immediately at launch.",
      "Many scams operate through presales - collecting funds and never launching a real product."
    ],
    redFlags: [
      "Anonymous team running the presale",
      "Unrealistic promised returns",
      "No clear product or roadmap",
      "Pressure tactics for immediate investment"
    ],
    relatedTerms: ["tokenomics", "rug-pull", "dyor"]
  },
  "wallet-drain": {
    term: "Wallet Drain",
    category: "security",
    definition: "A malicious attack that steals all tokens and NFTs from a cryptocurrency wallet through exploited approvals or phishing.",
    explanation: [
      "Wallet drains typically work by tricking users into signing malicious transactions that grant unlimited token spending permissions.",
      "These attacks often come through fake airdrop claims, phishing websites mimicking popular platforms, or compromised social media links.",
      "Once approved, the attacker's contract can transfer all approved tokens without further user interaction."
    ],
    redFlags: [
      "Requests to connect wallet on unfamiliar sites",
      "Transactions requesting unlimited token approval",
      "Airdrops requiring claims on third-party sites",
      "Discord DMs with 'exclusive' minting links"
    ],
    relatedTerms: ["airdrop", "smart-contract", "honeypot"]
  }
};

const categoryIcons: Record<string, React.ReactNode> = {
  security: <AlertTriangle className="w-5 h-5" />,
  trading: <TrendingUp className="w-5 h-5" />,
  tokenomics: <Coins className="w-5 h-5" />,
  defi: <Landmark className="w-5 h-5" />,
  general: <Info className="w-5 h-5" />,
};

const categoryColors: Record<string, string> = {
  security: "bg-red-500/20 text-red-400 border-red-500/30",
  trading: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tokenomics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  defi: "bg-green-500/20 text-green-400 border-green-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const GlossaryTerm = () => {
  const { slug } = useParams<{ slug: string }>();
  const term = slug ? termDetails[slug] : null;

  useEffect(() => {
    document.title = term ? `${term.term} | AIDYOR Glossary` : "Glossary | AIDYOR";
  }, [term]);

  if (!term) {
    return <Navigate to="/glossary" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/glossary"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Glossary
          </Link>
          
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-xl border ${categoryColors[term.category]}`}>
              {categoryIcons[term.category]}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{term.term}</h1>
                <span className={`px-2 py-0.5 rounded text-xs border ${categoryColors[term.category]}`}>
                  {term.category === "defi" ? "DeFi" : term.category}
                </span>
              </div>
              <p className="text-lg text-muted-foreground">{term.definition}</p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Understanding {term.term}
          </h2>
          <div className="space-y-4">
            {term.explanation.map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Examples */}
        {term.examples && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Examples</h2>
            <ul className="space-y-2">
              {term.examples.map((example, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary mt-1">•</span>
                  {example}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Red Flags */}
        {term.redFlags && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Red Flags to Watch For
            </h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <ul className="space-y-2">
                {term.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-300">
                    <span className="mt-1">⚠️</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Related Terms */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Related Terms</h2>
          <div className="flex flex-wrap gap-2">
            {term.relatedTerms.map((related) => {
              const relatedTerm = termDetails[related];
              return (
                <Link
                  key={related}
                  to={`/glossary/${related}`}
                  className="px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-sm"
                >
                  {relatedTerm?.term || related}
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <h3 className="font-semibold mb-2">Ready to analyze a token?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Use our scanner to check for {term.category === "security" ? "these security risks" : "potential issues"} automatically.
          </p>
          <Link
            to="/#scanner"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open Token Scanner
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link to="/glossary" className="hover:text-primary transition-colors">Glossary</Link>
            <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link to="/transparency" className="hover:text-primary transition-colors">Transparency</Link>
            <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
          </div>
          <p>© {new Date().getFullYear()} AIDyor. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default GlossaryTerm;
