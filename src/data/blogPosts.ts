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
  },
  {
    slug: "how-to-check-solana-token-safety",
    title: "How to Check If a Solana Token Is Safe: Mint Authority, Freeze Authority and Liquidity",
    excerpt: "Solana tokens don't work like EVM contracts, so the usual checks don't all apply. Learn the Solana-specific red flags: mint authority, freeze authority, Token-2022 extensions and LP status.",
    date: "2026-11-14",
    readTime: "7 min",
    category: "Guides",
    tags: ["Solana", "mint authority", "freeze authority", "token safety", "SPL token"],
    metaTitle: "How to Check If a Solana Token Is Safe (Step by Step) | AIDYOR",
    metaDescription: "Learn how to check a Solana token before buying: mint authority, freeze authority, Token-2022 extensions, LP burn status and holder concentration, plus how to scan it for free.",
    content: `
<p>Checking a Solana token is not the same as checking an Ethereum or BNB Chain token. Solana tokens (SPL tokens) are created through a shared token program rather than each deploying their own contract code, so many EVM red flags — an unverified contract, a hidden sell function in Solidity — do not apply. The risk lives somewhere else: in the <em>authorities</em> set on the token mint, the token program version, and the liquidity pool.</p>
<h2>Why Solana Needs Different Checks</h2>
<p>On EVM chains, a honeypot usually hides in custom transfer logic inside the contract. On Solana, a standard SPL token has no custom code to hide anything in. Instead, the creator keeps special permissions on the mint account — and those permissions can be used against holders. That is why the first question on Solana is not "is the contract verified?" but "what can the creator still do?"</p>
<h2>1. Check the Mint Authority</h2>
<p>The mint authority is the account allowed to create new tokens. If it is still set, the holder of that key can mint unlimited supply at any time, diluting every other holder and crashing the price. If it has been revoked (shown as disabled or null), the supply is fixed.</p>
<p><strong>What to look for:</strong> block explorers such as Solscan or Solana Explorer show the mint authority on the token's page. For a memecoin or any token without a clear reason for ongoing issuance, the mint authority should be disabled.</p>
<h2>2. Check the Freeze Authority</h2>
<p>The freeze authority can freeze individual token accounts, which blocks that wallet from transferring or selling the token. A creator who keeps freeze authority can, in effect, turn a token into a honeypot for any wallet they choose, after you have already bought.</p>
<p>Some legitimate tokens keep a freeze authority for compliance reasons, which is why context matters. For an anonymous-team memecoin, an active freeze authority is a serious red flag.</p>
<h2>3. Check Liquidity: Burned, Locked or Held by the Creator</h2>
<p>When a token is paired in a pool on a Solana DEX such as Raydium, Orca or Meteora, the creator receives LP tokens that represent ownership of that liquidity. Whoever holds the LP tokens can withdraw the liquidity, leaving buyers with nothing to sell into.</p>
<ul>
<li><strong>LP burned:</strong> the LP tokens were sent to an address nobody controls, so the liquidity cannot be withdrawn by the creator.</li>
<li><strong>LP locked:</strong> the LP tokens are held in a lock for a set time. Check the unlock date.</li>
<li><strong>LP held by the creator:</strong> the creator can remove liquidity at any moment. This is the classic rug pull setup.</li>
</ul>
<h2>4. Analyze Holder Concentration (Correctly)</h2>
<p>Look at the top holders and what share of supply they control. One common mistake: the largest "holder" is often the liquidity pool account itself, or a program-owned account, which is normal and not a risk. Exclude those and look at the remaining wallets. A handful of wallets holding a large share of the remaining supply means a coordinated dump can collapse the price.</p>
<p>Also check whether the top wallets were funded from the same source. Several wallets that look independent but were all funded by the creator are one holder in disguise.</p>
<h2>5. Check Whether It Uses Token-2022 and Which Extensions</h2>
<p>Solana has a newer token program, Token-2022, that supports optional extensions. Many are harmless, but some change how the token behaves in ways buyers should know about:</p>
<ul>
<li><strong>Transfer fee:</strong> charges a fee on every transfer, set by the token's authority.</li>
<li><strong>Permanent delegate:</strong> gives an account the ability to move or burn tokens from any holder's account.</li>
<li><strong>Transfer hook:</strong> runs custom program logic on every transfer, which can add restrictions.</li>
<li><strong>Non-transferable:</strong> the token cannot be moved between wallets at all.</li>
</ul>
<p>If a token uses Token-2022, find out which extensions are enabled and who controls them. A permanent delegate on a memecoin is a major warning sign.</p>
<h2>6. Check Whether the Metadata Can Be Changed</h2>
<p>If the update authority on the token metadata is still active, the creator can change the name, symbol and image after launch. This enables bait-and-switch tricks, such as relabelling a token to ride a trending narrative. It is a weaker signal than the authorities above, but worth noting alongside them.</p>
<h2>7. Verify You Have the Real Mint Address</h2>
<p>On Solana, anyone can create a token with any name and ticker, and copies of popular tokens appear within minutes of a narrative taking off. Always get the mint address from the project's official site or verified account, never from a search result, ad or direct message. Our guide on <a href="/blog/fake-copycat-crypto-tokens" style="color:hsl(var(--primary));text-decoration:underline">fake and copycat tokens</a> covers how to verify the right address.</p>
<h2>Quick Solana Token Checklist</h2>
<ul>
<li>Mint authority disabled</li>
<li>Freeze authority disabled (or a clear, legitimate reason for it)</li>
<li>LP burned, or locked with a long duration</li>
<li>Top holders reasonable after excluding the pool and program accounts</li>
<li>No suspicious Token-2022 extensions</li>
<li>Mint address confirmed from an official source</li>
</ul>
<h2>Scan a Solana Token With AIDYOR</h2>
<p>Instead of opening several explorers and tools, you can paste a Solana mint address into AIDYOR's free scanner and get a 0–100 risk score with the specific flags behind it. AIDYOR supports Solana alongside eight other networks, uses security data sources including RugCheck, and needs no wallet connection. If you only have a screenshot from a chat or social post, AIDYOR's OCR can extract the address from the image.</p>
<p>No scanner can promise a token is safe or predict its price, and none of this is financial advice. These checks tell you what the creator <em>can</em> do, which is the part you can verify before you buy. For the general rug pull picture, see <a href="/blog/what-is-a-rug-pull-crypto" style="color:hsl(var(--primary));text-decoration:underline">What Is a Rug Pull in Crypto?</a></p>
`
  },
  {
    slug: "token-approvals-wallet-drainers-revoke",
    title: "Token Approvals and Wallet Drainers: What They Are and How to Revoke Them",
    excerpt: "One signature can give a malicious contract permission to empty your wallet. Learn how token approvals and permit signatures work, how drainers trick you, and how to revoke access.",
    date: "2026-11-14",
    readTime: "7 min",
    category: "Security",
    tags: ["token approvals", "wallet drainer", "revoke", "phishing", "crypto security"],
    metaTitle: "Token Approvals & Wallet Drainers: How to Revoke Access | AIDYOR",
    metaDescription: "What token approvals are, how wallet drainers abuse them through approvals and permit signatures, and step-by-step how to check and revoke dangerous allowances on EVM chains.",
    content: `
<p>Many people who lose funds to a wallet drainer never typed their seed phrase anywhere. They connected a wallet to a fake site and signed one request that looked routine. That request was a token approval, and understanding it is one of the most practical security skills in DeFi.</p>
<h2>What Is a Token Approval?</h2>
<p>On EVM chains, a smart contract cannot simply take tokens from your wallet. First you must call <code>approve</code> on the token, naming the contract (the "spender") and the amount it is allowed to move. After that, the spender can pull up to that amount from your wallet without asking you again. A DEX needs this to swap your tokens, and that is normal.</p>
<p>The danger is in two details. Many apps request an <strong>unlimited</strong> approval (the maximum possible amount) so you do not have to approve again later. And an approval does not expire on its own: it stays active until you revoke it, even if you never use that app again.</p>
<h2>Why Approvals Become a Risk</h2>
<ul>
<li><strong>A malicious spender:</strong> if you approve a scam contract, it can transfer the approved token out of your wallet at any time.</li>
<li><strong>A compromised spender:</strong> a legitimate protocol that is later exploited can have its approvals abused against everyone who approved it.</li>
<li><strong>Forgotten approvals:</strong> old approvals from apps you tried once keep working indefinitely.</li>
</ul>
<p>An approval is limited to the token it was granted for. It does not by itself give access to your other assets, but a drainer will simply ask for several approvals, one per valuable token.</p>
<h2>How Wallet Drainers Trick You</h2>
<p>Drainers are phishing kits that automate the process. They usually arrive through one of these routes:</p>
<ul>
<li><strong>Fake airdrops and claim pages:</strong> "Claim your tokens" on a site linked from a direct message, a fake support account or a hacked social profile.</li>
<li><strong>Fake mints and fake project sites:</strong> a copy of a real project's website with a malicious connect-and-sign flow.</li>
<li><strong>Sponsored search ads:</strong> a fake wallet or DEX site that appears above the real one.</li>
<li><strong>Unsolicited tokens in your wallet:</strong> a worthless token appears with a name that tells you to visit a site. Interacting with it is the trap.</li>
</ul>
<h2>Approvals Without a Transaction: Permit Signatures</h2>
<p>Some tokens and protocols support signed permissions (such as EIP-2612 permits and Permit2) that grant an allowance from an off-chain signature, with no on-chain approval transaction and no gas fee from you. This is convenient, and it is also how drainers move fast: you sign a message, it looks harmless, and the attacker submits it later to take your tokens. NFT collections have an equivalent in <code>setApprovalForAll</code>, which can authorize an address to move every NFT in a collection.</p>
<p>Because no gas prompt appears, signature requests deserve the same suspicion as transactions. If a signing request is unreadable, unexpected or tied to a site you reached from a link, do not sign it.</p>
<h2>Warning Signs Before You Sign</h2>
<ul>
<li>You did not start the action. A site demanding a signature to "verify" or "claim" something is a red flag.</li>
<li>The site was reached from a DM, an ad or an unfamiliar link, not a bookmark you saved.</li>
<li>Your wallet shows an unlimited approval for a token you only wanted to swap once, on a site you do not know.</li>
<li>The request is a block of unreadable data and your wallet gives no clear explanation.</li>
<li>There is urgency or a countdown. Real airdrops do not require instant action.</li>
</ul>
<h2>How to Check and Revoke Approvals</h2>
<ol>
<li>Open an approval checker such as Revoke.cash, or the token approval tool on your chain's block explorer (for example Etherscan's Token Approvals page). Connect your wallet or paste your address for a read-only view.</li>
<li>Select the network. Approvals are per chain, so check each chain you have used.</li>
<li>Review the list of spenders and the amounts. Look for unlimited approvals, unknown contracts and apps you no longer use.</li>
<li>Revoke the ones you do not recognise or no longer need. Revoking is an on-chain transaction, so it costs a small gas fee.</li>
</ol>
<p>Make sure you reach the checker through a bookmark or a source you trust, because fake "revoke" sites exist and are a drainer tactic of their own.</p>
<h2>Habits That Reduce Your Risk</h2>
<ul>
<li>Approve only the amount you need where the app allows editing the allowance, instead of accepting unlimited by default.</li>
<li>Use a separate wallet for minting, airdrops and new apps, and keep your main holdings in a wallet that rarely interacts with anything.</li>
<li>Use a hardware wallet for long-term holdings, and read what it displays before confirming.</li>
<li>Do not interact with tokens you did not buy. Do not try to sell or swap an unsolicited airdrop.</li>
<li>Review and revoke approvals regularly, especially after trying a new app.</li>
</ul>
<h2>If You Think You Have Been Drained or Exposed</h2>
<p>First work out which problem you have. If you signed a bad approval but your seed phrase is safe, revoke the approval and move remaining assets if you cannot revoke fast enough. If you entered your seed phrase or private key anywhere, revoking is not enough, because the attacker controls the wallet itself: create a brand new wallet with a new seed phrase and move whatever you can to it right away. In both cases, stop interacting with the suspicious site.</p>
<h2>Where a Token Scanner Fits</h2>
<p>Revoking approvals protects you from contracts you have already interacted with. Scanning protects you earlier, before you approve or buy. AIDYOR's free scanner checks a token's contract for honeypot behaviour, hidden taxes, ownership and liquidity risks, so you can spot a malicious token before connecting a wallet to anything. It does not replace an approval checker. Use both. For the scanning side, see <a href="/blog/how-to-check-crypto-token-safety" style="color:hsl(var(--primary));text-decoration:underline">How to Check If a Crypto Token Is Safe</a>.</p>
`
  },
  {
    slug: "fake-copycat-crypto-tokens",
    title: "Fake and Copycat Crypto Tokens: How to Verify You Have the Real Contract",
    excerpt: "Anyone can deploy a token with any name and ticker. Learn how scammers clone popular tokens, and how to confirm the real contract address before you buy.",
    date: "2026-11-14",
    readTime: "6 min",
    category: "Security",
    tags: ["fake tokens", "copycat tokens", "contract address", "scam detection", "DYOR"],
    metaTitle: "Fake & Copycat Crypto Tokens: Verify the Real Contract | AIDYOR",
    metaDescription: "Scammers clone popular tokens using identical names, tickers and logos. Learn how to verify the real contract address, spot lookalike tokens and avoid fake airdrops.",
    content: `
<p>A token's name and ticker prove nothing. There is no on-chain registry that stops two tokens from sharing the same name, symbol and logo, so anyone can deploy a token called whatever they like within minutes. Scammers use this constantly, and it is one of the most common ways people buy the wrong token without realising it.</p>
<h2>Why Copycat Tokens Exist</h2>
<p>When a token trends, searches for it spike. Scammers deploy lookalikes to catch buyers who search by name instead of by contract address. They add liquidity, create trading activity, and wait for people to buy. Often the copy is also a honeypot or a rug pull, so the buyer is stuck with the wrong token and cannot sell it.</p>
<h2>Common Copycat Tactics</h2>
<ul>
<li><strong>Identical name, ticker and logo:</strong> a token that looks exactly like the real one in a wallet or on a DEX list.</li>
<li><strong>"Migration" or "v2" claims:</strong> a fake announcement that holders must swap to a new token contract, leading to a malicious contract or approval request.</li>
<li><strong>Lookalike characters:</strong> names or tickers that swap similar letters, add a character or use symbols that resemble Latin letters.</li>
<li><strong>Spam airdrops:</strong> worthless tokens sent to your wallet with a name that tells you to visit a site. The goal is to get you to interact, not to give you value.</li>
<li><strong>Fake pairs and fake volume:</strong> pools created against the real token or against a stablecoin, with wash trading to look active.</li>
</ul>
<h2>How to Verify the Real Contract</h2>
<ol>
<li><strong>Start from an official source.</strong> Get the contract address from the project's own website or its verified social account, and cross-check it against at least one independent source, such as the token's CoinGecko or CoinMarketCap page, which list contract addresses per chain.</li>
<li><strong>Never rely on search results or ads.</strong> Searching a ticker on a DEX or in a search engine returns every token using that name.</li>
<li><strong>Compare history and liquidity.</strong> An established token has a long trading history and deep liquidity. A token with the same name that was created recently, with thin liquidity, is suspicious.</li>
<li><strong>Check the holder count and creation date</strong> on the block explorer. A famous token with only a handful of holders, or a very recent deployment, is almost certainly a copy.</li>
<li><strong>Confirm the chain.</strong> The same project can have different official addresses on different chains. Make sure the address belongs to the chain you are buying on.</li>
<li><strong>Paste the address, do not type or search the name</strong> when you trade or scan.</li>
</ol>
<h2>Unsolicited Tokens in Your Wallet</h2>
<p>If a token you never bought shows up in your wallet, treat it as hostile. Do not try to swap it, sell it, or visit the site in its name. Interacting can trigger an approval request or lead you to a drainer site. Most wallets let you hide such tokens. Our guide to <a href="/blog/token-approvals-wallet-drainers-revoke" style="color:hsl(var(--primary));text-decoration:underline">token approvals and wallet drainers</a> explains what can happen if you do sign.</p>
<h2>Copycats and the Other Red Flags</h2>
<p>A copycat is often a honeypot or rug pull underneath. Even after you have confirmed an address, run the usual checks: sell simulation, taxes, liquidity lock, holder concentration and contract ownership. If you have the wrong token, those checks will often show it, because a fresh copy tends to have unlocked liquidity, concentrated holders and no real history. Our <a href="/blog/how-to-check-crypto-token-safety" style="color:hsl(var(--primary));text-decoration:underline">7-step token safety guide</a> walks through them.</p>
<h2>Scan the Exact Contract Address</h2>
<p>Scanning by contract address checks that specific token, not whatever shares its name. Paste the address into AIDYOR's free scanner to get a 0–100 risk score and the specific flags behind it, across nine blockchain networks, with no wallet connection. If you only have a screenshot from a chat or post, AIDYOR's OCR can extract the address from the image. When you search by name instead, always confirm that the contract address shown matches the official one before you trade.</p>
<h2>Summary</h2>
<p>A matching name and logo is not evidence. Verify the contract address from an official source, compare it against an independent listing, treat unsolicited tokens as threats, and scan the exact address before you buy. None of this is financial advice, but it removes one of the easiest ways to lose money in crypto.</p>
`
  },
  {
    slug: "memecoin-launch-risks-snipers-bundled-wallets",
    title: "Memecoin Launch Risks: Snipers, Bundled Wallets and Insider Supply Explained",
    excerpt: "Brand-new memecoins are where most scams concentrate. Learn how snipers, bundled wallets and insider supply work, and the checks to run before you buy a fresh launch.",
    date: "2026-11-14",
    readTime: "7 min",
    category: "Security",
    tags: ["memecoin", "token launch", "snipers", "bundled wallets", "insider supply"],
    metaTitle: "Memecoin Launch Risks: Snipers, Bundles & Insiders | AIDYOR",
    metaDescription: "How snipers, bundled wallets and insider supply manipulate new memecoin launches, how to spot them, and a pre-buy checklist for fresh tokens on launchpads and DEXes.",
    content: `
<p>Memecoin launchpads made it possible for anyone to create a token in a minute and have it trading immediately. That speed is also what makes new launches so dangerous. In the first minutes and hours of a token's life, the people who launched it, and the bots they use, often hold advantages that ordinary buyers cannot see unless they look for them.</p>
<h2>How a Typical Launch Works</h2>
<p>On many launchpads, a new token starts on a bonding curve, where the price rises automatically as people buy. When enough has been bought, the token graduates and its liquidity moves into a regular DEX pool. Other launches skip the launchpad and just create a pool directly. Either way, the earliest buyers get the lowest prices, which creates the incentive for everything below.</p>
<h2>Snipers</h2>
<p>A sniper is a bot that buys a token in the very first block or seconds after it becomes tradable, before humans can react. Snipers are not always malicious on their own, but a launch where a large share of supply went to sniper wallets in the first block means a lot of tokens are sitting with holders who intend to sell into the first wave of real buyers.</p>
<h2>Bundled Wallets</h2>
<p>In a bundled launch, the creator buys the token from many different wallets in the same block as the launch, using wallets they funded themselves. On a holder list, these look like many independent buyers. In reality it is one entity holding a large share of supply, spread across many addresses to hide it. Bundles are one of the most common ways insider supply is concealed.</p>
<h2>Insider and Developer Supply</h2>
<p>Even without bundling, the creator or their connected wallets may hold a large share of supply, bought cheaply or allocated at launch. When that supply is sold into buyers, the price collapses. This is the "soft rug pull" pattern from our guide on <a href="/blog/what-is-a-rug-pull-crypto" style="color:hsl(var(--primary));text-decoration:underline">what a rug pull is</a>, just happening on a faster timescale.</p>
<h2>Fake Volume and Manufactured Hype</h2>
<ul>
<li><strong>Wash trading:</strong> the same group buys and sells among themselves to create the appearance of volume and rising momentum.</li>
<li><strong>Paid or coordinated promotion:</strong> influencer posts and community channels that are paid to push a token, often disclosed nowhere.</li>
<li><strong>Cloned socials and fake communities:</strong> accounts and groups created to look established.</li>
</ul>
<h2>How to Spot These Before You Buy</h2>
<ul>
<li><strong>Look at the earliest buyers.</strong> A large share of supply bought in the first block, or by wallets that all received funds from the same source, points to snipers or a bundle.</li>
<li><strong>Use a wallet cluster view.</strong> Visualisation tools such as Bubblemaps show which holders are connected. A tight cluster of linked wallets holding a big share is a warning sign.</li>
<li><strong>Check holder concentration correctly.</strong> Exclude the liquidity pool and known program accounts, then look at what the top remaining wallets hold in total.</li>
<li><strong>Check what the creator has done.</strong> Has the creator wallet already sold? Have connected wallets started selling as price rises?</li>
<li><strong>Compare liquidity to market cap.</strong> If liquidity is tiny relative to the reported market cap, even a modest sell can crash the price and you may be unable to exit at a sensible value.</li>
<li><strong>Check the token-level risks.</strong> On Solana, mint and freeze authority; on EVM chains, honeypot behaviour, taxes and ownership. See our guide to <a href="/blog/how-to-check-solana-token-safety" style="color:hsl(var(--primary));text-decoration:underline">checking a Solana token</a> and the <a href="/blog/what-is-a-honeypot-token" style="color:hsl(var(--primary));text-decoration:underline">honeypot guide</a>.</li>
<li><strong>Check the liquidity status after graduation.</strong> Confirm whether liquidity is burned, locked or controlled by the creator.</li>
</ul>
<h2>A Pre-Buy Checklist for Fresh Launches</h2>
<ul>
<li>Contract or mint address confirmed from an official source, not a search result</li>
<li>Token-level checks clean (authorities, taxes, honeypot simulation)</li>
<li>No obvious sniper or bundle concentration</li>
<li>Top holders reasonable after excluding the pool</li>
<li>Liquidity not trivially small compared to market cap</li>
<li>Position size you can afford to lose entirely</li>
</ul>
<h2>The Honest Risk Picture</h2>
<p>Checks reduce risk, they do not remove it. A token can pass every check and still lose most of its value, because memecoin prices depend on attention, not fundamentals. Treat any token in its first hours as extremely high risk, never size a position beyond what you can lose completely, and do not rely on a single signal.</p>
<h2>Scan Before You Buy</h2>
<p>AIDYOR's free scanner runs the token-level checks for you in seconds: paste a contract or mint address and get a 0–100 risk score with the specific flags behind it across nine blockchain networks, with no wallet connection. It does not predict price and it is not financial advice. What it does is cover the part of due diligence that is verifiable on-chain, so you spend your attention on the launch dynamics described above.</p>
`
  }
];

export const getBlogPost = (slug: string): BlogPost | undefined =>
  blogPosts.find(p => p.slug === slug);
