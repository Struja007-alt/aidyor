# AIDYOR Whitepaper
## Decentralized Token Risk Intelligence Platform

**Version:** 1.0  
**Date:** January 2026  
**Website:** https://aidyor.app

---

## 1. Abstract

AIDYOR (AI Do Your Own Research) is an advanced token security analysis platform that aggregates data from multiple blockchain security providers, processes it through AI models, and delivers actionable risk assessments to cryptocurrency traders. The platform addresses a critical gap in the crypto ecosystem: the lack of accessible, comprehensive, and AI-enhanced security tools for retail investors.

---

## 2. Problem Statement

### 2.1 The Scam Epidemic
The cryptocurrency market loses an estimated **$4.6 billion annually** to various scams, including:

- **Honeypot contracts** - Tokens that can be purchased but never sold
- **Rug pulls** - Projects where developers drain liquidity and abandon the token
- **Hidden taxes** - Contracts with excessive buy/sell taxes (20-99%)
- **Fake tokens** - Impersonators of legitimate projects
- **Pump-and-dump schemes** - Coordinated manipulation of token prices

### 2.2 Current Solution Limitations

| Existing Tools | Limitations |
|----------------|-------------|
| Manual audits | Expensive ($10K+), slow (weeks) |
| Single-source checkers | Incomplete data, false negatives |
| Wallet-required scanners | Privacy concerns, friction |
| Paid API services | Not accessible to retail |

### 2.3 The Knowledge Gap
Retail investors often lack the technical expertise to:
- Read smart contract code
- Interpret security audit results
- Understand tokenomics red flags
- Monitor on-chain activity patterns

---

## 3. Solution: AIDYOR Platform

### 3.1 Core Value Proposition

**"Institutional-grade security analysis, accessible to everyone"**

AIDYOR democratizes crypto security by:
1. Aggregating data from 7+ authoritative security sources
2. Processing through AI to generate human-readable explanations
3. Delivering instant risk scores with zero friction

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
│              │   (Gemini 3 Pro)  │                  │
│              └─────────┬─────────┘                  │
│                        ▼                            │
│              ┌───────────────────┐                  │
│              │   Safety Score    │                  │
│              │    0-100 Rating   │                  │
│              └───────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

#### Risk Score Calculation

The weighted risk formula:

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

AIDYOR automatically detects and validates token standards using interface detection:

| Standard | Networks | Security Implications |
|----------|----------|----------------------|
| **BEP-20** | BNB Chain | Standard fungible token - lowest risk |
| **BEP-721** | BNB Chain | NFT standard - verify collection legitimacy |
| **BEP-1155** | BNB Chain | Multi-token standard - check metadata mutability |
| **ERC-20** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | Standard fungible token |
| **ERC-721** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | NFT standard |
| **ERC-1155** | ETH, Polygon, Arbitrum, Base, OP, Avalanche | Multi-token standard |
| **SPL Token** | Solana | Standard fungible token - wide ecosystem support |
| **Token-2022** | Solana | Extended token - check for transfer fees/restrictions |
| **Metaplex NFT** | Solana | NFT with on-chain metadata |
| **Compressed NFT** | Solana | Efficient NFT - verify marketplace support |

**Detection Method:**
1. Query contract for EIP-165 `supportsInterface()` (EVM) or program ownership (Solana)
2. Check for standard function signatures or token supply characteristics
3. Classify as fungible, NFT, or multi-token
4. Detect Token-2022 extensions (transfer fees, non-transferable, etc.)
5. Flag non-compliant contracts as higher risk

