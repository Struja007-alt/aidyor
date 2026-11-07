// scripts/prerender.mjs
// Runs after `vite build`. For every public URL it writes dist/<path>/index.html
// with the page's own <title>, description, canonical, OG/Twitter tags, an H1,
// an intro and internal links, so crawlers see correct data in the RAW HTML
// (before any JavaScript runs). It also adds static content to the homepage.

import fs from "node:fs";
import path from "node:path";

const SITE = "https://aidyor.app";
const DIST = path.resolve("dist");
const SITEMAP_CANDIDATES = [
  path.join(DIST, "sitemap.xml"),
  path.resolve("public", "sitemap.xml"),
];

// ---------------------------------------------------------------------------
// Per-page metadata. Entries here always win over the section fallbacks below.
// Add your most important pages (top blog posts, key glossary terms) here.
// ---------------------------------------------------------------------------
const PAGES = {
  "/about": {
    title: "About AIDYOR | AI Crypto Token Security Scanner",
    description:
      "AIDYOR is an AI-powered crypto token security scanner that detects honeypots, rug pulls and scam tokens across 9 blockchain networks. Learn what we check and how it works.",
    h1: "About AIDYOR",
    intro:
      "AIDYOR is an AI-powered crypto token security scanner that helps you spot honeypots, rug pulls, and scam tokens before you invest.",
  },
  "/faq": {
    title: "Crypto Scam FAQ: Rug Pulls, Honeypots & Red Flags | AIDYOR",
    description:
      "Answers to common crypto scam questions: what rug pulls, honeypots and locked liquidity are, how to spot red flags, and how to stay safe. Free guide from AIDYOR.",
    h1: "Crypto Scam & Token Safety FAQ",
    intro:
      "Learn how to protect yourself from crypto scams, identify red flags, and follow security best practices.",
  },
  "/blog": {
    title: "Crypto Security Blog: Scams, Honeypots & Rug Pulls | AIDYOR",
    description:
      "Guides on crypto scams, honeypots, rug pulls and token safety from the AIDYOR team.",
    h1: "AIDYOR Crypto Security Blog",
    intro: "Guides on crypto scams, honeypots, rug pulls and token safety.",
  },
  "/glossary": {
    title: "Crypto Security Glossary: Honeypot, Rug Pull & More | AIDYOR",
    description:
      "Plain-English crypto security glossary from AIDYOR. Look up honeypots, rug pulls, liquidity locks and other terms every token buyer should know.",
    h1: "Crypto Security Glossary",
    intro:
      "Plain-English definitions of the crypto and DeFi security terms every token buyer should know.",
  },
  "/api-docs": {
    title: "Token Security API Documentation | AIDYOR",
    description:
      "Developer documentation for the AIDYOR token security API: endpoints, authentication, rate limits and plans.",
    h1: "AIDYOR API Documentation",
    intro:
      "Developer documentation for the AIDYOR token security API: endpoints, authentication, rate limits and plans.",
  },
  "/subscription": {
    title: "Pricing & Plans | AIDYOR Crypto Token Scanner",
    description:
      "Compare AIDYOR plans: free daily token scans, and Pro with AI explanations and the Smart Contract Bug Scanner.",
    h1: "AIDYOR Plans & Pricing",
    intro:
      "Compare the free plan with Pro, which adds AI explanations and the Smart Contract Bug Scanner.",
  },
};
// ---------------------------------------------------------------------------

// Words that should be upper-cased (or special-cased) when built from a slug
const ACRONYMS = new Set([
  "amm", "fdv", "fud", "dex", "cex", "tvl", "kyc", "aml", "dao", "nft", "api",
  "ico", "ido", "ieo", "lp", "mev", "bnb", "eth", "evm", "ath", "atl", "apy",
  "apr", "dyor", "rpc", "ai", "ocr", "ux", "ui",
]);
const SPECIAL = { defi: "DeFi", dapp: "dApp", dapps: "dApps" };

const NAV = [
  ["/", "Home"],
  ["/faq", "FAQ"],
  ["/blog", "Blog"],
  ["/glossary", "Glossary"],
  ["/api-docs", "API"],
  ["/subscription", "Pricing"],
  ["/about", "About"],
  ["/transparency", "Transparency"],
];

