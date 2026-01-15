import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, AlertTriangle, Shield, Search, Coins, Lock, Users } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqCategories = [
    {
      icon: AlertTriangle,
      title: "Understanding Crypto Scams",
      color: "text-danger",
      questions: [
        {
          q: "What is a rug pull?",
          a: "A rug pull is a type of crypto scam where developers abandon a project and run away with investors' funds. This typically happens when the team removes liquidity from a trading pool, making it impossible for investors to sell their tokens. Rug pulls can be sudden (hard rug) or gradual (soft rug), where developers slowly drain funds over time."
        },
        {
          q: "What is a honeypot scam?",
          a: "A honeypot is a malicious smart contract that allows users to buy tokens but prevents them from selling. The contract code contains hidden restrictions that block sell transactions while allowing buys, trapping investors' funds. Our scanner specifically checks for honeypot indicators using the GoPlus Security API."
        },
        {
          q: "What are pump and dump schemes?",
          a: "Pump and dump schemes involve artificially inflating a token's price through coordinated buying and misleading promotions, then selling (dumping) when the price peaks. The organizers profit while late investors are left holding worthless tokens. Watch for sudden price spikes with no fundamental news, excessive social media hype, and influencer promotions."
        },
        {
          q: "What are fake airdrops and giveaways?",
          a: "Scammers often impersonate legitimate projects or celebrities, promising free tokens or crypto giveaways. They may ask you to send crypto first, connect your wallet to malicious sites, or share private keys. Legitimate airdrops never require you to send money or share sensitive information."
        },
        {
          q: "What is address poisoning?",
          a: "Address poisoning involves scammers sending tiny transactions from addresses that look similar to ones you frequently interact with. When you copy an address from your transaction history, you might accidentally copy the scammer's address instead. Always verify the full address, not just the first and last characters."
        }
      ]
    },
    {
      icon: Search,
      title: "How to Spot Red Flags",
      color: "text-warning",
      questions: [
        {
          q: "What are the biggest red flags in a new token?",
          a: "Key red flags include: Very low liquidity (under $10K), anonymous team with no track record, unverified or closed-source contracts, high buy/sell taxes (over 10%), concentrated token holdings (few wallets holding majority), no audit from reputable firms, unrealistic promises of returns, and pressure to invest quickly."
        },
        {
          q: "How can I verify if a project team is legitimate?",
          a: "Research team members on LinkedIn, Twitter, and GitHub. Check if they have verifiable work history in crypto or tech. Be wary of stock photos or AI-generated profile pictures. Look for video AMAs or interviews. Remember that even doxxed teams can still rug, so this is just one factor to consider."
        },
        {
          q: "What should I check before buying any token?",
          a: "Before investing: 1) Check liquidity and trading volume on DEXScreener, 2) Verify the contract on a block explorer, 3) Look for security audits, 4) Research the team and community, 5) Read the whitepaper and tokenomics, 6) Check holder distribution for whale concentration, 7) Use our scanner to analyze risk factors, 8) Start with a small test transaction."
        },
        {
          q: "How do I identify fake websites and social media accounts?",
          a: "Check for subtle URL misspellings (e.g., 'uniswap' vs 'un1swap'). Verify official links through CoinGecko or CoinMarketCap. Look for verified badges on social media. Check account age and follower authenticity. Be suspicious of DMs offering investment opportunities. Bookmark official sites rather than clicking links."
        },
        {
          q: "What does it mean if a contract is 'unverified'?",
          a: "An unverified contract means the source code hasn't been published on the block explorer. While not automatically a scam, it prevents anyone from reviewing the code for malicious functions. Legitimate projects typically verify their contracts for transparency. Our scanner flags unverified contracts as a warning."
        }
      ]
    },
    {
      icon: Shield,
      title: "Security Best Practices",
      color: "text-safe",
      questions: [
        {
          q: "How should I store my crypto securely?",
          a: "Use hardware wallets (like Ledger or Trezor) for significant holdings. Never share your seed phrase or private keys with anyone. Use unique, strong passwords for each exchange account. Enable 2FA (preferably hardware keys or authenticator apps, not SMS). Consider using a separate 'hot wallet' with limited funds for daily trading."
        },
        {
          q: "What should I do if I think I've been scammed?",
          a: "Act quickly: 1) Revoke all token approvals using tools like Revoke.cash, 2) Transfer remaining funds to a new wallet, 3) Document everything for potential legal action, 4) Report the scam to the platform and relevant authorities, 5) Warn others in community channels. Unfortunately, recovering stolen crypto is very difficult."
        },
        {
          q: "How do I safely revoke token approvals?",
          a: "Token approvals allow contracts to spend your tokens. Malicious approvals can drain your wallet. Use Revoke.cash or Etherscan's Token Approval Checker to view and revoke approvals. Regularly audit your approvals, especially after interacting with new protocols. Consider using approval limits instead of unlimited approvals."
        },
        {
          q: "What is a safe way to test a new token?",
          a: "Start with a small 'test' purchase to verify you can actually sell. Check if the buy and sell taxes match what's advertised. Monitor the transaction on a block explorer. Wait a few hours and try to sell a portion. If everything works correctly, you can consider a larger position—but never invest more than you can afford to lose."
        },
        {
          q: "Should I use a VPN when trading crypto?",
          a: "A VPN can add privacy but isn't a complete security solution. It helps protect your IP address and can bypass geo-restrictions. However, some exchanges may flag VPN usage. More important security measures include hardware wallets, 2FA, and careful verification of all transactions and addresses."
        }
      ]
    },
    {
      icon: Coins,
      title: "Understanding Tokenomics",
      color: "text-primary",
      questions: [
        {
          q: "What are buy and sell taxes, and when are they dangerous?",
          a: "Buy/sell taxes are fees taken on each transaction, often used for marketing, development, or liquidity. Taxes under 5% are generally acceptable. Taxes of 5-10% require caution. Taxes over 10% are a major red flag. Some scams start with low taxes and increase them later. Our scanner monitors tax percentages from the contract."
        },
        {
          q: "What does 'locked liquidity' mean and why does it matter?",
          a: "Locked liquidity means the trading pool funds are secured in a time-locked contract, preventing the team from removing them. This protects against rug pulls. Check the lock duration (longer is better), the percentage locked (higher is better), and verify the lock on platforms like Team.Finance or UNCX. Unlocked liquidity is a major red flag."
        },
        {
          q: "How do I check token holder distribution?",
          a: "Use block explorers (Etherscan, BscScan, Solscan) to view top holders. Red flags include: single wallet holding over 10% (excluding contracts), top 10 wallets holding over 50%, recent large accumulations by few wallets. Our scanner provides holder count data from security APIs."
        },
        {
          q: "What is 'max wallet' and 'max transaction' limit?",
          a: "These are contract restrictions limiting how many tokens one wallet can hold or buy per transaction. They can prevent whale manipulation but can also be used maliciously (setting limits so low that normal users can't accumulate, while insiders are whitelisted). Check if limits are reasonable and if there are exempted addresses."
        },
        {
          q: "What does it mean if a token is 'mintable'?",
          a: "A mintable token allows the owner or contract to create new tokens after launch, potentially diluting existing holders' value. While some projects legitimately need minting capabilities, it's often a red flag for scams. Our scanner flags mintable contracts as a warning. Ideally, mint functions should be renounced or controlled by a DAO."
        }
      ]
    },
    {
      icon: Lock,
      title: "Contract Security",
      color: "text-accent",
      questions: [
        {
          q: "What makes a contract 'renounced' and is it always safe?",
          a: "Renouncing ownership means the deployer gives up control over the contract's admin functions. While this prevents certain rug pull methods, it's not a guarantee of safety. Malicious code can be built in before renouncing. Some scams use 'hidden owner' functions that survive renouncement. Our scanner checks for these patterns."
        },
        {
          q: "What is a proxy contract and why should I be careful?",
          a: "Proxy contracts allow developers to update the contract logic after deployment. While useful for legitimate upgrades, they can be exploited to add malicious code later. A 'safe' contract today could become a honeypot tomorrow. Check if a contract uses proxy patterns and who controls the upgrade mechanism."
        },
        {
          q: "What are 'blacklist' and 'whitelist' functions?",
          a: "Blacklist functions allow blocking specific addresses from trading, while whitelist functions allow only approved addresses to trade. These can be used legitimately (blocking bots, compliance) or maliciously (blocking all sellers, exempting insiders from taxes). Our scanner flags contracts with these capabilities."
        },
        {
          q: "How do I read a basic smart contract for red flags?",
          a: "Look for: 1) Verified source code on the block explorer, 2) Functions like 'setTax', 'blacklist', 'pause' that give owner control, 3) Hidden or obfuscated code sections, 4) External calls to unknown contracts, 5) Unusual modifier patterns. If you're not technical, rely on audits and security scanner results like ours."
        },
        {
          q: "What is a security audit and how reliable are they?",
          a: "Security audits are professional reviews of smart contract code by firms like CertiK, Hacken, or PeckShield. They identify vulnerabilities and risks. However, audits have limitations: they're point-in-time snapshots, may not catch all issues, and some firms have varying quality. An audit is helpful but not a guarantee of safety."
        }
      ]
    },
    {
      icon: Users,
      title: "Community & Social Signals",
      color: "text-muted-foreground",
      questions: [
        {
          q: "How can I tell if a Telegram or Discord community is fake?",
          a: "Red flags include: Disabled or heavily moderated chat (no questions allowed), fake member counts (bots), admins immediately DMing you, aggressive price discussion without substance, deleted messages questioning the project, and no technical discussions. Healthy communities allow skepticism and have organic conversations."
        },
        {
          q: "Should I trust crypto influencers and their recommendations?",
          a: "Be extremely cautious. Many influencers are paid to promote tokens without disclosing it. They often sell their holdings while their followers buy. Look for disclosure statements, check if they've promoted scams before, and never invest based solely on influencer recommendations. Do your own research."
        },
        {
          q: "What is a 'coordinated shill campaign'?",
          a: "Shill campaigns involve paid promoters flooding social media with positive content about a token to create artificial hype. Signs include: identical talking points across accounts, new accounts with little history, sudden flood of posts, and unrealistic profit claims. These often precede pump and dump schemes."
        },
        {
          q: "How do I verify information about a crypto project?",
          a: "Cross-reference multiple sources: official website, verified social media, CoinGecko/CoinMarketCap listings, block explorer data, audit reports, and reputable news sources. Be skeptical of information from single sources or anonymous posts. When in doubt, wait and observe before investing."
        }
      ]
    }
  ];

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
          <HelpCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Learn how to protect yourself from crypto scams, identify red flags, and follow security best practices.
        </p>

        {/* Quick Navigation */}
        <div className="bg-card/50 border border-border rounded-xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Quick Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {faqCategories.map((category, index) => (
              <a
                key={index}
                href={`#category-${index}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-sm hover:bg-secondary transition-colors"
              >
                <category.icon className={`w-4 h-4 ${category.color}`} />
                {category.title}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <section key={categoryIndex} id={`category-${categoryIndex}`} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <category.icon className={`w-6 h-6 ${category.color}`} />
                <h2 className="text-xl font-semibold">{category.title}</h2>
              </div>
              
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((item, questionIndex) => (
                  <AccordionItem 
                    key={questionIndex} 
                    value={`item-${categoryIndex}-${questionIndex}`}
                    className="bg-card border border-border rounded-xl px-4 data-[state=open]:bg-card/80"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <span className="font-medium text-foreground">{item.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        {/* Call to Action */}
        <section className="mt-12 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Ready to Scan a Token?</h2>
          <p className="text-muted-foreground mb-6">
            Use our free token scanner to analyze any cryptocurrency for potential risks and red flags.
          </p>
          <Link 
            to="/#scanner"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Shield className="w-5 h-5" />
            Scan a Token Now
          </Link>
        </section>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>For more information about our methodology and limitations:</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to="/transparency" className="text-primary hover:text-primary/80 transition-colors">
              Transparency
            </Link>
            <Link to="/disclaimer" className="text-primary hover:text-primary/80 transition-colors">
              Disclaimer
            </Link>
            <Link to="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
