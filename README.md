# 🛡️ AIDYOR - AI-Powered Token Risk Scanner

> **Do Your Own Research, Powered by AI**

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-green)](https://supabase.com)

AIDYOR is a comprehensive cryptocurrency token security analysis platform that aggregates data from multiple blockchain security providers and uses AI to deliver actionable risk assessments.

---

## ✨ Features

### Core Functionality
- **🔍 Multi-Chain Token Scanner** - Scan tokens across 9+ blockchains
- **📊 Risk Score Calculation** - Weighted 0-100 safety score
- **🤖 AI Risk Explanations** - Natural language insights via Gemini 3
- **📈 Market Data Dashboard** - Real-time price, liquidity, volume

### Advanced Features
- **📸 OCR Screenshot Scanner** - Extract addresses from images using Tesseract.js + AI Vision
- **🚨 Live Security Alerts** - Real-time crypto scam warnings and hack reports
- **🐋 Whale Activity Alerts** - Monitor large transactions (>$50k)
- **⭐ Cloud Watchlist** - Synced favorites with risk tracking
- **🤖 Telegram Bot** - Scan tokens and receive alerts via @aidyor_bot
- **💎 Premium Subscriptions** - $9.99/month for unlimited scans (10 free/day)
- **🔐 Passkey Authentication** - Passwordless WebAuthn login
- **📱 Push Notifications** - Browser alerts for whale activity

### Security Analysis
- Honeypot detection (GoPlus, BSCTrace)
- Tax analysis (buy/sell percentages)
- Ownership verification (renounced, hidden owner)
- Liquidity lock status (Unicrypt)
- Holder concentration analysis
- Mint/freeze authority (Solana via RugCheck)
- **BEP Token Standard Detection** (BEP-20, BEP-721, BEP-1155) for BNB Chain
- **ERC Token Standard Detection** (ERC-20, ERC-721, ERC-1155) for ETH, Polygon, Arbitrum, Base, OP, Avalanche
- **SPL Token Standard Detection** (SPL Token, Token-2022, Metaplex NFT, cNFT) for Solana

---

## 🛠️ Tech Stack

### Frontend
```
React 18.3 + TypeScript + Vite
├── UI: Tailwind CSS + shadcn/ui + Radix Primitives
├── State: React Query (TanStack) + Context API
├── Routing: React Router v6
├── Forms: React Hook Form + Zod validation
├── Mobile: Capacitor (Android/iOS ready)
└── OCR: Tesseract.js + Gemini Vision
```

### Backend (Lovable Cloud / Supabase Edge Functions)
```
Deno Runtime - 13 Edge Functions
├── risk-orchestrator       → Central API gateway (JWT auth)
├── market-data-service     → DEXScreener integration
├── onchain-data-service    → GoPlus/RugCheck/BSCTrace
├── ai-risk-engine          → AI explanations (Gemini 3)
├── ai-risk-explain         → Natural language risk summaries
├── simulation-engine       → Pump/dump detection
├── whale-alerts            → Transaction monitoring (public)
├── security-alerts         → Live scam/hack news feed (public)
├── ocr-extract             → VLM-based OCR
├── telegram-webhook        → Telegram bot & payments
├── api-token-scan          → B2B API with key management
└── passkey-*               → WebAuthn handlers (2 functions)
```

### Data Sources
| Provider | Coverage |
|----------|----------|
| GoPlus Labs | ETH, BSC, Polygon, Arbitrum, Base, OP, Avalanche |
| RugCheck | Solana |
| BSCTrace | BSC |
| SolanaFM | Solana |
| DEXScreener | All chains |
| Unicrypt | ETH, BSC (liquidity locks) |
| CoinGecko | Token validation |

---

## 📊 Risk Scoring Logic

```javascript
// Weighted calculation
Final Score = (Market Score × 0.55) + (Security Score × 0.45)

// Critical overrides
if (isHoneypot) cap = 39
if (sellTax > 50) cap = 29
if (hiddenOwner) penalty = -15
```

### Score Interpretation
| Score | Rating | Meaning |
|-------|--------|---------|
| 70-100 | ✅ SAFE | Low risk, proceed with caution |
| 40-69 | ⚠️ CAUTION | Moderate risk, research thoroughly |
| 20-39 | 🔴 WARNING | High risk, not recommended |
| 0-19 | ☠️ DANGER | Critical issues, avoid |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/aidyor.git
cd aidyor

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
The project uses Lovable Cloud - no manual `.env` configuration needed.

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── TokenScanner.tsx # Main scanner (3000+ lines)
│   │   ├── RiskGauge.tsx    # Visual risk display
│   │   ├── WhaleAlerts.tsx  # Transaction monitor
│   │   ├── CryptoSecurityNews.tsx # Live security alerts
│   │   └── Watchlist.tsx    # User favorites
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useCloudWatchlist.ts
│   │   ├── useSecurityAlerts.ts
│   │   ├── usePasskey.ts
│   │   └── useWhaleAlerts.ts
│   ├── lib/
│   │   ├── api/             # External API clients
│   │   ├── security/        # Input sanitization (Zod + XSS firewall)
│   │   └── constants/       # Known token networks
│   └── pages/               # Route components
├── supabase/
│   └── functions/           # 13 Edge functions
├── browser-extension/       # Chrome/Firefox extension
│   ├── manifest.json        # Extension manifest (MV3)
│   ├── popup/               # Popup UI
│   ├── background/          # Service worker
│   ├── content/             # Content scripts
│   └── icons/               # Extension icons
└── public/                  # Static assets
```

---

## 🔒 Security

### Database Security (Supabase RLS)
- ✅ **Row Level Security (RLS)** on all 9 tables
- ✅ **Service role isolation** - Telegram tables use `TO service_role` policies
- ✅ **Secure views** - `api_keys_safe` hides key hashes with `security_invoker=on`
- ✅ **NOT NULL constraints** - All user_id columns enforce ownership
- ✅ **Supabase Linter** - 0 warnings/errors

### Edge Function Security
- ✅ **Dynamic CORS** - Origin allowlist (aidyor.app, preview URLs, localhost)
- ✅ **JWT authentication** - Required for user-specific endpoints
- ✅ **Input validation** - Email RFC 5322 regex, address format validation
- ✅ **Generic error responses** - No implementation details leaked to clients
- ✅ **Sanitized logging** - Sensitive payment/PII data excluded from logs

### Frontend Security
- ✅ **Input sanitization** via Zod schemas (`src/lib/security/inputSanitizer.ts`)
- ✅ **XSS/SQL injection pattern blocking** - Centralized prompt firewall
- ✅ **API timeout controls** - AbortController (5-15s timeouts)
- ✅ **Address validation** - EIP-55 (EVM), Base58 (Solana), T-prefix (Tron)
- ✅ **No exposed API keys** - All external APIs are public/free tier

### Audit Status
- **Last Audit:** January 26, 2026
- **Overall Status:** ✅ SECURE
- **Report:** [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)

---

## 🗺️ Roadmap

### Completed ✅
- [x] Multi-chain token scanner (9+ blockchains)
- [x] AI risk explanations (Gemini 3)
- [x] OCR screenshot scanner (Tesseract.js + Vision AI)
- [x] Live security alerts feed (public endpoint)
- [x] Whale activity alerts (public endpoint)
- [x] Cloud watchlist (RLS-protected)
- [x] Passkey/WebAuthn authentication
- [x] Push notifications (browser)
- [x] Risk trend analysis
- [x] Telegram bot integration (@aidyor_bot)
- [x] Freemium subscription (10 scans/day free)
- [x] Premium subscriptions ($9.99/month via Telegram Payments)
- [x] B2B API Client Tier ($49-199/month)
- [x] Browser extension (Chrome/Firefox MV3)
- [x] Token standard detection (BEP, ERC, SPL)
- [x] Comprehensive security audit (0 critical issues)
- [x] Edge function hardening (JWT, CORS, input validation)

### In Progress
- [ ] Mobile app (Capacitor configured, ready for build)

---

## 💰 Valuation & Selling

**Estimated Value:** $18,000 - $32,000 USD

### Recommended Marketplaces
1. **Acquire.com** - Best for SaaS products
2. **Flippa** - Wide audience, quick sales
3. **MicroAcquire** - Free for sellers
4. **Side Projectors** - Side project focus

### Documentation
- [FULL_PROJECT_AUDIT.md](./FULL_PROJECT_AUDIT.md) - Complete technical audit
- [WHITEPAPER.md](./WHITEPAPER.md) - Business whitepaper

---

## 📄 Legal & Documentation Pages

- [API Documentation](/api-docs) ⭐ NEW
- [Privacy Policy](/privacy-policy)
- [Terms of Service](/terms-of-service)
- [Cookie Policy](/cookie-policy)
- [Disclaimer](/disclaimer)
- [Transparency](/transparency)
- [FAQ](/faq)
- [Glossary](/glossary)

---

## 🔗 Links

- **Live Demo:** https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app
- **Whitepaper:** [WHITEPAPER.md](./WHITEPAPER.md)
- **Full Audit:** [FULL_PROJECT_AUDIT.md](./FULL_PROJECT_AUDIT.md)

---

## 📜 License

Proprietary - All rights reserved.

For licensing inquiries, contact through acquisition channels.

---

*Built with ❤️ using [Lovable](https://lovable.dev)*
