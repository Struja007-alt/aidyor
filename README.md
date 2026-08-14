🛡️ AIDYOR — AI-Powered Crypto Token Risk Scanner

«Do Your Own Research, Powered by AI»

AIDYOR is a cryptocurrency token security analysis platform designed to help users investigate token contracts and market conditions before making decisions.

It aggregates blockchain, market, liquidity and security data from multiple sources and presents the results through a unified risk-analysis interface.

Live application: https://aidyor.app

«⚠️ Important: AIDYOR provides automated analysis and informational risk indicators. It is not a financial adviser, security audit, or guarantee that a token is safe. Users should perform their own research before interacting with any cryptocurrency project.»

---

✨ Features

🔍 Multi-Chain Token Scanner

Analyze cryptocurrency tokens across multiple supported blockchain networks, including EVM networks and Solana.

The scanner combines contract, market and security information into a single result.

No wallet is required to run a token scan.

📊 Risk Scoring

AIDYOR calculates a normalized risk score and presents the result through an easy-to-understand risk gauge.

The analysis can incorporate factors such as:

- Honeypot indicators
- Buy and sell taxes
- Ownership characteristics
- Holder concentration
- Liquidity information
- Mint and freeze capabilities
- Contract characteristics
- Market conditions
- Trading activity
- Token-standard information

🤖 AI-Powered Analysis

AI is used to help interpret technical security and market information and turn it into understandable explanations.

The purpose is to help users understand why a token may present particular risks rather than simply displaying raw API data.

📸 OCR Screenshot Scanner

Upload a screenshot containing a cryptocurrency contract address and AIDYOR can attempt to:

1. Detect text from the image
2. Extract cryptocurrency addresses
3. Validate extracted addresses
4. Correct OCR-related character errors where possible
5. Identify multiple addresses when present
6. Pass valid addresses to the token scanner

The OCR system combines local OCR and AI vision processing to improve extraction reliability.

🔗 Shareable Scan Results

Scan results can be shared through links containing the relevant token address and blockchain information.

Opening a supported shared link can automatically initiate the corresponding scan.

🐋 Whale Activity

AIDYOR can monitor significant blockchain transactions and surface potentially relevant whale activity.

⭐ Watchlist

Users can save tokens to a cloud-based watchlist and monitor their associated risk information.

🤖 Telegram Integration

AIDYOR includes Telegram integration for token scanning and related functionality.

🐛 Smart Contract Bug Scanner

The Pro security scanner can analyze verified Solidity contracts for common vulnerability patterns.

The analysis can include areas such as:

- Reentrancy
- "tx.origin" usage
- Dangerous "delegatecall"
- "selfdestruct"
- Weak randomness
- Minting controls
- Mutable tax mechanisms
- Blacklist mechanisms
- Initialization protection
- Other potentially dangerous contract patterns

AI-assisted analysis can provide additional explanations and remediation-oriented information.

«This feature is intended as a pre-audit security analysis tool, not a replacement for a professional smart-contract audit.»

🌐 Browser Extension

AIDYOR includes a browser-extension component designed to bring token-security scanning functionality closer to the user's browsing workflow.

📱 Mobile Support

The project includes Capacitor configuration for packaging the application for mobile platforms.

---

🔐 Security Analysis

Depending on the blockchain and token, AIDYOR can use information from multiple security and market-data providers.

Analysis may include:

- Honeypot detection
- Buy/sell tax analysis
- Ownership analysis
- Liquidity-lock information
- Holder concentration
- Mint/freeze authority
- Contract characteristics
- Token-standard detection
- Market liquidity
- Trading volume
- Price activity
- Transaction activity

Supported token standards may include:

- ERC-20 / ERC-721 / ERC-1155
- BEP-20 / BEP-721 / BEP-1155
- SPL Token / Token-2022
- Selected NFT and Solana token formats

Actual availability depends on the blockchain, token and external data provider.

---

📈 Risk Score

AIDYOR presents token analysis through a 0–100 risk/safety score.

The score is intended as an informational risk indicator, not an objective measure of whether an investment will succeed.

Score| Rating| General Interpretation
70–100| 🟢 SAFE| Fewer detected risk indicators
40–69| 🟡 CAUTION| Moderate risk indicators
20–39| 🔴 WARNING| Significant risk indicators
0–19| ☠️ DANGER| Severe detected risk indicators

A high score does not guarantee that a token is legitimate or profitable.

A low score does not necessarily mean that every identified issue is exploitable.

---

🛠️ Technology Stack

Frontend

React 18
├── TypeScript
├── Vite
├── Tailwind CSS
├── shadcn/ui
├── Radix UI
├── React Router
├── TanStack React Query
├── React Hook Form
├── Zod
└── Capacitor

OCR

Tesseract.js
+
AI Vision processing
+
Address validation/correction

The OCR pipeline includes address validation and correction logic designed to reduce common OCR transcription errors.

Backend

AIDYOR uses Supabase and Edge Functions for backend services and integrations.

Backend functionality includes areas such as:

Risk orchestration
Market data
On-chain security data
AI analysis
Simulation / market analysis
Whale monitoring
Security alerts
OCR processing
OCR analytics
Telegram integration
B2B API
Authentication
Payments
Subscription management
Passkeys / WebAuthn

