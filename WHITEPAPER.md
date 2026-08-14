# AIDYOR Whitepaper
## AI-Powered Token Risk Intelligence Platform

**Version:** 2.0
**Date:** August 14, 2026
**Website:** https://aidyor.app

---

## 1. Abstract

AIDYOR (AI Do Your Own Research) is a token security analysis platform that aggregates data from multiple blockchain security providers, processes it through AI models, and delivers actionable risk assessments to cryptocurrency traders. The platform addresses a persistent gap in the crypto ecosystem: accessible, comprehensive, AI-enhanced security tooling for retail investors, without requiring a wallet connection or account signup.

---

## 2. Problem Statement

### 2.1 The Scam Landscape

The cryptocurrency market continues to see significant losses from recurring scam patterns, including:

- **Honeypot contracts** — tokens that can be purchased but never sold
- **Rug pulls** — projects where developers drain liquidity and abandon the token
- **Hidden taxes** — contracts with excessive buy/sell taxes (20–99%)
- **Fake tokens** — impersonators of legitimate projects
- **Pump-and-dump schemes** — coordinated manipulation of token prices

### 2.2 Current Solution Limitations

| Existing Tools | Limitations |
|----------------|-------------|
| Manual audits | Expensive ($10K+), slow (weeks) |
| Single-source checkers | Incomplete data, false negatives |
| Wallet-required scanners | Privacy concerns, friction |
| Paid API services | Not accessible to retail users |

### 2.3 The Knowledge Gap

Retail investors often lack the technical expertise to:
- Read smart contract code
- Interpret security audit results
- Understand tokenomics red flags
- Monitor on-chain activity patterns

---

## 3. Solution: AIDYOR Platform

### 3.1 Core Value Proposition

**"Institutional-grade security analysis, accessible to everyone."**

AIDYOR democratizes crypto security by:
1. Aggregating data from 7+ authoritative security sources
2. Processing findings through AI to generate human-readable explanations
3. Delivering instant risk scores with zero friction — no wallet connection or signup required

### 3.2 Key Features

#### Multi-Source Security Aggregation

```
┌─────────────────────────────────────────────────────┐
│                   AIDYOR Engine                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ GoPlus  │  │RugCheck │  │BSCTrace │  │Unicrypt│ │
│  │  Labs   │  │   .xyz  │  │   API   │  │  Locks │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
│       │            │            │            │      │
│       └────────────┴─────┬──────┴────────────┘      │
│                          ▼                          │
│              ┌───────────────────┐                  │
│              │  Risk Orchestrator │                  │
│              │    (Edge Function) │                  │
│              └─────────┬─────────┘                  │
│                        ▼                            │
│              ┌───────────────────┐                  │
│              │   AI Risk Engine  │                  │
│              │      (Gemini)     │                  │
│              └─────────┬─────────┘                  │
│                        ▼                            │
│              ┌───────────────────┐                  │
│              │   Safety Score    │                  │
│              │    0-100 Rating   │                  │
│              └───────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

#### Risk Score Calculation

```
Final Score = (Market Score × 0.55) + (Security Score × 0.45)

Where:
- Market Score = f(liquidity, volume, price stability, holder distribution)
- Security Score = f(honeypot, taxes, ownership, locks, verification, token standard)

Critical Overrides:
- Honeypot detected → Cap at 39/100
- >50% sell tax → Cap at 29/100
- Hidden owner → Penalty of -15 points
- Non-standard token (no ERC/BEP compliance) → Warning flag
```

#### Token Standard Detection

| Standard | Networks | Security Implications |
|----------|----------|----------------------|
| **BEP-20** | BNB Chain | Standard fungible token — lowest risk |
| **BEP-721** | BNB Chain | NFT standard — verify collection legitimacy |
| **BEP-1155** | BNB Chain | Multi-token standard — check metadata mutability |
| **ERC-20** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | Standard fungible token |
| **ERC-721** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | NFT standard |
| **ERC-1155** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | Multi-token standard |
| **SPL Token** | Solana | Standard fungible token — wide ecosystem support |
| **Token-2022** | Solana | Extended token — check for transfer fees/restrictions |
| **Metaplex NFT** | Solana | NFT with on-chain metadata |
| **Compressed NFT** | Solana | Efficient NFT — verify marketplace support |

**Detection method:**
1. Query the contract for EIP-165 `supportsInterface()` (EVM) or program ownership (Solana)
2. Check for standard function signatures or token supply characteristics
3. Classify as fungible, NFT, or multi-token
4. Detect Token-2022 extensions (transfer fees, non-transferable, etc.)
5. Flag non-compliant contracts as higher risk

#### AI-Powered Explanations

AIDYOR uses AI models to translate technical findings into actionable insights.

**Input:**
```json
{
  "isHoneypot": false,
  "sellTax": 15,
  "lpLocked": true,
  "lpLockDays": 180,
  "holderConcentration": 45
}
```

**AI Output:**
```
⚠️ CAUTION ADVISED

