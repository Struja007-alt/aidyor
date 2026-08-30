import React from "react";
import { Link } from "react-router-dom";

/**
 * AIDYOR — API Access page
 * Drop this file into your pages directory (e.g. src/pages/ApiAccess.tsx)
 * and add a route to it, e.g. in your router file:
 *   <Route path="/api" element={<ApiAccess />} />
 *
 * Self-contained: no external CSS files, no design-system dependencies.
 * Adjust the CONTACT_EMAIL constant below before publishing.
 */

const CONTACT_EMAIL = "aidyor.app@gmail.com"; // TODO: swap for a dedicated address if you set one up, e.g. api@aidyor.app

export default function ApiAccess() {
  return (
    <div className="aidyor-api-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .aidyor-api-page {
          --bg: #0B0F14;
          --panel: #121820;
          --panel-alt: #161D26;
          --border: #232B33;
          --text: #E6EDF3;
          --text-dim: #8B98A5;
          --amber: #FFB454;
          --danger: #FF6B6B;
          --safe: #4ADE80;

          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, sans-serif;
          line-height: 1.5;
          min-height: 100vh;
        }

        .aidyor-api-page * { box-sizing: border-box; }

        .aidyor-api-page .wrap {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .aidyor-api-page .display {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .aidyor-api-page .mono {
          font-family: 'JetBrains Mono', monospace;
        }

        /* ---------- NAV ---------- */
        .aidyor-api-page nav {
          border-bottom: 1px solid var(--border);
          padding: 20px 0;
        }
        .aidyor-api-page nav .wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aidyor-api-page .brand {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: 0.02em;
        }
        .aidyor-api-page .brand span { color: var(--amber); }
        .aidyor-api-page nav a.cta-small {
          color: var(--bg);
          background: var(--amber);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }

        /* ---------- HERO ---------- */
        .aidyor-api-page .hero {
          padding: 64px 0 48px;
          display: grid;
          gap: 40px;
        }
        .aidyor-api-page .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--amber);
          letter-spacing: 0.04em;
          margin-bottom: 16px;
        }
        .aidyor-api-page h1 {
          font-size: clamp(30px, 5vw, 44px);
          margin: 0 0 18px;
          line-height: 1.1;
        }
        .aidyor-api-page .lede {
          color: var(--text-dim);
          font-size: 17px;
          max-width: 54ch;
          margin: 0 0 28px;
        }
        .aidyor-api-page .hero-ctas {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .aidyor-api-page .btn-primary {
          background: var(--amber);
          color: var(--bg);
          font-weight: 600;
          padding: 12px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 15px;
        }
        .aidyor-api-page .btn-ghost {
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 15px;
        }

        /* ---------- TERMINAL PANEL (signature element) ---------- */
        .aidyor-api-page .terminal {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .aidyor-api-page .terminal-bar {
          background: var(--panel-alt);
          border-bottom: 1px solid var(--border);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .aidyor-api-page .dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--border);
        }
        .aidyor-api-page .terminal-title {
          margin-left: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
        }
        .aidyor-api-page .terminal-body {
          padding: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          overflow-x: auto;
        }
        .aidyor-api-page .terminal-body .req { color: var(--text-dim); }
        .aidyor-api-page .terminal-body .key { color: #7DB0FF; }
        .aidyor-api-page .terminal-body .str { color: var(--safe); }
        .aidyor-api-page .flag-danger { color: var(--danger); }
        .aidyor-api-page .flag-amber { color: var(--amber); }
        .aidyor-api-page .flag-safe { color: var(--safe); }
        .aidyor-api-page pre { margin: 0; white-space: pre-wrap; word-break: break-word; }

        /* ---------- SECTIONS ---------- */
        .aidyor-api-page section {
          padding: 48px 0;
          border-top: 1px solid var(--border);
        }
        .aidyor-api-page .section-label {
          font-family: 'JetBrains Mono', monospace;
          color: var(--amber);
          font-size: 13px;
          margin-bottom: 8px;
        }
        .aidyor-api-page h2 {
          font-size: 26px;
          margin: 0 0 24px;
        }

        /* endpoints list */
        .aidyor-api-page .endpoint-row {
          display: flex;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
          align-items: baseline;
          flex-wrap: wrap;
        }
        .aidyor-api-page .endpoint-row:last-child { border-bottom: none; }
        .aidyor-api-page .method {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--amber);
          background: rgba(255,180,84,0.1);
          padding: 3px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .aidyor-api-page .path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: var(--text);
        }
        .aidyor-api-page .desc {
          color: var(--text-dim);
          font-size: 14px;
        }

        /* pricing — ledger style, no cards */
        .aidyor-api-page .pricing-table {
          border-top: 1px solid var(--border);
        }
        .aidyor-api-page .pricing-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 16px;
          padding: 20px 0;
          border-bottom: 1px solid var(--border);
          align-items: center;
        }
        .aidyor-api-page .tier-name {
          font-weight: 600;
          font-size: 16px;
        }
        .aidyor-api-page .tier-desc {
          color: var(--text-dim);
          font-size: 13px;
          margin-top: 2px;
        }
        .aidyor-api-page .tier-calls {
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-dim);
          font-size: 14px;
          text-align: right;
        }
        .aidyor-api-page .tier-price {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 20px;
          text-align: right;
          min-width: 90px;
        }
        .aidyor-api-page .tier-price small {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 13px;
          color: var(--text-dim);
        }

        /* who it's for */
        .aidyor-api-page .use-cases {
          display: grid;
          gap: 4px;
        }
        .aidyor-api-page .use-case {
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 14px;
        }
        .aidyor-api-page .use-case:last-child { border-bottom: none; }
        .aidyor-api-page .use-case-mark {
          color: var(--amber);
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }

        /* footer CTA */
        .aidyor-api-page footer {
          padding: 56px 0 72px;
          text-align: center;
        }
        .aidyor-api-page footer h2 {
          margin-bottom: 12px;
        }
        .aidyor-api-page footer p {
          color: var(--text-dim);
          margin-bottom: 28px;
        }

        @media (min-width: 720px) {
          .aidyor-api-page .hero { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav>
        <div className="wrap">
          <div className="brand">AIDYOR<span>.</span> API</div>
          <a className="cta-small" href={`mailto:${CONTACT_EMAIL}?subject=AIDYOR API Access`}>
            Get API access
          </a>
        </div>
      </nav>

      <div className="wrap">
        <section className="hero" style={{ borderTop: "none" }}>
          <div>
            <div className="eyebrow">// RISK SCORE API</div>
            <h1 className="display">
              Stop bad contracts before your users touch them.
            </h1>
            <p className="lede">
              One API call returns a risk score across 9 chains — rug pulls, honeypots,
              hidden taxes, and more. Built for wallets, trading bots, and DEX front-ends
              that need a scam check without building one from scratch.
            </p>
            <div className="hero-ctas">
              <a className="btn-primary" href={`mailto:${CONTACT_EMAIL}?subject=AIDYOR API Access`}>
                Request API access
              </a>
              <Link className="btn-ghost" to="/api-docs">Read the docs</Link>
            </div>
          </div>

          <div className="terminal">
            <div className="terminal-bar">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
              <span className="terminal-title">POST /v1/scan</span>
            </div>
            <div className="terminal-body">
              <pre>
<span className="req">{`{`}</span>{"\n"}
  <span className="key">"chain"</span>: <span className="str">"ethereum"</span>,{"\n"}
  <span className="key">"address"</span>: <span className="str">"0x7a25...d41f"</span>{"\n"}
<span className="req">{`}`}</span>{"\n\n"}
<span className="req">→ 200 OK</span>{"\n"}
<span className="req">{`{`}</span>{"\n"}
  <span className="key">"risk_score"</span>: 82,{"\n"}
  <span className="key">"verdict"</span>: <span className="flag-danger">"high_risk"</span>,{"\n"}
  <span className="key">"flags"</span>: [{"\n"}
    <span className="flag-danger">"honeypot_suspected"</span>,{"\n"}
    <span className="flag-amber">"liquidity_unlocked"</span>,{"\n"}
    <span className="flag-amber">"high_sell_tax"</span>{"\n"}
  ],{"\n"}
  <span className="key">"sources_checked"</span>: 7{"\n"}
<span className="req">{`}`}</span>
              </pre>
            </div>
          </div>
        </section>

        <section id="endpoints">
          <div className="section-label">// ENDPOINTS</div>
          <h2 className="display">What you get</h2>
          <div className="endpoint-row">
            <span className="method">POST</span>
            <span className="path">/scan</span>
            <span className="desc">Single contract risk check — address (+ optional chain) in, risk score + flags out</span>
          </div>
          <div className="endpoint-row">
            <span className="method">GET</span>
            <span className="path">/usage</span>
            <span className="desc">Check your current billing-period usage and remaining calls</span>
          </div>
          <div className="endpoint-row">
            <span className="method">GET</span>
            <span className="path">/plans</span>
            <span className="desc">Public — list available pricing tiers, no auth required</span>
          </div>
        </section>

        <section id="pricing">
          <div className="section-label">// PRICING</div>
          <h2 className="display">Simple, usage-based tiers</h2>
          <div className="pricing-table">
            <div className="pricing-row">
              <div>
                <div className="tier-name">Starter</div>
                <div className="tier-desc">For testing integration and low-volume bots</div>
              </div>
              <div className="tier-calls">1,000 calls/mo</div>
              <div className="tier-price">$49<small>/mo</small></div>
            </div>
            <div className="pricing-row">
              <div>
                <div className="tier-name">Growth</div>
                <div className="tier-desc">For live wallets, bots, and front-ends with real traffic</div>
              </div>
              <div className="tier-calls">5,000 calls/mo</div>
              <div className="tier-price">$99<small>/mo</small></div>
            </div>
            <div className="pricing-row" style={{ borderBottom: "none" }}>
              <div>
                <div className="tier-name">Enterprise</div>
                <div className="tier-desc">High volume, priority support</div>
              </div>
              <div className="tier-calls">25,000 calls/mo</div>
              <div className="tier-price">$199<small>/mo</small></div>
            </div>
          </div>
        </section>

        <section id="who-its-for">
          <div className="section-label">// WHO IT'S FOR</div>
          <h2 className="display">Built to drop into products people already use</h2>
          <div className="use-cases">
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Wallet apps</strong> — flag risky contracts before a user signs a transaction</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Trading bots</strong> — add a risk check command before a trade executes</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>DEX front-ends</strong> — show a risk badge next to new/unverified token listings</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Portfolio trackers</strong> — warn users holding flagged tokens</span>
            </div>
          </div>
        </section>

        <footer>
          <h2 className="display">Ready to integrate?</h2>
          <p>Send a message and we'll get you a test API key within 24 hours.</p>
          <div className="hero-ctas" style={{ justifyContent: "center" }}>
            <a className="btn-primary" href={`mailto:${CONTACT_EMAIL}?subject=AIDYOR API Access`}>
              Request API access
            </a>
            <Link className="btn-ghost" to="/api-docs">Read the docs</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
