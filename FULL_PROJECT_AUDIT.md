# AIDYOR - Complete Project Audit & Business Assessment

## AI-Powered Token Risk Scanner for Crypto Traders

**Audit Date:** August 13, 2026 (supersedes the January 19, 2026 version)
**Version:** 2.0
**Live URL:** <https://aidyor.app>

---

## 📊 Executive Summary

**AIDYOR** (AI Do Your Own Research) is a production-ready SaaS application that provides automated security analysis for cryptocurrency tokens across 9 blockchain networks. The platform aggregates data from multiple security APIs, uses AI for risk explanations, and offers OCR-based screenshot scanning, whale activity alerts, a Telegram bot with native payments, and a Pro smart-contract bug scanner.

### Key Metrics

- **Edge Functions:** 21 serverless microservices (Supabase/Deno)
- **Database Tables:** 14 (all with RLS security)
- **API Integrations:** 7+ external security/data sources
- **Supported Networks:** 9 (ETH, BSC, SOL, Polygon, Arbitrum, Base, OP, Avalanche, +1 more — verify current list against `src/lib/constants` before quoting externally)
- **Frontend hosting:** Vercel (auto-deploy from GitHub `main`)
- **Backend:** Supabase (sole backend; old Lovable Cloud instance is paused/deprecated)

> Note: line-of-code and component counts from the prior audit were not re-verified in this pass — re-run before using in a listing.

---

## 💰 Valuation Assessment

### Estimated Market Value: **$18,000 - $32,000 USD** *(carried over from Jan 2026 audit — not re-verified)*

This figure predates the Telegram bot, Stripe payments, Whale Pro add-on, Smart Contract Bug Scanner, API tiers, and the independent Vercel migration — all of which likely increase the product's value. **Recommend a fresh valuation pass before listing**, factoring in:

| Value Component               | Jan 2026 Estimate | Notes for re-pricing |
| ------------------------------ | ------------------ | --------------------- |
| Core Token Scanner              | $5,000 – $8,000     | Unchanged scope |
| Multi-Chain Security APIs       | $3,000 – $5,000     | Unchanged scope |
| AI Risk Engine Integration      | $2,500 – $4,500     | Unchanged scope |
| OCR Screenshot Scanner          | $1,500 – $3,000     | Pipeline meaningfully upgraded (parallel multi-model VLM fallback) |
| Whale Alerts System              | $2,000 – $4,000     | Unchanged scope |
| Smart Contract Bug Scanner (Pro) | *not priced*         | New since Jan 2026 — needs its own valuation line |
| Telegram Bot + Payments          | *not priced*         | New since Jan 2026 — live, working, monetized via Telegram Stars |
| B2B API tier                     | *not priced*         | New since Jan 2026 |
| Microservice Architecture        | $1,500 – $3,000     | Function count grew from 8 to 21 |
| Auth + Cloud Watchlist            | $1,000 – $2,000     | Unchanged scope |
| Passkey Authentication            | $800 – $1,500        | Rewritten with proper WebAuthn challenge storage since Jan 2026 |
| UI/UX + Mobile Ready               | $800 – $1,500        | Unchanged scope |

**Do not quote the $18K–$32K figure to a buyer without updating it** — it undercounts several shipped, monetized features.

### Value Multipliers

- ✅ Production-ready codebase, independently hosted (no platform lock-in)
- ✅ TypeScript with full type safety
- ✅ RLS security policies implemented across all 14 tables
- ✅ Live, working Telegram bot with real payment flow
- ✅ Capacitor mobile-ready configuration

---

## 🏗️ Technical Architecture

### Frontend Stack

```
React 18.3 + TypeScript + Vite
├── UI: Tailwind CSS + shadcn/ui + Radix Primitives
├── State: React Query (TanStack) + React Context
├── Routing: React Router v6
├── Forms: React Hook Form + Zod validation
├── Mobile: Capacitor (Android ready)
└── OCR: Tesseract.js + parallel Gemini VLM fallback
```

### Hosting