This token has moderate risk factors. While not a honeypot, the 15% sell
tax significantly impacts profitability. Liquidity is locked for 180 days,
which provides some security against rug pulls.

Key Concerns:
• 45% of supply held by top 10 wallets - potential dump risk
• High sell tax reduces trading flexibility

Recommendation: Only invest what you can afford to lose. Consider the tax
impact on your exit strategy.
```

#### Smart Contract Bug Scanner (Pro)

A dedicated pre-audit engine for verified Solidity contracts, separate from the core token scanner. It fetches verified source and runs a dual-engine review:

- **Static engine:** 12 vulnerability patterns — reentrancy, tx.origin authorization, delegatecall abuse, selfdestruct, weak randomness, mintable supply, mutable buy/sell tax, blacklist mechanisms, unprotected initializers, floating pragma, outdated Solidity, unchecked low-level calls
- **AI engine:** a deep audit pass producing severity-rated findings
- **Output:** a combined findings list, an A–F security grade, and remediation guidance
- **Coverage:** 8 EVM chains

This feature is a pre-audit screening tool, not a replacement for a professional smart-contract audit.

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite, hosted on Vercel                 │
│  ├── TokenScanner (Main scanning interface)                     │
│  ├── RiskGauge (Visual score display)                           │
│  ├── CryptoSecurityNews (Live security alerts)                  │
│  ├── WhaleAlerts (Transaction monitoring)                       │
│  ├── Watchlist (Cloud-synced favorites)                         │
│  └── OCR Scanner (Image-to-address extraction)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTION LAYER                         │
│                (Supabase/Deno Runtime — 21 functions)            │
├─────────────────────────────────────────────────────────────────┤
│  risk-orchestrator ─────────────────────────────────────────────│
│       │                                                          │
│       ├── market-data-service (DEXScreener API)                 │
│       ├── onchain-data-service (GoPlus, RugCheck, BSCTrace)     │
│       ├── simulation-engine (Pump/dump pattern detection)       │
│       └── ai-risk-engine / ai-risk-explain (AI explanations)    │
│                                                                  │
│  check-scan-limit (server-side free-scan quota)                  │
│  bug-scanner (Smart Contract Bug Scanner, Pro-gated)              │
│  telegram-webhook (Bot commands + in-app payments)                │
│  security-alerts (Live crypto scam/hack news aggregation)        │
│  whale-alerts (Trending token large transaction detection)       │
│  ocr-extract / ocr-analytics / ocr-analytics-dashboard            │
│  passkey-register / passkey-authenticate (WebAuthn flow)         │
│  api-token-scan (B2B API)                                        │
│  stripe-checkout / stripe-check-subscription /                    │
│    stripe-customer-portal / stripe-webhook (web billing)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│              (Supabase PostgreSQL — 14 tables, RLS on all)        │
├─────────────────────────────────────────────────────────────────┤
│  watchlist_tokens, passkey_credentials, passkey_challenges       │
│  premium_subscriptions, pending_orders, whale_subscriptions      │
│  scan_usage, scan_limits, free_scan_usage                        │
│  api_clients, api_keys, api_usage, api_plans, ocr_analytics      │
└─────────────────────────────────────────────────────────────────┘
```

Frontend is hosted on Vercel with automatic deployment from GitHub. The backend runs entirely on Supabase. DNS is managed through Cloudflare.

### 4.2 Supported Networks

| Network | Security Analysis |
|---------|-------------------|
| Ethereum | GoPlus, Unicrypt |
| BNB Chain | GoPlus, BSCTrace, Unicrypt |
| Solana | RugCheck, SolanaFM |
| Polygon | GoPlus |
| Arbitrum | GoPlus |
| Base | GoPlus |
| Avalanche | GoPlus |
| Optimism | GoPlus |

### 4.3 Security Measures

1. **Input Sanitization** — all user inputs validated through Zod schemas
2. **Pattern Blocking** — XSS, SQL injection, command injection detection
3. **Rate Limiting** — API call throttling to prevent abuse
4. **RLS Policies** — row-level security on all 14 database tables
5. **No Wallet Connection** — zero attack surface from wallet exploits
6. **Server-side scan enforcement** — free-tier limits enforced by an edge function, not just the client

---

## 5. Market Opportunity

### 5.1 Total Addressable Market (TAM)

| Segment | Users | Potential Revenue |
|---------|-------|-------------------|
| Active crypto traders | 420M+ | $5.04B @ $12/year |
| DeFi participants | 50M+ | $1.2B @ $24/year |
| NFT traders | 30M+ | $360M @ $12/year |
| **Total** | **500M+** | **$6.6B annually** |