#### AI-Powered Explanations
AIDYOR uses Gemini 3 Flash to translate technical findings into actionable insights:

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

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                                   │
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
│                    (Supabase/Deno Runtime)                       │
├─────────────────────────────────────────────────────────────────┤
│  risk-orchestrator ─────────────────────────────────────────────│
│       │                                                          │
│       ├── market-data-service (DEXScreener API)                 │
│       ├── onchain-data-service (GoPlus, RugCheck, BSCTrace)     │
│       ├── simulation-engine (Pump/dump pattern detection)       │
│       └── ai-risk-engine (Gemini 3 explanations)                │
│                                                                  │
│  telegram-webhook (Bot commands, payments, premium subscriptions)│
│  security-alerts (Live crypto scam/hack news aggregation)        │
│  whale-alerts (Trending token large transaction detection)       │
│  ocr-extract (Vision Language Model processing)                  │
│  passkey-register / passkey-authenticate (WebAuthn flow)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│                    (Supabase PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│  watchlist_tokens (User favorites with risk tracking)           │
│  passkey_credentials (WebAuthn public keys)                     │
│  premium_subscriptions (Telegram Pro user management)           │
│  pending_orders (Payment tracking for Telegram Payments)        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Supported Networks

| Network | Chain ID | Security APIs |
|---------|----------|---------------|
| Ethereum | 1 | GoPlus, Unicrypt |
| BNB Chain | 56 | GoPlus, BSCTrace, Unicrypt |
| Solana | - | RugCheck, SolanaFM |
| Polygon | 137 | GoPlus |
| Arbitrum | 42161 | GoPlus |
| Base | 8453 | GoPlus |
| Avalanche | 43114 | GoPlus |
| Optimism | 10 | GoPlus |
| TON | - | Custom integration |

### 4.3 Security Measures

1. **Input Sanitization** - All user inputs validated through Zod schemas
2. **Pattern Blocking** - XSS, SQL injection, command injection detection
3. **Rate Limiting** - API call throttling to prevent abuse
4. **RLS Policies** - Row-level security on all database tables
5. **No Wallet Connection** - Zero attack surface from wallet exploits

---

## 5. Market Opportunity

### 5.1 Total Addressable Market (TAM)

| Segment | Users | Potential Revenue |
|---------|-------|-------------------|
| Active crypto traders | 420M+ | $5.04B @ $12/year |
| DeFi participants | 50M+ | $1.2B @ $24/year |
| NFT traders | 30M+ | $360M @ $12/year |
| **Total** | **500M+** | **$6.6B annually** |

### 5.2 Competitive Landscape

| Competitor | Strengths | Weaknesses |
|------------|-----------|------------|
| TokenSniffer | Established brand | Limited chains, no AI |
| RugDoc | Deep audits | Manual, slow, 2 chains |
| GoPlus | Wide coverage | API-only, no UX |
| DEXTools | Trading focus | Security is secondary |

**AIDYOR Differentiation:**
- AI-powered explanations
- Live security alerts feed
- Screenshot OCR scanning
- Whale activity alerts
- Token standard detection (BEP + ERC + SPL)
- Zero-friction access
- **Telegram bot with native payments** (scan tokens directly in chat)

---

## 6. Business Model

### 6.1 Revenue Streams

#### Tier 1: Consumer (Freemium)
- **Free:** 10 scans/day, basic risk score
- **Pro ($9.99/mo via Telegram Payments):** Unlimited scans, AI explanations, whale alerts, priority support

#### Tier 2: API (B2B) - Now Live!
- **Starter:** $49/mo - 1,000 API calls + $0.01/scan overage
- **Growth:** $99/mo - 5,000 API calls + $0.01/scan overage
- **Enterprise:** $199/mo - 25,000 API calls + $0.01/scan overage, priority support

#### Tier 3: White-Label (Enterprise)
- **License Fee:** $50,000-$100,000
- **Revenue Share:** 15% of client revenue
- **Support:** Dedicated integration assistance

### 6.2 Projected Revenue (Year 1)

| Quarter | Free Users | Pro Users | API Clients | Revenue |
|---------|------------|-----------|-------------|---------|
| Q1 | 10,000 | 100 | 2 | $1,098 |
| Q2 | 50,000 | 500 | 10 | $6,990 |
| Q3 | 150,000 | 2,000 | 25 | $24,925 |
| Q4 | 400,000 | 5,000 | 50 | $59,850 |
| **Total** | - | - | - | **$92,863** |

---

## 7. Roadmap

### Phase 1: Foundation (Completed ✅)
- [x] Multi-chain token scanner
- [x] Risk score calculation
- [x] AI risk explanations
- [x] Cloud watchlist
- [x] Passkey authentication
- [x] OCR screenshot scanner
- [x] Live security alerts feed
- [x] Whale activity alerts
- [x] BEP token standard detection (BEP-20, BEP-721, BEP-1155)
- [x] ERC token standard detection (ERC-20, ERC-721, ERC-1155)
- [x] SPL token standard detection (SPL Token, Token-2022, Metaplex NFT, cNFT)
- [x] Telegram bot integration with token scanning
- [x] Telegram Payments premium subscription ($9.99/month)

### Phase 2: Growth (Q1-Q2 2026)
- [ ] Browser extension (Chrome/Firefox)
- [ ] Push notification alerts
- [ ] Premium tier rate limiting (free vs Pro scans)

### Phase 3: Scale (Q3-Q4 2026)
- [ ] Mobile app (iOS/Android)
- [ ] Public API launch
- [ ] Partner integrations (DEXs, wallets)
- [ ] Advanced portfolio tracking

### Phase 4: Expansion (2027)
- [ ] NFT collection analysis
- [ ] DeFi protocol risk scores
- [ ] Institutional dashboard
- [ ] White-label licensing

---

## 8. Team Requirements

### Key Roles for Growth
1. **Full-Stack Developer** - Feature development, API integrations
2. **Smart Contract Auditor** - Deep contract analysis capabilities
3. **ML/AI Engineer** - Model fine-tuning, new AI features
4. **Growth Marketer** - User acquisition, partnerships
5. **Community Manager** - Discord/Telegram/Twitter presence

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
- Legal compliance review before major markets

---

## 10. Conclusion

AIDYOR represents a significant opportunity in the growing crypto security market. With a production-ready platform, differentiated features, and clear monetization path, the project is positioned for acquisition by strategic buyers in the crypto/fintech space or for independent growth through SaaS revenue.

**Investment Highlights:**
- ✅ Working MVP with proven technology
- ✅ Unique AI + OCR feature combination
- ✅ Clear path to $100K+ ARR
- ✅ Scalable microservice architecture
- ✅ Zero-friction user experience

---

*This whitepaper is for informational purposes only and does not constitute financial advice.*

**Contact:** Available upon acquisition inquiry  
**Demo:** https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app
