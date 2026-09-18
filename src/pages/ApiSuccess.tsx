import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

/**
 * AIDYOR — API signup success page
 * Route: /api/success?session_id=cs_...
 * Add to your router: <Route path="/api/success" element={<ApiSuccess />} />
 *
 * Calls api-signup/complete once on mount. Shows the API key exactly once —
 * reloading this page again will NOT regenerate or re-reveal the key.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type CompleteResult =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "already_activated"; company_name: string; plan_tier: string; message: string }
  | { state: "activated"; company_name: string; plan_tier: string; api_key: string; key_prefix: string; warning: string };

export default function ApiSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [result, setResult] = useState<CompleteResult>({ state: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setResult({ state: "error", message: "Missing session ID. If you just completed checkout, check the link Stripe sent you." });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/api-signup/complete?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setResult({ state: "error", message: data.message || data.error || "Something went wrong activating your account." });
          return;
        }

        if (data.already_activated) {
          setResult({ state: "already_activated", company_name: data.company_name, plan_tier: data.plan_tier, message: data.message });
        } else {
          setResult({
            state: "activated",
            company_name: data.company_name,
            plan_tier: data.plan_tier,
            api_key: data.api_key,
            key_prefix: data.key_prefix,
            warning: data.warning,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Activation error:", err);
          setResult({ state: "error", message: "Network error while activating your account. If payment succeeded, contact support and we'll sort it out." });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="aidyor-api-success-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .aidyor-api-success-page {
          --bg: #0B0F14;
          --panel: #121820;
          --border: #232B33;
          --text: #E6EDF3;
          --text-dim: #8B98A5;
          --amber: #FFB454;
          --danger: #FF6B6B;
          --safe: #4ADE80;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .aidyor-api-success-page * { box-sizing: border-box; }
        .aidyor-api-success-page .card {
          max-width: 560px;
          width: 100%;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 36px;
        }
        .aidyor-api-success-page h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          margin: 0 0 8px;
        }
        .aidyor-api-success-page .sub {
          color: var(--text-dim);
          font-size: 14px;
          margin: 0 0 24px;
        }
        .aidyor-api-success-page .key-box {
          background: var(--bg);
          border: 1px solid var(--safe);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .aidyor-api-success-page .key-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          word-break: break-all;
          color: var(--safe);
          margin-bottom: 12px;
        }
        .aidyor-api-success-page .copy-btn {
          background: var(--amber);
          color: var(--bg);
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .aidyor-api-success-page .warning {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--amber);
          background: rgba(255,180,84,0.1);
          border: 1px solid rgba(255,180,84,0.3);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        .aidyor-api-success-page .error-box {
          color: var(--danger);
          font-size: 14px;
          margin-bottom: 20px;
        }
        .aidyor-api-success-page .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-dim);
          margin-bottom: 4px;
        }
        .aidyor-api-success-page a.btn {
          display: inline-block;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px 18px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 14px;
          margin-right: 10px;
        }
        .aidyor-api-success-page .spinner {
          color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
        }
      `}</style>

      <div className="card">
        {result.state === "loading" && (
          <>
            <h1>Activating your account…</h1>
            <p className="spinner">Confirming payment with Stripe, please wait.</p>
          </>
        )}

        {result.state === "error" && (
          <>
            <h1>Something went wrong</h1>
            <p className="error-box">{result.message}</p>
            <Link className="btn" to="/api">Back to API page</Link>
          </>
        )}

        {result.state === "already_activated" && (
          <>
            <h1>Account already active</h1>
            <div className="meta-row"><span>Company</span><span>{result.company_name}</span></div>
            <div className="meta-row"><span>Plan</span><span>{result.plan_tier}</span></div>
            <p className="sub" style={{ marginTop: 16 }}>{result.message}</p>
            <a className="btn" href={`mailto:api@aidyor.app?subject=API key reset for ${result.company_name}`}>Contact support</a>
            <Link className="btn" to="/api-docs">Read the docs</Link>
          </>
        )}

        {result.state === "activated" && (
          <>
            <h1>You're live 🎉</h1>
            <p className="sub">
              {result.company_name} — {result.plan_tier} plan is active.
            </p>

            <div className="key-box">
              <div className="key-value">{result.api_key}</div>
              <button className="copy-btn" onClick={() => copyKey(result.api_key)}>
                {copied ? "Copied!" : "Copy key"}
              </button>
            </div>

            <div className="warning">⚠ {result.warning}</div>

            <Link className="btn" to="/api-docs">Read the docs</Link>
            <a className="btn" href={`mailto:api@aidyor.app?subject=API help for ${result.company_name}`}>Get help</a>
          </>
        )}
      </div>
    </div>
  );
}