*TAM figures are illustrative market-sizing estimates.*

### 5.2 Competitive Landscape

| Competitor | Strengths | Weaknesses |
|------------|-----------|------------|
| TokenSniffer | Established brand | Limited chains, no AI |
| RugDoc | Deep audits | Manual, slow, few chains |
| GoPlus | Wide coverage | API-only, no UX |
| DEXTools | Trading focus | Security is secondary |

**AIDYOR Differentiation:**
- AI-powered explanations
- Live security alerts feed
- Screenshot OCR scanning
- Whale activity alerts
- Token standard detection (BEP + ERC + SPL)
- Zero-friction anonymous scanning — no wallet or signup required
- Smart Contract Bug Scanner (Pro) — static + AI dual-engine pre-audit
- Telegram bot with native in-app payments

---

## 6. Business Model

### 6.1 Revenue Streams

#### Tier 1: Consumer (Freemium)
- **Free:** limited scans/day, basic risk score, 5 whale alerts/hour
- **Pro ($9.99/mo):** unlimited scans, AI explanations, priority support

#### Tier 2: Whale Pro Add-on ($49/mo)
- Unlimited whale alerts, no rate limiting
- Real-time push notifications for watchlist tokens
- Priority data access
- Requires an active Pro subscription

#### Tier 3: API (B2B)
- **Starter:** $49/mo — 1,000 API calls + $0.01/scan overage
- **Growth:** $99/mo — 5,000 API calls + $0.01/scan overage
- **Enterprise:** $199/mo — 25,000 API calls + $0.01/scan overage, priority support

#### Tier 4: White-Label (Enterprise)
- License fee: $50,000–$100,000
- Revenue share: 15% of client revenue
- Dedicated integration support

### 6.2 Projected Revenue (Illustrative Model)

| Quarter | Free Users | Pro Users | API Clients | Revenue |
|---------|------------|-----------|-------------|---------|
| Q1 | 10,000 | 100 | 2 | $1,098 |
| Q2 | 50,000 | 500 | 10 | $6,990 |
| Q3 | 150,000 | 2,000 | 25 | $24,925 |
| Q4 | 400,000 | 5,000 | 50 | $59,850 |
| **Total** | – | – | – | **$92,863** |

This is a hypothetical growth model, not a forecast based on current traffic or conversion data. It illustrates the revenue mechanics of the pricing tiers at scale.

---

## 7. Roadmap

### Completed ✅
- Multi-chain token scanner (8 blockchains)
- Risk score calculation
- AI risk explanations
- Cloud watchlist
- Passkey authentication
- OCR screenshot scanner
- Live security alerts feed
- Whale activity alerts
- BEP token standard detection (BEP-20, BEP-721, BEP-1155)
- ERC token standard detection (ERC-20, ERC-721, ERC-1155)
- SPL token standard detection (SPL Token, Token-2022, Metaplex NFT, cNFT)
- Telegram bot integration with token scanning and native payments
- Smart Contract Bug Scanner (Pro), static + AI dual-engine
- Shareable scan result links with auto-trigger
- Web checkout via Stripe alongside in-app Telegram payments
- Server-side free-scan-limit enforcement

### In Progress
- Mobile app (Capacitor configured, ready for build)

---

## 8. Team Requirements

### Key Roles for Growth
1. **Full-Stack Developer** — feature development, API integrations
2. **Smart Contract Auditor** — deep contract analysis capabilities
3. **ML/AI Engineer** — model fine-tuning, new AI features
4. **Growth Marketer** — user acquisition, partnerships
5. **Community Manager** — Discord/Telegram/X presence

---

## 9. Risk Factors

### Technical Risks
- API provider outages
- AI model rate limits
- Blockchain network congestion

### Business Risks
- Regulatory changes affecting crypto
- Competition from established players
- Dependency on third-party data sources

### Mitigation Strategies
- Multi-provider fallback systems
- Local caching of frequently accessed data
- Legal compliance review before entering major markets

---

## 10. Conclusion

AIDYOR represents an opportunity in the crypto security tooling space: a production-ready platform, a differentiated feature set, and a clear monetization structure. The combination of AI-powered explanations, OCR scanning, a Pro smart-contract bug scanner, and a monetized Telegram bot creates a feature set not commonly found together in a single product.

**Investment Highlights:**
- ✅ Working platform with proven technology
- ✅ Unique AI + OCR feature combination
- ✅ Scalable microservice architecture
- ✅ Zero-friction anonymous user experience

---

*This whitepaper is for informational purposes only and does not constitute financial advice.*

**Contact:** Available upon acquisition inquiry
**Live product:** https://aidyor.app
