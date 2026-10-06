export interface Chain {
  slug: string;
  name: string;
  token: string;
  explorer: string;
  type: string;
  dexes: string;
  intro: string;
  risks: string[];
}

export const chains: Chain[] = [
  {
    slug: "ethereum",
    name: "Ethereum",
    token: "ETH",
    explorer: "Etherscan",
    type: "the largest smart contract network",
    dexes: "Uniswap and SushiSwap",
    intro:
      "Ethereum is where DeFi started, and it still has the deepest liquidity. That also makes it the biggest target: anyone can deploy a token in minutes, and fake or malicious contracts appear daily next to legitimate ones. High gas costs make a trapped or failed trade expensive, so checking before you buy matters even more here.",
    risks: [
      "Honeypot contracts that allow buys but block or heavily tax sells",
      "Copycat tokens that reuse the name and ticker of a popular project",
      "Unlocked liquidity that the deployer can withdraw at any time",
      "Hidden owner functions such as blacklists, mint rights, or tax changes",
    ],
  },
  {
    slug: "bnb-chain",
    name: "BNB Chain",
    token: "BNB",
    explorer: "BscScan",
    type: "a low-fee EVM network",
    dexes: "PancakeSwap",
    intro:
      "BNB Chain's low fees make it cheap to launch and trade new tokens, which also means scam launches are common. Memecoins, presales, and fast-moving hype tokens are everywhere, and most of them are never audited. A quick scan before you buy filters out the obvious traps.",
    risks: [
      "Honeypots and sell taxes that are raised after buyers pile in",
      "Presale and launchpad tokens where the team disappears after raising funds",
      "Concentrated holdings where a few wallets control most of the supply",
      "Unverified contract source code that nobody can review",
    ],
  },
  {
    slug: "solana",
    name: "Solana",
    token: "SOL",
    explorer: "Solscan",
    type: "a high-speed non-EVM network",
    dexes: "Raydium and Jupiter",
    intro:
      "Solana works differently from EVM chains: tokens are SPL tokens, not ERC-20 contracts, and the risks are different too. Instead of hidden sell taxes, the common dangers are token authorities that let a creator mint more supply or freeze your wallet, and launches where a few wallets hold most of the supply.",
    risks: [
      "Active mint authority, which lets the creator create unlimited new tokens",
      "Active freeze authority, which can lock holders' tokens in their wallets",
      "Heavy holder concentration, often spread across linked wallets",
      "Liquidity that is not burned or locked and can be pulled by the creator",
    ],
  },
  {
    slug: "polygon",
    name: "Polygon",
    token: "POL",
    explorer: "PolygonScan",
    type: "a low-fee Ethereum scaling network",
    dexes: "QuickSwap and Uniswap",
    intro:
      "Polygon offers cheap, fast transactions and full EVM compatibility, so the same scam techniques seen on Ethereum show up here at lower cost to the attacker. Fake tokens imitating known Polygon projects and launches with unlocked liquidity are the patterns to watch for.",
    risks: [
      "Lookalike tokens that imitate popular Polygon projects",
      "Honeypot contracts that trap buyers",
      "Unlocked liquidity and anonymous deployers",
      "Owner-controlled tax or blacklist functions",
    ],
  },
  {
    slug: "arbitrum",
    name: "Arbitrum",
    token: "ETH",
    explorer: "Arbiscan",
    type: "an Ethereum layer-2 network",
    dexes: "Uniswap and Camelot",
    intro:
      "Arbitrum is one of the largest Ethereum layer-2 networks, with a mature DeFi ecosystem. Tokens deploy as standard EVM contracts, so the usual risks apply: honeypots, hidden taxes, and rug pulls on newly listed tokens. Established protocols sit next to brand-new launches, so every contract deserves its own check.",
    risks: [
      "Newly launched tokens with unlocked liquidity",
      "Hidden or changeable buy and sell taxes",
      "Honeypot logic that only triggers after you buy",
      "Fake versions of well-known tokens",
    ],
  },
  {
    slug: "base",
    name: "Base",
    token: "ETH",
    explorer: "BaseScan",
    type: "Coinbase's Ethereum layer-2 network",
    dexes: "Uniswap and Aerodrome",
    intro:
      "Base has seen heavy memecoin and community-token activity, helped by low fees and easy launches. Fast-moving hype is the environment where rug pulls and honeypots thrive, so checking a contract before you buy is a habit worth building.",
    risks: [
      "Rapid-fire memecoin launches with no audit or track record",
      "Rug pulls through unlocked liquidity",
      "Contracts where the owner can change taxes or block selling",
      "Top-holder concentration that enables sudden dumps",
    ],
  },
  {
    slug: "avalanche",
    name: "Avalanche",
    token: "AVAX",
    explorer: "Snowtrace",
    type: "a fast EVM-compatible network (C-Chain)",
    dexes: "Trader Joe and Pangolin",
    intro:
      "Avalanche's C-Chain is EVM-compatible, so tokens use the same standards as Ethereum and the same scams apply: honeypots, mutable taxes, and unlocked liquidity. Wrapped and bridged assets are common on Avalanche, so it is worth confirming you have the official contract and not a lookalike.",
    risks: [
      "Honeypots and hidden sell taxes",
      "Lookalike versions of wrapped or bridged assets",
      "Unlocked liquidity that can be withdrawn at any time",
      "Unverified contracts and owner-controlled functions",
    ],
  },
  {
    slug: "fantom",
    name: "Fantom",
    token: "FTM",
    explorer: "FTMScan",
    type: "an EVM-compatible network (Fantom Opera)",
    dexes: "SpookySwap",
    intro:
      "Fantom Opera is an EVM-compatible network with a long DeFi history. Much of the ecosystem's attention has since moved toward Sonic, so older Fantom tokens can be abandoned or poorly maintained, which raises liquidity and rug risks. Checking ownership, liquidity depth, and holder concentration is especially useful here.",
    risks: [
      "Abandoned projects with thin liquidity that is easy to drain",
      "Contract ownership that was never renounced",
      "Lookalike tokens copying established Fantom names",
      "Heavy holder concentration in older tokens",
    ],
  },
  {
    slug: "robinhood-chain",
    name: "Robinhood Chain",
    token: "ETH",
    explorer: "the Robinhood Chain block explorer",
    type: "an Arbitrum-based layer-2 network",
    dexes: "Uniswap",
    intro:
      "Robinhood Chain is an EVM-compatible layer-2 built on Arbitrum's stack, launched on public mainnet on July 1, 2026 and aimed at tokenized real-world assets and DeFi. Alongside those, early on-chain activity included memecoins and launchpad tokens. New networks attract permissionless launches before tooling and community vetting catch up, so unverified contracts and unlocked liquidity are the main things to check.",
    risks: [
      "Lookalike tokens imitating official Stock Tokens or popular tickers",
      "Memecoin and launchpad tokens with unlocked liquidity",
      "Unverified contracts on a young network with limited vetting",
      "Owner-controlled taxes, blacklists, or mint functions",
    ],
  },
];

export const getChain = (slug: string): Chain | undefined =>
  chains.find((c) => c.slug === slug);