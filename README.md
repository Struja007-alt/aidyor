# 🛡️ AIDYOR | Token Risk Analyzer

An advanced, real-time cryptocurrency token security scanner built with **React**, **Vite**, and **Tailwind CSS**. Designed for traders who need instant, actionable data to avoid "rug pulls" and "honeypots" in the DeFi space.

## 🚀 Overview

AIDYOR (AI Do Your Own Research) provides an automated risk assessment for any smart contract address. By aggregating data across multiple security APIs, it delivers a "Risk Score" that helps users decide whether to invest or stay away.

### ✨ Key Features

* **Instant Risk Scoring:** A visual gauge ranging from "Safe" to "High Risk."
* **🆕 AI-Powered Risk Explanations:** Gemini AI analyzes security factors and explains in plain English why a token is risky (or safe).
* **Contract Security Audit:** Checks for:
    * **Honeypot Detection:** Can you sell once you buy?
    * **Tax Analysis:** Real-time Buy/Sell tax percentages.
    * **Contract Verification:** Confirmation of open-source code.
    * **Mint Functions:** Identification of "hidden" minting capabilities.
* **Liquidity Tracking:** Monitors locked liquidity and pool health.
* **Screenshot OCR:** Upload token screenshots for automatic address extraction using AI Vision.
* **Multi-Chain Support:** Ethereum, BSC, Solana, Base, Arbitrum, and more.
* **Pump/Dump Detection:** Real-time alerts for unusual price activity.
* **Mobile-First Design:** Fully responsive UI built for the "on-the-go" trader.

---

## 🛠️ Tech Stack

* **Framework:** [React.js](https://reactjs.org/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **UI Components:** [Lucide React](https://lucide.dev/) (Icons), [Shadcn/UI](https://ui.shadcn.com/)
* **Backend:** Lovable Cloud (Supabase)
* **AI:** Lovable AI Gateway (Gemini 3 Flash) for risk explanations
* **OCR:** Tesseract.js + AI Vision (Gemini)
* **Deployment:** Optimized for [Lovable](https://lovable.dev) / Netlify / Vercel

---

## 📊 How It Works

1.  **Input:** User pastes a Smart Contract Address (CA) or uploads a screenshot.
2.  **Fetch:** The app queries decentralized security protocols (GoPlus/RugCheck/BSCTrace/DexScreener APIs).
3.  **Analyze:** Our logic engine parses the JSON data against 15+ "Red Flag" criteria.
4.  **AI Explain:** Gemini AI generates a human-readable explanation of why the token is risky.
5.  **Display:** Results are rendered in a clean, color-coded dashboard with actionable insights.

---

## 🔐 Security APIs Integrated

* **GoPlus Security:** Contract verification, honeypot detection, tax analysis
* **RugCheck:** Solana-specific security analysis
* **BSCTrace:** BNB Chain deep contract analysis
* **DexScreener:** Market data, liquidity, and trading activity
* **Unicrypt/Team Finance:** Liquidity lock verification

---

## 🤖 AI Features

### AI Risk Explanations (NEW)
The scanner now includes an "AI Risk Analysis" panel powered by Gemini AI that:
- Analyzes all detected security factors in context
- Explains WHY each risk matters in practical terms
- Provides clear recommendations (proceed with caution / avoid / looks reasonable)
- Works for all supported networks (ETH, BSC, SOL, etc.)

**Edge Function:** `supabase/functions/ai-risk-explain/index.ts`
**Hook:** `src/hooks/useAIRiskExplanation.ts`
**Component:** `src/components/AIRiskExplanation.tsx`

---

## 📈 Roadmap & Future Enhancements

- [x] **AI Risk Explanations:** LLM-powered analysis of why tokens are risky
- [ ] **Whale Alerts:** Track large wallet movements for the scanned token.
- [ ] **Wallet Connection:** Connect via RainbowKit to swap directly from the scanner.
- [ ] **History Log:** Cloud-synced scan history for premium users.
- [ ] **Telegram Bot:** Security-as-a-Service for crypto communities.

---

## 💰 Monetization & Value Prop

This project is positioned as a **SaaS-ready template**. 
* **B2B:** Can be sold as a "Security-as-a-Service" plugin for crypto telegram bots.
* **B2C:** Can be launched as a subscription-based premium scanner.
* **Affiliate:** Integrated trading links to DEX platforms.

---

## 🚀 Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 📄 License

MIT License - feel free to use and modify for your own projects.
