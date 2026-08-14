# AIDYOR Whitepaper

## AI-Powered Cryptocurrency Token Risk Intelligence Platform

**Version:** 2.0  
**Date:** August 2026  
**Website:** https://aidyor.app  
**Repository:** https://github.com/Struja007-alt/aidyor

---

## 1. Executive Summary

AIDYOR is an AI-assisted cryptocurrency token security and risk-analysis platform designed to make blockchain research faster and easier to understand.

The platform combines data from multiple blockchain-security and market-data providers with automated analysis, risk scoring, AI-generated explanations, screenshot OCR, whale-activity monitoring, watchlists, security alerts, and smart-contract vulnerability analysis.

AIDYOR is designed around a simple principle:

> **Do Your Own Research, powered by AI.**

The product is intended to reduce the technical and information barriers that make cryptocurrency token research difficult for ordinary users.

AIDYOR does not require a wallet connection to perform a token scan. Users can provide a supported token address and receive an automated analysis without granting the application permission to interact with their wallet.

---

# 2. Problem

## 2.1 Cryptocurrency Research Is Fragmented

Before interacting with a token, users may need to investigate:

- Smart-contract behavior
- Honeypot indicators
- Buy and sell taxes
- Ownership controls
- Minting permissions
- Holder concentration
- Liquidity
- Trading volume
- Price activity
- Token standards
- On-chain transactions
- Recent security incidents
- Contract vulnerabilities

This information is frequently distributed across multiple services.

The result is a fragmented research process that requires users to understand different tools, APIs, blockchain explorers and technical terminology.

## 2.2 Technical Information Is Difficult to Interpret

Security tools can expose useful raw information while still leaving the user with an important question:

**What does this information actually mean?**

AIDYOR addresses this problem by combining structured security information with AI-assisted explanations intended to translate technical findings into understandable risk indicators.

## 2.3 Wallet Connection Should Not Be a Requirement for Basic Research

AIDYOR is designed to allow token research without requiring users to connect a cryptocurrency wallet.

This reduces friction and avoids requiring a user to expose wallet-related permissions simply to perform an initial token-security check.

---

# 3. AIDYOR Solution

AIDYOR brings several research functions into one workflow.

### Core workflow

```text
Token Address / Screenshot
          │
          ▼
   Address Detection
   & Validation
          │
          ▼
 ┌───────────────────────┐
 │ Security Data Sources │
 │ Market Data Sources   │
 │ On-chain Information │
 └───────────┬───────────┘
             │
             ▼
    Risk Analysis Engine
             │
       ┌─────┴─────┐
       ▼           ▼
 Security Data   Market Data
       │           │
       └─────┬─────┘
             ▼
       Risk Score
             │
             ▼
     AI Explanation
             │
             ▼
     User Research Result
```

---

# 4. Core Product Features

## 4.1 Multi-Chain Token Scanner

AIDYOR supports token analysis across multiple blockchain networks, including:

- Ethereum
- BNB Chain
- Solana
- Polygon
- Arbitrum
- Base
- Avalanche
- Optimism
- Additional supported integrations where available

The exact analysis available depends on the blockchain and the external data providers supporting that network.

---

## 4.2 Risk Scoring

AIDYOR presents an automated 0–100 risk/safety indicator.

The score is designed to consolidate multiple signals into a single interface while still exposing the underlying findings.

Typical factors can include:

- Honeypot indicators
- Buy/sell taxes
- Ownership characteristics
- Liquidity information
- Holder concentration
- Mint/freeze authority
- Contract characteristics
- Market liquidity
- Trading volume
- Price activity
- Token-standard information

### Score interpretation

| Score | Rating | General interpretation |
|---:|---|---|
| 70–100 | SAFE | Fewer detected risk indicators |
| 40–69 | CAUTION | Moderate risk indicators |
| 20–39 | WARNING | Significant risk indicators |
| 0–19 | DANGER | Severe detected risk indicators |

The score is an automated indicator and should not be interpreted as a guarantee that a token is safe, legitimate or profitable.

---

## 4.3 AI-Assisted Risk Explanations

AIDYOR uses AI to help translate structured technical findings into natural-language explanations.

Instead of requiring users to interpret every raw security field independently, the platform can summarize relevant findings and explain why particular indicators may matter.

AI output is intended to improve comprehension, not replace independent research or professional auditing.

---