- **Frontend:** Vercel, auto-deployed from GitHub (`Struja007-alt/aidyor`, `main` branch)
- **Backend:** Supabase project `lerromdxykuydrpttfif` (Postgres + Auth + Edge Functions)
- **DNS:** Cloudflare (aidyor.app)
- **Editor:** Lovable (editor only, not a runtime dependency)

### Backend Stack (Supabase Edge Functions — 21 total)

```
Deno Runtime + Supabase
├── risk-orchestrator          → Central API gateway
├── market-data-service        → DEXScreener integration
├── onchain-data-service       → GoPlus/RugCheck/BSCTrace
├── ai-risk-engine              → AI explanations
├── ai-risk-explain              → Natural language explanations
├── simulation-engine            → Pump/dump detection
├── whale-alerts                  → Large transaction monitoring (public)
├── security-alerts                → Live scam/hack news feed (public)
├── check-scan-limit                → Server-side free scan limit enforcement
├── ocr-extract                      → VLM-based OCR processing (parallel multi-model)
├── ocr-analytics                     → OCR metrics logging
├── ocr-analytics-dashboard            → Aggregated OCR analytics API
├── bug-scanner                         → Smart Contract Bug Scanner (Pro)
├── telegram-webhook                     → Bot commands + Telegram Stars payments
├── api-token-scan                        → B2B API with key management
├── stripe-checkout                        → Subscription checkout
├── stripe-check-subscription               → Verify active subscriptions
├── stripe-customer-portal                   → Manage billing
├── stripe-webhook                             → Stripe event handler
└── passkey-register / passkey-authenticate     → WebAuthn (2 functions)
```

### Security Data Sources

| Source       | Networks                | Data Provided                                |
| ------------ | ------------------------ | -------------------------------------------- |
| GoPlus Labs  | ETH, BSC, Polygon, etc.    | Honeypot, taxes, ownership, ERC standards    |
| RugCheck.xyz | Solana                      | Mint/freeze authority, risks                 |
| BSCTrace     | BSC                           | Honeypot, taxes, verification, BEP standards |
| SolanaFM     | Solana                          | Holder counts, metadata                      |
| DEXScreener  | All                                | Price, liquidity, volume                     |
| Unicrypt     | ETH, BSC                            | Liquidity locks                              |
| CoinGecko    | All                                    | Token validation, originals                  |

---

## ✨ Feature Inventory (current)

### Core

1. Multi-Chain Token Scanner (9 networks)
2. Risk Score Calculation (weighted 0–100)
3. Security Factor Analysis
4. AI Risk Explanations
5. Market Data Dashboard
6. Pump/Dump Detection

### Advanced

7. OCR Screenshot Scanner (parallel multi-model VLM fallback)
8. Smart Contract Bug Scanner (Pro) — static + AI dual engine, 8 EVM chains + Solana
9. Whale Activity Alerts
10. Cloud Watchlist
11. Passkey Authentication (WebAuthn, rewritten with proper challenge storage)
12. Liquidity Lock Detection
13. Token Origin Detection
14. BEP / ERC / SPL Token Standard Detection
15. Telegram Bot with native payments (Telegram Stars)
16. B2B API access with key management
17. Server-side free-scan-limit enforcement

---

## 🔐 Security Audit Results

**Note:** the checklist below is a re-check as of August 13, 2026. A full formal audit (matching the depth of the original January 26, 2026 report) has not been re-run — recommend commissioning one before a sale closes.

### ✅ Currently in place

- [x] Row Level Security (RLS) enabled on all 14 tables, verified against live policies
- [x] Input sanitization via Zod schemas
- [x] XSS/SQL injection pattern blocking
- [x] API timeout controls (AbortController)
- [x] Address validation (EIP-55, Base58)
- [x] Only the Supabase anon/publishable key is exposed client-side (by design — RLS enforces access; no third-party secrets in frontend)
- [x] CORS headers properly configured
- [x] Telegram webhook secret header verified on every update

### ⚠️ Open items (found August 13, 2026)

