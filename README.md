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
- **🐋 Whale Activity Alerts** - Monitor large transactions (>$50k)
- **⭐ Cloud Watchlist** - Synced favorites with risk tracking
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
Deno Runtime
├── risk-orchestrator     → Central API gateway
├── market-data-service   → DEXScreener integration
├── onchain-data-service  → GoPlus/RugCheck/BSCTrace
├── ai-risk-engine        → AI explanations (Gemini 3)
├── simulation-engine     → Pump/dump detection
├── whale-alerts          → Transaction monitoring
├── ocr-extract           → VLM-based OCR
└── passkey-*             → WebAuthn handlers
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
│   │   └── Watchlist.tsx    # User favorites
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useCloudWatchlist.ts
│   │   ├── usePasskey.ts
│   │   └── useWhaleAlerts.ts
│   ├── lib/
│   │   ├── api/             # External API clients
│   │   └── security/        # Input sanitization
│   └── pages/               # Route components
├── supabase/
│   └── functions/           # 8 Edge functions
└── public/                  # Static assets
```

---

## 🔒 Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Input sanitization via Zod schemas
- ✅ XSS/SQL injection pattern blocking
- ✅ API timeout controls (AbortController)
- ✅ Address validation (EIP-55, Base58)
- ✅ No exposed API keys in frontend

---

## 🗺️ Roadmap

### Completed ✅
- [x] Multi-chain token scanner
- [x] AI risk explanations
- [x] OCR screenshot scanner
- [x] Whale activity alerts
- [x] Cloud watchlist
- [x] Passkey authentication
- [x] Push notifications
- [x] Risk trend analysis

### Planned
- [ ] Telegram bot integration
- [ ] Browser extension
- [ ] Mobile app (Capacitor)
- [ ] Premium subscriptions
- [ ] Public API

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

## 📄 Legal Pages

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