# 5. Screenshot OCR Scanner

One of AIDYOR's differentiated capabilities is its screenshot-based token-address scanner.

Users can upload a screenshot containing a token address instead of manually copying the address.

The OCR workflow can:

1. Detect text in the image.
2. Extract cryptocurrency addresses.
3. Identify multiple addresses where present.
4. Assign confidence information to extracted addresses.
5. Validate addresses against supported blockchain formats.
6. Attempt correction of common OCR character errors.
7. Retry processing when appropriate.
8. Search using token names where an address is truncated or incomplete.
9. Pass validated addresses into the token-scanning workflow.

The implementation combines local OCR with AI vision processing.

The goal is to make token research possible even when the token address is only available inside an image, screenshot, social-media post or other visual source.

---

# 6. Smart Contract Bug Scanner

AIDYOR includes a Pro smart-contract security-analysis capability for verified Solidity contracts.

The scanner uses a dual-engine approach:

### Static analysis

The static engine checks for patterns associated with vulnerabilities or dangerous contract behavior, including areas such as:

- Reentrancy
- `tx.origin` authorization
- Dangerous `delegatecall`
- `selfdestruct`
- Weak randomness
- Mintable supply
- Mutable buy/sell taxes
- Blacklist mechanisms
- Unprotected initializers
- Floating Solidity pragmas
- Outdated Solidity versions
- Low-level calls

### AI-assisted deep analysis

AI analysis provides an additional review layer and can produce:

- Severity-rated findings
- An overall A–F security grade
- Explanations
- Remediation guidance

The current implementation supports verified Solidity contracts across eight EVM networks:

- Ethereum
- BNB Chain
- Polygon
- Arbitrum
- Base
- Avalanche
- Optimism
- Fantom

Solana is handled as a limited-analysis fallback where applicable.

> The Smart Contract Bug Scanner is a pre-audit analysis tool. It is not a substitute for a professional smart-contract security audit.

---

# 7. Token Standard Detection

AIDYOR can identify token standards and use standard information as part of the analysis.

Supported standards include:

| Standard | Typical network |
|---|---|
| ERC-20 | Ethereum and EVM networks |
| ERC-721 | Ethereum and EVM networks |
| ERC-1155 | Ethereum and EVM networks |
| BEP-20 | BNB Chain |
| BEP-721 | BNB Chain |
| BEP-1155 | BNB Chain |
| SPL Token | Solana |
| Token-2022 | Solana |
| Metaplex NFT | Solana |
| Compressed NFT | Solana |

Token-standard detection provides context; a standard-compliant token is not automatically safe.

---

# 8. Market and On-Chain Intelligence

AIDYOR combines security information with market and blockchain information where supported.

Relevant signals can include:

- Liquidity
- Trading volume
- Price activity
- Holder distribution
- Large transactions
- Ownership information
- Token supply controls
- Liquidity-lock information
- On-chain activity

This allows users to view security-related findings alongside market context rather than treating contract security as an isolated metric.

---

# 9. Whale Activity Monitoring

AIDYOR includes whale-activity monitoring designed to surface significant token transactions.

The feature can identify large transactions and provide users with additional context about potentially important on-chain movements.

The platform also supports notification-oriented functionality for monitoring.

---

# 10. Cloud Watchlist

Users can save tokens to a cloud-based watchlist.

The watchlist is designed to provide:

- Saved token tracking
- Risk information
- Ongoing monitoring
- User-specific data isolation

Database access is protected through Supabase Row Level Security policies.

---

# 11. Security Alerts

AIDYOR includes a security-alert/news component designed to surface relevant cryptocurrency scam, exploit and security information.

The objective is to provide broader context around the security environment rather than focusing exclusively on an individual token contract.

---

# 12. Telegram Integration

AIDYOR includes Telegram integration for token-scanning and related product functionality.

The Telegram integration allows supported functionality to be accessed without requiring the user to remain inside the web application.

The project also includes payment/subscription infrastructure associated with premium functionality.

---

# 13. Browser Extension

The repository contains a browser-extension component using the modern browser-extension architecture.

The extension is intended to bring AIDYOR's token-security workflow closer to users while they browse cryptocurrency-related content.

The repository includes:

```text
browser-extension/
├── manifest.json
├── popup/
├── background/
├── content/
└── icons/
```

---

# 14. Technical Architecture

## 14.1 Frontend