- [ ] `.env` is committed to the public GitHub repo. Contents are limited to the public Supabase anon key/URL (not a secret leak), but should move to `.env.example` for hygiene.
- [ ] Leaked-password protection is disabled in Supabase Auth — recommend enabling.
- [ ] `ocr-extract` returned a 401 on a real request in recent logs — worth reproducing and fixing.
- [ ] No confirmed successful end-to-end token scan observed in the last 24h of edge function logs at time of this audit — recommend a manual test pass before any buyer demo.

---

## 📈 Performance Optimizations

### Implemented

- ✅ React.memo on heavy components
- ✅ useMemo/useCallback for expensive operations
- ✅ React Query caching
- ✅ Font preloading with display:swap
- ✅ GPU acceleration on animations
- ✅ Reduced motion media query support

### Remaining Opportunities

- ⏳ Code splitting (lazy route loading)
- ⏳ TokenScanner component refactoring (large single file)
- ⏳ Add missing indexes on foreign keys flagged by Supabase performance advisor (`api_clients.user_id`, `api_keys.client_id`, `api_usage.api_key_id`)
- ⏳ Service worker for offline support

---

## 🛒 Where to Sell

### Primary Marketplaces

1. **Acquire.com** — best for SaaS products with revenue potential, serious buyer pool
2. **Flippa** — wider audience, faster process, typical $5K–$100K range

### Before Listing — Recommended Cleanup

1. Refresh this audit's valuation section with current feature set (bug scanner, Telegram payments, API tier)
2. Re-run a full security audit and update `SECURITY_AUDIT_REPORT.md`
3. Fix the `.env`-in-repo hygiene issue
4. Confirm the core scan pipeline completes end-to-end with a live test
5. Update all "live demo" links across docs to point to aidyor.app (done in this pass)
6. Decide whether to keep the valuation breakdown public in this repo, or move it out of the public README/audit files until you're in active buyer conversations — a public price anchor can work against you in negotiation

---

## 📱 Live URLs

| Type              | URL                                    |
| ----------------- | --------------------------------------- |
| **Production**    | <https://aidyor.app>                    |
| **Repository**    | <https://github.com/Struja007-alt/aidyor> |
| **Telegram Bot**  | [@AIDYOR_BOT](https://t.me/AIDYOR_BOT)     |

---

## 📊 Competitive Analysis

| Feature         | AIDYOR       | TokenSniffer | RugDoc     | GoPlus    |
| --------------- | ------------ | ------------ | ---------- | --------- |
| Free Scans      | ✅ Daily limit, enforced server-side | ✅ Limited    | ✅ Yes      | ✅ API     |
| AI Explanations | ✅ Yes        | ❌ No         | ❌ No       | ❌ No      |
| OCR Scanner     | ✅ Yes        | ❌ No         | ❌ No       | ❌ No      |
| Whale Alerts    | ✅ Yes        | ❌ No         | ❌ No       | ❌ No      |
| Bug Scanner     | ✅ Yes (Pro)  | ❌ No         | ❌ No       | ❌ No      |
| Telegram Bot    | ✅ Yes, with payments | ❌ No | ❌ No | ❌ No |
| Multi-Chain     | ✅ 9 chains   | Varies — verify current | Varies — verify current | ✅ 20+     |
| Watchlist       | ✅ Cloud sync | ❌ Local      | ❌ No       | ❌ No      |
| Token Standards | ✅ BEP + ERC + SPL | ❌ No | ❌ No | ✅ Limited |
| No Wallet       | ✅ Yes        | ✅ Yes        | ✅ Yes      | ✅ Yes     |

*(Competitor rows not independently re-verified in this pass — confirm before using in outreach.)*

---

## 🏆 Conclusion

AIDYOR is a production-ready, market-differentiated crypto security tool that has grown meaningfully since its January 2026 audit: a working monetized Telegram bot, a Pro smart-contract bug scanner, a B2B API tier, and independent hosting (no platform lock-in risk). The valuation and security sections above should be refreshed before any active sale process — the current $18K–$32K figure reflects the earlier, smaller feature set.

---

*This document supersedes the January 19, 2026 audit.
---

*Generated by AIDYOR Project Audit System*  
*© 2026 AIDYOR - All Rights Reserved*
