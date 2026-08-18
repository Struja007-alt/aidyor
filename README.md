# 🛡️ AIDYOR - AI-Powered Token Risk Scanner

> **Do Your Own Research, Powered by AI**

[![Live Site](https://img.shields.io/badge/Live-aidyor.app-brightgreen)](https://aidyor.app)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-green)](https://supabase.com)

AIDYOR is a comprehensive cryptocurrency token security analysis platform that aggregates data from multiple blockchain security providers and uses AI to deliver actionable risk assessments.

---

## ✨ Features

### Core Functionality

- **🔍 Multi-Chain Token Scanner** - Scan tokens across 8 blockchains
- **📊 Risk Score Calculation** - Weighted 0-100 safety score
- **🤖 AI Risk Explanations** - Natural language insights via Gemini
- **📈 Market Data Dashboard** - Real-time price, liquidity, volume

### Advanced Features

- **📸 OCR Screenshot Scanner** - Extract addresses from images using a **data-driven prioritized pipeline**: Tesseract.js (fastest, highest real-world success rate) → **Parallel AI fallback**: Gemini models run **concurrently** via `Promise.all`, results unioned by address with highest-confidence wins. Includes multi-token detection, per-address confidence scoring, automatic retry, exponential backoff, and token-name search for truncated addresses
- **🔗 Shareable Scan Links** - Copy a link like `aidyor.app/?address=0x...&chain=eth` after any scan; opening it auto-runs the same scan and pre-selects the requested chain
- **🐋 Whale Activity Alerts** - Monitor large transactions (>$50k) - 5 free/hour
- **⭐ Cloud Watchlist** - Synced favorites with risk tracking
- **🤖 Telegram Bot** - Scan tokens and receive alerts via @AIDYOR_BOT
- **💎 Premium Subscriptions** - Pro $9.99/mo (unlimited scans) + Whale Pro $49/mo add-on
- **🐛 Smart Contract Bug Scanner (Pro)** - Pre-audit scanner for verified Solidity contracts on 8 EVM chains + Solana. Dual engine: static vulnerability patterns (reentrancy, tx.origin, delegatecall, selfdestruct, weak randomness, mintable supply, mutable tax, blacklist, unprotected initializer, etc.) + AI deep audit. Returns severity-rated findings, A–F security grade, and remediation steps.
- **💳 Payments** - Telegram Stars (bot) + Stripe (web checkout + customer portal)
- **🔐 Passkey Authentication** - Passwordless WebAuthn login
- **📱 Push Notifications** - Browser alerts for whale activity
- **📊 Private Admin Marketing Dashboard** - Internal `/admin/marketing` route (backend-verified `admin` role required, `noindex`) with KPI cards, date-range controls, acquisition/engagement/monetization tables, campaign attribution, partner pipeline and trend placeholders. No analytics source connected yet — all figures render placeholder states.
- **✉️ Contact & Social** - Email + X (@aidyor33641) links in dedicated Contact section

### Security Analysis

- Honeypot detection (GoPlus, RugCheck)
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
└── OCR: Tesseract.js + Gemini (dual-pass)
```

### Hosting & Infrastructure

- **Frontend hosting:** Vercel, auto-deployed from this GitHub repo (`main` branch)
- **Backend:** Supabase (Postgres + Auth + Edge Functions) — sole backend
- **DNS/domain:** Cloudflare (aidyor.app)

### Backend (Supabase Edge Functions)

```
Deno Runtime - 21 Edge Functions
├── risk-orchestrator          → Central API gateway (JWT auth)
├── market-data-service        → DEXScreener integration
├── onchain-data-service       → GoPlus/RugCheck/BSCTrace
├── ai-risk-engine             → AI explanations
├── ai-risk-explain            → Natural language risk summaries
├── simulation-engine          → Pump/dump detection
├── whale-alerts                → Transaction monitoring (public)
├── security-alerts             → Live scam/hack news feed (public)
├── check-scan-limit            → Server-side free scan limit enforcement
├── ocr-extract                 → VLM OCR (multi-model) + retry + address correction
├── ocr-analytics                → OCR metrics logging (CER/WER/EMR)
├── ocr-analytics-dashboard      → Aggregated OCR analytics API
├── bug-scanner                  → Smart Contract Bug Scanner (Pro)
├── telegram-webhook             → Telegram bot, commands & Telegram Stars payments
├── api-token-scan               → B2B API with key management
├── stripe-checkout              → Stripe subscription checkout
├── stripe-check-subscription    → Verify active subscriptions
├── stripe-customer-portal       → Manage billing via Stripe Portal
├── stripe-webhook                → Stripe event handler (cancellations, failures, renewals)
└── passkey-register / passkey-authenticate → WebAuthn handlers (2 functions)
```

### Data Sources

| Provider    | Coverage                                         |
| ----------- | ------------------------------------------------ |
| GoPlus Labs | ETH, BSC, Polygon, Arbitrum, Base, OP, Avalanche |
| RugCheck    | Solana                                           |
| BSCTrace    | BSC                                               |
| SolanaFM    | Solana                                            |
| DEXScreener | All chains                                        |
| Unicrypt    | ETH, BSC (liquidity locks)                        |
| CoinGecko   | Token validation                                  |

---

## 📊 Risk Scoring Logic

```
// Weighted calculation
Final Score = (Market Score × 0.55) + (Security Score × 0.45)

// Critical overrides
if (isHoneypot) cap = 39
if (sellTax > 50) cap = 29
if (hiddenOwner) penalty = -15
```

### Score Interpretation

| Score  | Rating     | Meaning                            |
| ------ | ---------- | ---------------------------------- |
| 70-100 | ✅ SAFE     | Low risk, proceed with caution     |
| 40-69  | ⚠️ CAUTION | Moderate risk, research thoroughly |
| 20-39  | 🔴 WARNING  | High risk, not recommended         |
| 0-19   | ☠️ DANGER  | Critical issues, avoid             |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```
# Clone the repository
git clone https://github.com/Struja007-alt/aidyor.git
cd aidyor

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The frontend requires `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL`. These are Supabase's anon/publishable key and public project URL — safe to expose client-side by design, since row-level security enforces data access. Do not add service-role keys or third-party secrets here; those live only in Supabase Edge Function secrets.

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── TokenScanner.tsx # Main scanner
│   │   ├── RiskGauge.tsx    # Visual risk display
│   │   ├── WhaleAlerts.tsx  # Transaction monitor
│   │   ├── CryptoSecurityNews.tsx # Live security alerts
│   │   └── Watchlist.tsx    # User favorites
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useAdminRole.ts
│   │   ├── useCloudWatchlist.ts
│   │   ├── useSecurityAlerts.ts
│   │   ├── usePasskey.ts
│   │   └── useWhaleAlerts.ts
│   ├── lib/
│   │   ├── api/             # External API clients
│   │   ├── ocr/             # Smart OCR address correction
│   │   │   ├── addressCorrector.ts # EIP-55 checksum validation + char fixes
│   │   │   └── keccak256.ts        # Keccak-256 for checksums
│   │   ├── security/        # Input sanitization (Zod + XSS firewall)
│   │   └── constants/       # Known token networks
│   └── pages/               # Route components
├── supabase/
│   └── functions/           # 21 Edge functions
├── browser-extension/       # Chrome/Firefox extension
│   ├── manifest.json        # Extension manifest (MV3)
│   ├── popup/               # Popup UI
│   ├── background/          # Service worker
│   ├── content/              # Content scripts
│   └── icons/                # Extension icons
└── public/                  # Static assets
```

---

## 🔒 Security

### Database Security (Supabase RLS)

- ✅ **Row Level Security (RLS)** enabled on all 14 tables
- ✅ **Service role isolation** - sensitive tables use `TO service_role` policies
- ✅ **NOT NULL constraints** - user-owned rows enforce ownership

### Edge Function Security

- ✅ **Dynamic CORS** - Origin allowlist (aidyor.app, preview URLs, localhost)
- ✅ **JWT authentication** - Required for user-specific endpoints
- ✅ **Input validation** - Email RFC 5322 regex, address format validation
- ✅ **Generic error responses** - No implementation details leaked to clients
- ✅ **Sanitized logging** - Sensitive payment/PII data excluded from logs
- ✅ **Telegram webhook secret** - `X-Telegram-Bot-Api-Secret-Token` header verified on every update; spoofed `successful_payment` events rejected

### Frontend Security

- ✅ **Input sanitization** via Zod schemas (`src/lib/security/inputSanitizer.ts`)
- ✅ **XSS/SQL injection pattern blocking** - Centralized prompt firewall
- ✅ **API timeout controls** - AbortController (5-15s timeouts)
- ✅ **Address validation** - EIP-55 (EVM), Base58 (Solana), T-prefix (Tron)
- ✅ **No secret API keys in frontend** - only the Supabase anon key is exposed, by design; all third-party API keys live server-side in Edge Function secrets

### Audit Status

- **Last full audit:** January 26, 2026 — see [SECURITY_AUDIT_REPORT.md](https://github.com/Struja007-alt/aidyor/blob/main/SECURITY_AUDIT_REPORT.md) (a fresh pass is recommended before any sale process, since the product has changed substantially since this date)

---

## 🗺️ Roadmap

### Completed ✅

- [x] Multi-chain token scanner (8 blockchains)
- [x] AI risk explanations
- [x] OCR screenshot scanner (Tesseract.js + Vision AI)
- [x] Live security alerts feed (public endpoint)
- [x] Whale activity alerts (public endpoint)
- [x] Cloud watchlist (RLS-protected)
- [x] Passkey/WebAuthn authentication
- [x] Push notifications (browser)
- [x] Telegram bot integration (@AIDYOR_BOT)
- [x] Freemium subscription (server-side scan limit enforcement)
- [x] Premium subscriptions ($9.99/month, Telegram Stars + Stripe)
- [x] B2B API Client Tier
- [x] Browser extension (Chrome/Firefox MV3)
- [x] Token standard detection (BEP, ERC, SPL)
- [x] Edge function hardening (JWT, CORS, input validation)
- [x] Smart Contract Bug Scanner (Pro, dual-engine static + AI)
- [x] Shareable scan result links with auto-trigger

### In Progress

- [ ] Mobile app (Capacitor configured, ready for build)

---

## 💰 Valuation & Selling

See [FULL_PROJECT_AUDIT.md](https://github.com/Struja007-alt/aidyor/blob/main/FULL_PROJECT_AUDIT.md) for a current technical/business breakdown.

### Recommended Marketplaces

1. **Acquire.com** - Best for SaaS products
2. **Flippa** - Wide audience, quick sales

### Documentation

- [FULL_PROJECT_AUDIT.md](https://github.com/Struja007-alt/aidyor/blob/main/FULL_PROJECT_AUDIT.md) - Complete technical audit
- [WHITEPAPER.md](https://github.com/Struja007-alt/aidyor/blob/main/WHITEPAPER.md) - Business whitepaper

---

## 📄 Legal & Documentation Pages

- [Privacy Policy](https://aidyor.app/privacy-policy)
- [Terms of Service](https://aidyor.app/terms-of-service)
- [Cookie Policy](https://aidyor.app/cookie-policy)
- [Disclaimer](https://aidyor.app/disclaimer)
- [FAQ](https://aidyor.app/faq)

---

## 🔗 Links

- **Live Site:** <https://aidyor.app>
- **Telegram Bot:** [@AIDYOR_BOT](https://t.me/AIDYOR_BOT)
- **Whitepaper:** [WHITEPAPER.md](https://github.com/Struja007-alt/aidyor/blob/main/WHITEPAPER.md)
- **Full Audit:** [FULL_PROJECT_AUDIT.md](https://github.com/Struja007-alt/aidyor/blob/main/FULL_PROJECT_AUDIT.md)

---

## 📜 License

Proprietary - All rights reserved.

For licensing inquiries, contact through acquisition channels.