AIDYOR uses:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI
- React Router
- TanStack React Query
- React Hook Form
- Zod
- Capacitor

The frontend provides the main scanner interface, risk visualization, watchlist, alerts and supporting product pages.

---

## 14.2 Backend

Backend functionality is implemented using Supabase and Edge Functions running in a Deno environment.

Core backend responsibilities include:

```text
Risk orchestration
Market-data services
On-chain security services
AI risk analysis
AI explanations
Simulation / market analysis
Whale monitoring
Security alerts
OCR extraction
OCR analytics
OCR analytics dashboard
Telegram webhook
B2B API
Authentication
Stripe checkout
Stripe subscription verification
Stripe customer portal
Stripe webhook processing
Passkey / WebAuthn
```

The backend architecture separates external integrations and product services into dedicated functions rather than placing all processing inside the frontend.

---

# 15. External Data Sources

AIDYOR aggregates information from multiple external providers.

Examples include:

| Provider | Primary purpose |
|---|---|
| GoPlus Labs | Token and contract security |
| RugCheck | Solana token security |
| BSCTrace | BNB Chain analysis |
| SolanaFM | Solana blockchain information |
| DEXScreener | Market and trading data |
| Unicrypt | Liquidity-lock information |
| CoinGecko | Token and market information |

External APIs are subject to their own availability, rate limits, data coverage and terms.

AIDYOR therefore does not represent external data as independently verified facts in every case.

---

# 16. Security Architecture

Security controls implemented in the project include several layers.

## 16.1 Database Security

The project uses Supabase Row Level Security to restrict access to user-specific information.

Security measures include:

- Row Level Security policies
- User ownership enforcement
- Restricted service-role operations
- Protected sensitive records
- Database constraints

## 16.2 Edge Function Security

Backend security controls include:

- Authentication where required
- Dynamic CORS controls
- Input validation
- Address validation
- Generic error handling
- Sanitized logging
- Protected webhook processing
- API timeout controls

## 16.3 Frontend Security

The application includes:

- Zod-based validation
- Input sanitization
- XSS-oriented filtering
- Address-format validation
- Request timeout controls
- Separation of sensitive backend operations

Security controls reduce application risk but do not constitute a guarantee of complete security.

---

# 17. Privacy and Wallet Model

AIDYOR is designed around a low-friction research model.

### Token scanning does not require a wallet connection.

This means a user can investigate a token without granting AIDYOR permission to interact with a wallet.

Wallet connection is therefore not a prerequisite for the core token-scanning workflow.

User authentication is used only where required for product features such as account-specific functionality, cloud watchlists, subscriptions or other protected services.

---

# 18. Monetization Model

AIDYOR is designed as a freemium security-analysis platform with several potential revenue channels.

## 18.1 Consumer Subscription

### Free

The free experience provides access to core token-analysis functionality subject to product limits.

### Pro

**$9.99/month**

Designed for users requiring expanded scanning and premium functionality.

---

## 18.2 Whale Pro

**$49/month add-on**

Designed for users requiring expanded whale-monitoring capabilities, including:

- Increased/unlimited whale alerts
- Push notification functionality
- Faster monitoring/refresh capabilities

The exact availability and limits are determined by the production implementation.

---

## 18.3 B2B API

AIDYOR includes a B2B API model with planned/implemented tiers:

| Tier | Monthly price | Included API calls |
|---|---:|---:|
| Starter | $49 | 1,000 |
| Growth | $99 | 5,000 |
| Enterprise | $199 | 25,000 |

Additional usage may be charged according to the applicable plan.

---

## 18.4 Enterprise / White-Label

AIDYOR can also be positioned for enterprise integrations, including:

- Wallet integrations
- DEX integrations
- Crypto applications
- Research platforms
- Security products
- White-label deployments

Commercial terms are negotiated according to integration scope.

---

# 19. Competitive Positioning

AIDYOR operates in a market containing token scanners, blockchain-security APIs, trading platforms and contract-analysis products.

Its differentiation is based on combining multiple workflows rather than attempting to compete on a single data source.

### Key differentiators

- Multi-source security aggregation
- AI-assisted explanations
- Screenshot-to-token OCR scanning
- Smart-contract vulnerability analysis
- Token-standard detection
- Whale monitoring
- Security alerts
- Cloud watchlists
- Telegram integration
- Browser-extension capability
- Wallet-free core scanning workflow

