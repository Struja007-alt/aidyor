export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  content: string; // HTML
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-a-honeypot-token",
    title: "What Is a Honeypot Token? How to Detect and Avoid Crypto Honeypots",
    excerpt: "Honeypot tokens let you buy but never sell. Learn how they work, what red flags to watch for, and how to check any token before you invest.",
    date: "2026-07-03",
    readTime: "5 min",
    category: "Security",
    tags: ["honeypot", "scam detection", "crypto security"],
    metaTitle: "What Is a Honeypot Token? Detect & Avoid Honeypots | AIDYOR",
    metaDescription: "Honeypot tokens trap buyers — you can buy but never sell. Learn how honeypot contracts work, the warning signs, and how to use a free honeypot checker to protect yourself.",
    content: `
      <p>A honeypot token is a smart contract that lets you buy but blocks — or heavily taxes — your attempt to sell. The contract looks and trades like a normal token on a DEX, but hidden logic prevents anyone except the deployer from cashing out. It is one of the most common crypto scams, and one of the easiest to check for before you buy.</p>

      <h2>How a Honeypot Contract Actually Works</h2>
      <p>Honeypots work by modifying the token's transfer logic so that buying succeeds normally but selling either fails outright or is taxed at close to 100%. A simplified version of the malicious logic looks like this:</p>
      <pre><code>function _transfer(address from, address to, uint256 amount) internal {
    if (to == pancakeSwapPair && from != owner) {
        // sells routed through the DEX pair are blocked
        // unless the sender is the contract owner
        require(false, "Trading disabled");
    }
    // buys and owner sells proceed normally
    super._transfer(from, to, amount);
}</code></pre>
      <p>Other variants use a dynamic tax variable the owner can raise to 90–100% after enough buyers pile in, or a blacklist mapping that silently blocks specific wallets from selling. All of these are invisible from a DEX chart — the token can show real volume and a rising price chart right up until buyers try to exit.</p>

      <h2>A Real Example</h2>
      <p>The best-known case is the SQUID token, launched in late 2021 riding the popularity of the Netflix show. Its contract blocked ordinary wallets from selling while the price was driven up by buy-only volume — a textbook honeypot. When the developers finally pulled the liquidity pool on November 1, 2021, the token collapsed from a peak near $2,861 to effectively zero within minutes, and investors lost an estimated $3.3–3.4 million. The warning signs — an unverified contract, no ability to simulate a sell, and unlocked liquidity — were all present before launch.</p>

      <h2>Red Flags to Check Before You Buy</h2>
      <ul>
        <li><strong>Liquidity lock:</strong> Is the LP token locked via Unicrypt, Team Finance, or PinkSale — and for how long? No lock or a lock under 30 days is a weak signal.</li>
        <li><strong>Simulated sell:</strong> Can a scanner simulate a sell transaction before you buy? If a simulated sell fails or returns close to $0, that's a honeypot.</li>
        <li><strong>Contract verification:</strong> Is the source code verified on the relevant chain explorer? Unverified contracts cannot be audited by anyone.</li>
        <li><strong>Ownership status:</strong> Has ownership been renounced, or does the deployer retain functions that can change tax rates or blacklist wallets?</li>
        <li><strong>Sell tax percentage:</strong> Anything above 10% is worth scrutiny; above 25% is rarely legitimate; a tax that can be changed after deployment is a major red flag even if it starts low.</li>
      </ul>

      <h2>See It In Action: Scanning a Token With AIDYOR</h2>
      <p>Rather than checking each of these manually across separate tools, AIDYOR runs all five checks in a single scan. Paste a contract address, and within seconds you get a 0–100 risk score along with the specific flags that drove it — for example, "Sell simulation failed" or "Sell tax: 42%, non-standard." Because AIDYOR actually attempts a simulated sell rather than only reading static contract code, it catches honeypots that hide their logic behind conditions that only trigger after a real buy.</p>

      <h2>Honeypot Checks on Avalanche (AVAX)</h2>
      <p>Honeypot contracts are not limited to Ethereum and BNB Chain — they show up regularly on Avalanche C-Chain as well, often on tokens launched through Trader Joe or Pangolin. The same checks apply: verify the contract on Snowtrace, confirm liquidity lock status, and run a sell simulation before buying. AIDYOR's scanner supports Avalanche natively, so you can check an AVAX-based token the same way you would on Ethereum or BSC — no separate tool needed.</p>

      <h2>What to Do If You Suspect a Honeypot</h2>
      <p>If a scan flags "Honeypot detected" or returns a risk score below 40, do not invest — and if you're already holding a suspected honeypot, do not buy more hoping to average down; you will not be able to sell your way out. The only real recourse is to report the contract address on the relevant blockchain explorer and warn the token's community so others don't fall for the same trap.</p>

      <h2>Summary</h2>
      <p>Honeypot tokens rely on the fact that most buyers can't read Solidity and don't check liquidity locks before trading. Every red flag above is detectable on-chain before you spend a dollar. Paste any contract address into AIDYOR's free scanner — including AVAX, BSC, and Ethereum tokens — to get a sell simulation and risk score in seconds, with no wallet connection required.</p>
    `
  },
  {
    slug: "what-is-a-rug-pull-crypto",
    title: "What Is a Rug Pull in Crypto? How to Spot One Before Losing Your Money",
    excerpt: "Rug pulls wiped out billions in DeFi. Learn the difference between hard and soft rugs, the on-chain signals that predict them, and how to protect yourself.",
    date: "2026-07-03",
    readTime: "5 min",
    category: "Security",
    tags: ["rug pull", "DeFi security", "liquidity"],
    metaTitle: "What Is a Rug Pull in Crypto? How to Spot & Avoid Them | AIDYOR",
    metaDescription: "A rug pull is when crypto developers abandon a project and drain investor funds. Learn how hard and soft rug pulls work and how to use a rug pull detector to protect yourself.",
    content: `
      <h2>What Is a Rug Pull?</h2>
      <p>A rug pull is an exit scam in which cryptocurrency developers abandon a project and drain investor funds — usually by withdrawing all liquidity from a DEX pool, dumping their token holdings, or both. The term comes from the phrase "pulling the rug out" from under investors.</p>
      <p>Rug pulls accounted for over <strong>$2.8 billion in losses in a single year</strong> across DeFi. Unlike honeypots, rug pulls often involve projects that appear legitimate for days or weeks before the exit.</p>

      <h2>Hard Rug vs Soft Rug: What's the Difference?</h2>
      <p><strong>Hard rug pull:</strong> Developers use a malicious backdoor in the smart contract to drain all liquidity instantly. This is a premeditated smart contract exploit that wipes out 100% of the pool in one transaction. Investors are left with worthless tokens and no liquidity to sell into.</p>
      <p><strong>Soft rug pull:</strong> Developers gradually dump their large pre-mined token allocation on retail buyers, then quietly abandon the project. No smart contract exploit is needed — they simply sell their massive holdings over days or weeks, collapsing the price while pretending to still be active.</p>

      <h2>On-Chain Red Flags That Predict Rug Pulls</h2>
      <ul>
        <li><strong>Unlocked liquidity</strong> — if developer LP tokens are not locked via a third-party service (Unicrypt, Team Finance, PinkSale), they can drain the pool at any time</li>
        <li><strong>Mintable token supply</strong> — if the owner can mint unlimited new tokens, they can dilute your holdings to zero</li>
        <li><strong>Owner wallet holds large supply</strong> — if the deployer or team wallets hold more than 20% of circulating supply, a dump is a constant risk</li>
        <li><strong>Renounced but mutable contract</strong> — some contracts have hidden admin functions even after renouncing ownership</li>
        <li><strong>Very new token with no audit</strong> — tokens launched within days with no third-party security review are high risk</li>
        <li><strong>Suspicious social activity</strong> — sudden deletion of Telegram groups, Twitter accounts going private, or developers going quiet</li>
      </ul>

      <h2>How to Detect Rug Pull Risk Before Investing</h2>
      <p>AIDYOR's token scanner checks each of these risk factors automatically across 9 blockchain networks:</p>
      <ul>
        <li>Liquidity lock status — verified against Unicrypt, Team Finance, PinkSale, and DXSale</li>
        <li>Ownership status — whether the contract owner has been renounced or retains dangerous permissions</li>
        <li>Holder concentration — percentage of supply held by the top 10 wallets</li>
        <li>Mintable supply detection — whether new tokens can be created by the owner</li>
        <li>Contract verification — whether source code is publicly visible for review</li>
      </ul>
      <p>You can scan by contract address, token name, or screenshot. Every scan takes under 10 seconds and requires no wallet connection.</p>

      <h2>Summary</h2>
      <p>Rug pulls are preventable with proper due diligence. The key signals — unlocked liquidity, concentrated holdings, mintable supply, and unverified contracts — are all detectable on-chain before you invest. Use a rug pull detector like AIDYOR to check every token before committing funds, no matter how legitimate the project looks on the surface.</p>
    `
  },
  {
    slug: "how-to-check-crypto-token-safety",
    title: "How to Check If a Crypto Token Is Safe: A Step-by-Step Guide",
    excerpt: "Most rug pulls and honeypots are detectable before you invest. Here are the 7 on-chain checks every crypto investor should run on any new token.",
    date: "2026-07-03",
    readTime: "6 min",
    category: "Guides",
    tags: ["token safety", "DYOR", "crypto guide", "token scanner"],
    metaTitle: "How to Check If a Crypto Token Is Safe (7-Step Guide) | AIDYOR",
    metaDescription: "Before buying any crypto token, run these 7 on-chain safety checks. Learn how to detect honeypots, rug pulls, hidden taxes, and scam tokens — with free tools.",
    content: `
      <h2>Why Most Crypto Losses Are Preventable</h2>
      <p>The vast majority of crypto scams — honeypots, rug pulls, hidden taxes — leave detectable footprints on the blockchain before investors lose money. The problem is not that the warning signs are invisible. It is that most retail investors do not know where to look or which tools to use.</p>
      <p>This guide walks through the 7 on-chain checks you should run on any token before investing.</p>

      <h2>Step 1: Verify the Contract Address</h2>
      <p>Always confirm you have the official contract address from the project's verified social channels or official website — never from a Telegram DM, Google ad, or unverified post. Scammers routinely deploy copycat tokens with similar names and fake trading activity. Paste the exact address into your scanner.</p>

      <h2>Step 2: Run a Honeypot Simulation</h2>
      <p>A honeypot simulation actually attempts a simulated buy and sell of the token to verify that selling is possible. If the simulated sell fails or returns 0, the token is a honeypot. This is the single most important check for any new token on a DEX.</p>

      <h2>Step 3: Check Buy and Sell Taxes</h2>
      <p>Legitimate tokens typically have 0–5% taxes. Anything above 10% on buys or sells is a serious red flag. Taxes above 25% make profitable trading nearly impossible. Some contracts have a low buy tax (1–3%) to appear legitimate, but a hidden sell tax of 80–99% — making it effectively a honeypot without triggering standard honeypot detectors.</p>

      <h2>Step 4: Verify Liquidity Is Locked</h2>
      <p>If a project's LP (liquidity provider) tokens are not locked via a third-party service like Unicrypt, Team Finance, or PinkSale, the developers can drain the entire liquidity pool at any time. Always verify lock duration — a lock of 30 days provides minimal protection; 6–12 months or longer is a meaningful signal.</p>

      <h2>Step 5: Analyze Holder Distribution</h2>
      <p>Check what percentage of the total supply is held by the top 10 wallets. If a single wallet holds more than 10% of supply (excluding known burn addresses and CEX wallets), a coordinated dump can crash the price instantly. Concentrated holder distributions are one of the most reliable predictors of soft rug pulls.</p>

      <h2>Step 6: Check Contract Verification and Ownership</h2>
      <p>Verified contracts have their source code publicly readable on Etherscan, BscScan, or equivalent explorers. Unverified contracts are impossible to audit and should be treated as high risk. Additionally, check whether contract ownership has been renounced — a renounced contract cannot be modified after deployment, reducing the risk of backdoor exploits.</p>

      <h2>Step 7: Review the Token Standard</h2>
      <p>Non-standard tokens — contracts that do not fully implement ERC-20, BEP-20, or SPL token standards — are a warning sign. Non-compliant contracts may have custom transfer logic that enables hidden fees, wallet blocking, or trading restrictions not visible through standard interfaces.</p>

      <h2>How AIDYOR Runs All 7 Checks Automatically</h2>
      <p>AIDYOR aggregates data from 7+ security APIs — GoPlus, RugCheck, Unicrypt, DexScreener, and others — and runs all of the above checks in a single scan, returning a 0–100 risk score with plain-English explanations. You can scan by contract address, token name, or by dropping a screenshot: AIDYOR's OCR engine extracts contract addresses from images automatically, so you can scan tokens directly from Telegram screenshots or social media posts without ever typing an address.</p>
      <p>Scans are free, instant, and require no wallet connection.</p>
    `
  },
  {
    slug: "smart-contract-vulnerabilities-developers",
    title: "Top Smart Contract Vulnerabilities Every Solidity Developer Must Know",
    excerpt: "Reentrancy, integer overflow, tx.origin auth, and 9 more vulnerabilities that have cost DeFi billions. Learn how to detect and fix them before deployment.",
    date: "2026-07-03",
    readTime: "7 min",
    category: "Development",
    tags: ["smart contract", "Solidity", "security audit", "developers", "reentrancy"],
    metaTitle: "Top Smart Contract Vulnerabilities Solidity Developers Must Know | AIDYOR",
    metaDescription: "Reentrancy, integer overflow, tx.origin auth, and 9 more critical Solidity vulnerabilities explained. Learn how to detect and fix smart contract bugs before your token launches.",
    content: `
      <h2>Why Smart Contract Security Matters Before Launch</h2>
      <p>Once a smart contract is deployed to a blockchain, it is immutable. A vulnerability that goes undetected before launch can be exploited at any time — and DeFi history is full of protocols that lost millions to bugs that were preventable with a proper pre-audit review. This guide covers the most critical Solidity vulnerabilities every developer must understand before deploying a token or DeFi contract.</p>

      <h2>1. Reentrancy Attacks</h2>
      <p>Reentrancy is the vulnerability that enabled the 2016 DAO hack ($60M). It occurs when a contract sends ETH to an external address before updating its own state. The external address can call back into the original contract recursively, draining funds before the balance is updated.</p>
      <p><strong>Fix:</strong> Always follow the Checks-Effects-Interactions pattern — update state variables before making external calls. Use OpenZeppelin's ReentrancyGuard modifier.</p>

      <h2>2. Integer Overflow and Underflow</h2>
      <p>In Solidity versions below 0.8.0, arithmetic operations do not revert on overflow or underflow — a uint256 at its maximum value wraps around to 0 when incremented. Attackers can exploit this to manipulate balances, bypass access controls, or mint unlimited tokens.</p>
      <p><strong>Fix:</strong> Use Solidity 0.8.0 or higher (overflow/underflow protection is built in), or use OpenZeppelin's SafeMath library for older versions.</p>

      <h2>3. tx.origin Authentication</h2>
      <p>Using <code>tx.origin</code> instead of <code>msg.sender</code> for access control is a critical vulnerability. <code>tx.origin</code> always refers to the original externally owned account that initiated a transaction chain — meaning a malicious contract can trick a privileged wallet into calling your contract and bypassing all <code>tx.origin</code>-based checks.</p>
      <p><strong>Fix:</strong> Always use <code>msg.sender</code> for authentication. Never use <code>tx.origin</code> for access control logic.</p>

      <h2>4. Unprotected Initializer Functions</h2>
      <p>Upgradeable contracts using proxy patterns often use initializer functions instead of constructors. If these are not properly protected with an <code>initializer</code> modifier, anyone can call them to reinitialize the contract and take ownership.</p>
      <p><strong>Fix:</strong> Use OpenZeppelin's <code>Initializable</code> contract and always apply the <code>initializer</code> modifier to initialization functions.</p>

      <h2>5. Delegatecall to Untrusted Contracts</h2>
      <p><code>delegatecall</code> executes external code in the context of the calling contract, including its storage. If the delegatecall target is attacker-controlled, they can modify any storage variable — including ownership, balances, and admin keys.</p>
      <p><strong>Fix:</strong> Only use <code>delegatecall</code> with contracts you control and have audited. Never delegatecall to user-supplied addresses.</p>

      <h2>6. Weak Randomness</h2>
      <p>Using <code>block.timestamp</code>, <code>block.number</code>, or <code>blockhash</code> as a source of randomness is predictable and manipulable by miners. This is exploited in NFT minting, lottery contracts, and any system relying on on-chain randomness.</p>
      <p><strong>Fix:</strong> Use Chainlink VRF (Verifiable Random Function) for tamper-proof randomness in production contracts.</p>

      <h2>7. Mutable Buy/Sell Tax Functions</h2>
      <p>Many token contracts include owner functions to adjust trading taxes. If these are not capped in the contract, a developer can raise taxes to 99% after launch — effectively executing a slow rug pull with no on-chain exploit required.</p>
      <p><strong>Fix:</strong> Hard-cap maximum tax values in the contract code (e.g., require tax <= 10%). Alternatively, renounce ownership after launch.</p>

      <h2>8. Selfdestruct Abuse</h2>
      <p>The <code>selfdestruct</code> opcode sends all remaining ETH to a target address and destroys the contract. If accessible to an unauthorized caller, it can be used to drain contract funds or break dependent protocol logic.</p>
      <p><strong>Fix:</strong> Restrict <code>selfdestruct</code> calls to owner-only with a timelock, or avoid using it entirely in production contracts.</p>

      <h2>9. Floating Pragma</h2>
      <p>Using a floating pragma like <code>pragma solidity ^0.8.0;</code> means the contract can be compiled with any compatible version, including versions with known bugs. This creates inconsistency between development and deployment environments.</p>
      <p><strong>Fix:</strong> Lock the pragma to a specific version: <code>pragma solidity 0.8.20;</code></p>

      <h2>Scan Your Contract Before Deployment</h2>
      <p>AIDYOR's Smart Contract Bug Scanner (Pro) runs a dual-engine review against all of the above vulnerability patterns before you deploy. It fetches your verified Solidity source via Etherscan's multichain API, runs 12 static vulnerability checks, and then passes the code through a Gemini AI deep audit that produces severity-rated findings (Critical / High / Medium / Low), an A–F security grade, and remediation guidance — in under 60 seconds. Supports Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, Optimism, and Fantom.</p>
    `
  }
];

export const getBlogPost = (slug: string): BlogPost | undefined =>
  blogPosts.find(p => p.slug === slug);