The exact backend implementation and function set are maintained in the repository.

---

📡 Data Sources

AIDYOR integrates data from multiple external providers, depending on chain and feature.

Examples include:

Provider| Primary Use
GoPlus Labs| Token and contract security data
RugCheck| Solana token security information
BSCTrace| BNB Chain analysis
SolanaFM| Solana blockchain information
DEXScreener| Market and trading data
Unicrypt| Liquidity-lock information
CoinGecko| Token and market information

External provider availability, limits and returned data may change independently of AIDYOR.

---

🏗️ Project Structure

├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── TokenScanner.tsx
│   │   ├── RiskGauge.tsx
│   │   ├── WhaleAlerts.tsx
│   │   ├── CryptoSecurityNews.tsx
│   │   └── Watchlist.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useCloudWatchlist.ts
│   │   ├── useSecurityAlerts.ts
│   │   ├── usePasskey.ts
│   │   └── useWhaleAlerts.ts
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── ocr/
│   │   ├── security/
│   │   └── constants/
│   │
│   └── pages/
│
├── supabase/
│   └── functions/
│
├── browser-extension/
│   ├── manifest.json
│   ├── popup/
│   ├── background/
│   ├── content/
│   └── icons/
│
└── public/

---

🔒 Security Architecture

Security-related implementation includes:

Database

- Row Level Security (RLS)
- User ownership enforcement
- Protected service-role operations
- Restricted access to sensitive records
- Secure database policies

Edge Functions

- Authentication where required
- CORS controls
- Input validation
- Request validation
- Error handling
- Sanitized logging
- Protected webhook processing

Frontend

- Zod-based input validation
- Address validation
- XSS-oriented input filtering
- API timeout controls
- Separation of sensitive backend operations

Security controls are intended to reduce application-level risks but do not constitute a formal third-party security certification.

---

🚀 Getting Started

Requirements

- Node.js 18+
- npm or Bun
- Git

Installation

git clone https://github.com/Struja007-alt/aidyor.git

cd aidyor

npm install

Development

npm run dev

Production Build

npm run build

Lint

npm run lint

---

⚙️ Environment Configuration

AIDYOR uses environment variables for configuration of external services and backend integrations.

Do not commit private API keys, service-role keys, payment secrets, authentication secrets or other credentials to the repository.

For production deployments, configure secrets through the appropriate hosting or backend secret-management system.

---

📚 Documentation

The repository contains additional project documentation, including:

- "WHITEPAPER.md" (./WHITEPAPER.md)
- "FULL_PROJECT_AUDIT.md" (./FULL_PROJECT_AUDIT.md)
- "SECURITY_AUDIT_REPORT.md" (./SECURITY_AUDIT_REPORT.md)

Application documentation pages include areas such as:

- API Documentation
- Privacy Policy
- Terms of Service
- Cookie Policy
- Disclaimer
- Transparency
- FAQ
- Glossary
- OCR Analytics

---

🗺️ Project Status

AIDYOR is an actively developed cryptocurrency security-analysis platform.

Implemented

- [x] Multi-chain token scanning
- [x] Token risk scoring
- [x] AI-assisted risk explanations
- [x] Screenshot OCR scanning
- [x] Address validation and correction
- [x] Market-data integration
- [x] Security-data aggregation
- [x] Liquidity-lock analysis
- [x] Whale activity monitoring
- [x] Cloud watchlist
- [x] Telegram integration
- [x] Browser extension
- [x] Token-standard detection
- [x] Smart-contract vulnerability scanning
- [x] Shareable scan results
- [x] Passkey/WebAuthn infrastructure
- [x] Subscription infrastructure
- [x] B2B API infrastructure
- [x] OCR analytics infrastructure

Mobile

- [x] Capacitor configuration
- [ ] Production mobile distribution/build process

---

⚠️ Disclaimer

AIDYOR is a software tool for cryptocurrency research and automated risk analysis.

It does not provide financial, investment, legal or tax advice.

AIDYOR cannot guarantee that:

- a token is legitimate;
- a token is free from vulnerabilities;
- a contract cannot be exploited;
- liquidity will remain available;
- a project will not disappear;
- a token will increase in value;
- an identified risk is necessarily exploitable; or
- an unrecognized risk does not exist.

Cryptocurrency markets and smart contracts involve substantial risk.

Users are responsible for independently verifying information before interacting with a token, smart contract, wallet, exchange or decentralized application.

Never rely solely on an automated scanner when making financial decisions.

---

🔗 Links

Live application: https://aidyor.app

GitHub repository: https://github.com/Struja007-alt/aidyor

---

📜 License

Proprietary — All Rights Reserved

The source code and associated AIDYOR intellectual property are not licensed for unrestricted commercial redistribution or modification unless expressly authorized by the rights holder.

---

About AIDYOR

AIDYOR is built around a simple objective:

«Make cryptocurrency security research faster, more accessible and easier to understand.»

The platform combines automated blockchain analysis, security-data aggregation, market information, OCR and AI-assisted explanations into a single research workflow.