AIDYOR is positioned as a **research layer** that brings multiple security and market signals into one user-facing workflow.

---

# 20. Product Status

The current product contains a substantial set of implemented capabilities.

### Implemented

- [x] Multi-chain token scanning
- [x] Risk scoring
- [x] AI-assisted risk explanations
- [x] Screenshot OCR scanning
- [x] OCR address validation/correction
- [x] Market-data integration
- [x] Security-data aggregation
- [x] Liquidity-lock analysis
- [x] Whale activity monitoring
- [x] Cloud watchlist
- [x] Security alerts
- [x] Telegram integration
- [x] Browser-extension component
- [x] Token-standard detection
- [x] Smart-contract bug scanner
- [x] Shareable scan links
- [x] Passkey/WebAuthn infrastructure
- [x] Subscription/payment infrastructure
- [x] B2B API infrastructure
- [x] OCR analytics infrastructure
- [x] Capacitor mobile configuration

The repository should be treated as the technical source of truth for the exact implementation status of individual components.

---

# 21. Development Direction

Future development can focus on increasing the usefulness, reliability and commercial reach of the platform.

Potential areas include:

- Expanded chain coverage
- Additional security-data providers
- Improved OCR accuracy
- Improved smart-contract analysis
- More advanced AI explanations
- Mobile application distribution
- Expanded API capabilities
- Wallet and DEX integrations
- Portfolio monitoring
- Enterprise dashboards
- White-label deployments
- Additional token and DeFi analysis

These are development directions rather than guaranteed delivery commitments.

---

# 22. Business and Technical Risks

## Technical Risks

- External API outages
- Provider rate limits
- Incomplete third-party data
- Blockchain network congestion
- AI model availability and rate limits
- OCR errors
- False positives or false negatives
- Changes to blockchain standards

## Business Risks

- Regulatory changes
- Competition
- Dependence on third-party data providers
- Cryptocurrency market volatility
- User-acquisition costs
- Monetization conversion rates

## Mitigation

Potential mitigation strategies include:

- Multiple data providers
- Validation and fallback mechanisms
- Input sanitization
- Caching where appropriate
- Monitoring
- Graceful error handling
- Continued security review
- Diversification of revenue channels

---

# 23. Intellectual Property and Project Structure

AIDYOR consists of the application source code, backend infrastructure, product logic, UI, OCR processing, security-analysis workflows, documentation and associated intellectual property.

The repository includes both application code and supporting technical documentation.

Important documentation includes:

- `README.md`
- `WHITEPAPER.md`
- `FULL_PROJECT_AUDIT.md`
- `SECURITY_AUDIT_REPORT.md`

The repository is the primary technical artifact for evaluating the current implementation.

---

# 24. Conclusion

AIDYOR is a cryptocurrency security-research platform combining automated token analysis, multiple external data sources, AI-assisted interpretation and user-friendly research workflows.

Its core proposition is not simply to provide another token score.

The objective is to make the process of investigating a cryptocurrency token:

**faster → more accessible → more understandable → more actionable.**

The combination of:

- Multi-chain analysis
- Security-data aggregation
- AI explanations
- Screenshot OCR
- Smart-contract vulnerability analysis
- Market intelligence
- Whale monitoring
- Watchlists
- Security alerts
- Telegram integration
- Browser-extension support
- B2B API capabilities

creates a broader token-research platform that can serve both individual users and potential B2B/enterprise integrations.

---

# 25. Disclaimer

AIDYOR is a software platform for automated cryptocurrency research and risk analysis.

It does not provide financial, investment, legal or tax advice.

AIDYOR cannot guarantee that:

- a token is legitimate;
- a token is safe;
- a contract contains no vulnerabilities;
- liquidity will remain available;
- a project will not disappear;
- a token will increase in value;
- a detected vulnerability is necessarily exploitable;
- an undetected vulnerability does not exist; or
- information obtained from third-party providers is complete or error-free.

Cryptocurrency and smart-contract interactions involve substantial risk.

Users are responsible for independently verifying information before interacting with cryptocurrency tokens, contracts, wallets, exchanges or decentralized applications.

**Never rely solely on an automated scanner when making financial or investment decisions.**

---

## Links

**Website:** https://aidyor.app

**GitHub:** https://github.com/Struja007-alt/aidyor

---

**AIDYOR — Do Your Own Research, Powered by AI.**
