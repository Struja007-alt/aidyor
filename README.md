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
- **📸 OCR Screenshot Scanner** - Extract addresses from images using a **data-driven prioritized pipeline**: Tesseract.js (fastest, highest real-world success rate) → **Parallel AI fallback**: Gemini 2.5 Pro and Gemini 2.5 Flash run **concurrently** via `Promise.all`, results unioned by address with highest-confidence wins. Includes multi-token detection, per-address confidence scoring, automatic retry, exponential backoff, and token-name search for truncated addresses
- **🎨 Refined Cyberpunk Hero** - Ambient neon glows, animated grid pattern, pulsing live indicator, feature chips, and JunkStartups featured badge
- **📊 Live Scanner Feedback** - Animated gradient progress bar with OCR stage tracking ("AI Vision", "Validating") and color-coded confidence badges per extracted address
- **🚨 Live Security Alerts** - Real-time crypto scam warnings and hack reports
- **🐋 Whale Activity Alerts** - Monitor large transactions (>$50k) - 5 free/hour
- **⭐ Cloud Watchlist** - Synced favorites with risk tracking
- **🤖 Telegram Bot** - Scan tokens and receive alerts via @aidyor_bot
- **💎 Premium Subscriptions** - Pro $9.99/mo (unlimited scans) + Whale Pro $49/mo add-on
- **🐛 Smart Contract Bug Scanner (Pro)** - Pre-audit scanner for verified Solidity contracts on 8 EVM chains. Dual engine: 12 static vulnerability patterns (reentrancy, tx.origin, delegatecall, selfdestruct, weak randomness, mintable supply, mutable tax, blacklist, unprotected initializer, etc.) + AI deep audit via Gemini 3.1 Pro. Returns severity-rated findings, A–F security grade, and remediation steps.
- **💳 Stripe Payments** - Web-based subscription checkout + customer portal
- **🔐 Passkey Authentication** - Passwordless WebAuthn login
- **📱 Push Notifications** - Browser alerts for whale activity
- **✉️ Contact & Social** - Email + X (@aidyor33641) links in dedicated Contact section

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
└── OCR: Tesseract.js + Gemini 2.5 Pro/Flash (dual-pass)
```

### Backend (Lovable Cloud / Supabase Edge Functions)
```
Deno Runtime - 19 Edge Functions
├── risk-orchestrator        → Central API gateway (JWT auth)
├── market-data-service      → DEXScreener integration
├── onchain-data-service     → GoPlus/RugCheck/BSCTrace
├── ai-risk-engine           → AI explanations (Gemini 3)
├── ai-risk-explain          → Natural language risk summaries
├── simulation-engine        → Pump/dump detection
├── whale-alerts             → Transaction monitoring (public)
├── security-alerts          → Live scam/hack news feed (public)
├── ocr-extract              → Triple-pass VLM OCR (Gemini 3.1 Pro Preview + 3.5 Flash parallel, 3.1 Pro forensic + pixel-level fallback) + retry + address correction
├── ocr-analytics            → OCR metrics logging (CER/WER/EMR)
├── ocr-analytics-dashboard  → Aggregated OCR analytics API
├── telegram-webhook         → Telegram bot & payments
├── api-token-scan           → B2B API with key management
├── stripe-checkout          → Stripe subscription checkout
├── stripe-check-subscription → Verify active subscriptions
├── stripe-customer-portal   → Manage billing via Stripe Portal
├── stripe-webhook           → Stripe event handler (cancellations, failures, renewals)
└── passkey-*                → WebAuthn handlers (2 functions)
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
│   │   ├── ocr/             # Smart OCR address correction
│   │   │   ├── addressCorrector.ts # EIP-55 checksum validation + char fixes
│   │   │   └── keccak256.ts        # Keccak-256 for checksums
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
- ✅ **Telegram webhook secret** - `X-Telegram-Bot-Api-Secret-Token` header verified on every update; spoofed `successful_payment` events rejected with 401

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
- [x] Smart Contract Bug Scanner (Pro, dual-engine static + AI)

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

- [API Documentation](/api-docs)
- [OCR Analytics Dashboard](/ocr-dashboard) ⭐ NEW
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