// Matches #root whether it is empty or already holds static content
// (anchored on the </div> that is followed by a <script> or </body>)
const ROOT_RE = /<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body>)/;

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const humanize = (slug) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((w) => {
      const lw = w.toLowerCase();
      if (SPECIAL[lw]) return SPECIAL[lw];
      if (ACRONYMS.has(lw)) return lw.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

// Fallback metadata for pages without a PAGES entry (unique per page, built from the slug)
function fallbackMeta(route) {
  const parts = route.split("/").filter(Boolean);
  const section = parts[0];
  const name = humanize(parts[parts.length - 1] || "");

  if (parts.length === 2 && section === "glossary") {
    return {
      title: `${name} Explained: Crypto Glossary | AIDYOR`,
      description: `What does ${name} mean in crypto? Plain-English explanation from the AIDYOR crypto security glossary.`,
      h1: name,
      intro: `A plain-English explanation of ${name} from the AIDYOR crypto security glossary.`,
    };
  }
  if (parts.length === 2 && section === "chains") {
    return {
      title: `${name} Token Scanner: Detect Honeypots & Rug Pulls | AIDYOR`,
      description: `Scan ${name} tokens for honeypots, rug pulls and scam patterns. Free AI-powered ${name} token risk scanner from AIDYOR, no wallet needed.`,
      h1: `${name} Token Scanner`,
      intro: `Scan ${name} tokens for honeypots, rug pulls and scam patterns with AIDYOR's free multichain token scanner.`,
    };
  }
  if (parts.length === 2 && section === "blog") {
    return {
      title: `${name} | AIDYOR Blog`,
      description: `${name}: a crypto security guide from the AIDYOR blog.`,
      h1: name,
      intro: "",
    };
  }
  return {
    title: `${name} | AIDYOR`,
    description: `${name} on AIDYOR, the AI-powered crypto token security scanner.`,
    h1: name,
    intro: "",
  };
}

function readSitemapPaths() {
  for (const file of SITEMAP_CANDIDATES) {
    if (fs.existsSync(file)) {
      const xml = fs.readFileSync(file, "utf8");
      const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => {
        try {
          return new URL(m[1]).pathname.replace(/\/+$/, "") || "/";
        } catch {
          return null;
        }
      });
      return paths.filter(Boolean);
    }
  }
  console.warn("[prerender] sitemap.xml not found, using PAGES only");
  return [];
}

function setMeta(html, re, replacement) {
  return re.test(html) ? html.replace(re, replacement) : html;
}

const navHtml = () =>
  `<nav aria-label="Main">${NAV.map(
    ([href, label]) => `<a href="${href}" class="text-primary underline">${label}</a>`
  ).join(" · ")}</nav>`;

function buildPage(template, route) {
  const url = `${SITE}${route}`;
  const meta = { ...fallbackMeta(route), ...(PAGES[route] || {}) };
  const { title, description, h1, intro } = meta;

  let html = template;
  html = setMeta(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  html = setMeta(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  html = setMeta(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = setMeta(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);

  const d = esc(description);
  html = setMeta(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${d}" />`);
  html = setMeta(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}" />`);
  html = setMeta(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}" />`);

  // meta keywords is ignored by Google
  html = html.replace(/<meta name="keywords"[^>]*>\s*/g, "");

  // Homepage SoftwareApplication schema belongs on the homepage only
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
    (block) => (block.includes('"SoftwareApplication"') ? "" : block)
  );

  // Static nav + H1 + intro inside #root (React replaces it on mount)
  // The "ssr-fallback" class lets index.html hide this block for JS-enabled clients (no flash before React mounts)
  const introHtml = intro ? `<p>${esc(intro)}</p>` : "";
  html = html.replace(
    ROOT_RE,
    () => `<div id="root"><div class="ssr-fallback container mx-auto px-4 py-8">${navHtml()}<main><h1>${esc(h1)}</h1>${introHtml}</main></div></div>\n    `
  );

  return html;
}

// Static homepage content (mirrors the visible hero and How It Works copy)
// The "ssr-fallback" class lets index.html hide this block for JS-enabled clients (no flash before React mounts)
const HOME_BLOCK = `<div class="ssr-fallback container mx-auto px-4 py-8">${navHtml()}<main>
<h1>Crypto Token Scanner: Detect Honeypots &amp; Rug Pulls</h1>
<p>Protect your crypto with an advanced multi-chain token scanner and free honeypot checker. Paste a contract, search by name, or drop a screenshot — we surface the risk in seconds.</p>
<ul><li>No wallet connection required</li><li>Real-time blockchain data</li><li>Scam pattern detection</li><li>AI-powered OCR</li></ul>
<h2>How It Works</h2>
<p>Institutional-grade crypto security analysis in three steps — no wallet, no sign-up required.</p>
<h3>1. Input Your Token</h3>
<p>Paste a contract address, search by token name, or drop a screenshot — our OCR engine extracts the address automatically.</p>
<h3>2. Real-Time Analysis</h3>
<p>We cross-check 7+ security APIs simultaneously — GoPlus, RugCheck, Unicrypt, DexScreener and more — across 9 blockchain networks.</p>
<h3>3. Get Your Risk Score</h3>
<p>Receive a 0–100 safety score with AI-powered plain-English explanations of every risk factor. No jargon, no guesswork.</p>
<h2>Smart Contract Bug Scanner</h2>
<p>Check smart contract code for common vulnerabilities before you interact with it.</p>
<p><small>Analysis is informational only. No financial advice or guarantees.</small></p>
</main></div>`;

function main() {
  const templatePath = path.join(DIST, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("[prerender] dist/index.html not found. Did vite build run?");
    process.exit(1);
  }
  // Read the pristine template ONCE, before the homepage is modified below
  const template = fs.readFileSync(templatePath, "utf8");

  const routes = new Set([...readSitemapPaths(), ...Object.keys(PAGES)]);
  routes.delete("/");

  let count = 0;
  for (const route of routes) {
    const outDir = path.join(DIST, route);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), buildPage(template, route));
    count++;
  }
  console.log(`[prerender] wrote ${count} pages`);

  // Homepage: add static content to dist/index.html
  const home = template.replace(
    ROOT_RE,
    () => `<div id="root">${HOME_BLOCK}</div>\n    `
  );
  if (!ROOT_RE.test(template)) {
    console.warn('[prerender] homepage: #root not found, homepage left unchanged');
  } else {
    fs.writeFileSync(templatePath, home);
    console.log("[prerender] homepage static content added");
  }
}

main();
