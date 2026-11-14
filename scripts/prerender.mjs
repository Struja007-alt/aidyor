// scripts/prerender.mjs
// Runs after `vite build`. For every public URL it writes dist/<path>/index.html
// with the page's own <title>, description, canonical, OG/Twitter tags, an H1 and
// (for blog, glossary and chain pages) real body text, so crawlers see correct
// data in the RAW HTML (before any JavaScript runs).
//
// Data sources (read from src/ at build time, never imported):
//   - src/data/blogPosts.ts      -> /blog/<slug>
//   - src/pages/Glossary.tsx     -> /glossary/<slug>
//   - src/data/chains.ts         -> /chains/<slug>  (ONLY if App.tsx has the route)
// If any source cannot be parsed, that part is skipped with a warning and the
// build continues exactly as before. This script never fails the build because
// of a parsing problem.

import fs from "node:fs";
import path from "node:path";

const SITE = "https://aidyor.app";
const DIST = path.resolve("dist");
const SRC = path.resolve("src");

const SITEMAP_CANDIDATES = [
  path.join(DIST, "sitemap.xml"),
  path.resolve("public", "sitemap.xml"),
];

// ---------------------------------------------------------------------------
// Manual per-page metadata. These ALWAYS win over auto-generated metadata.
// ---------------------------------------------------------------------------
const PAGES = {
  "/faq": {
    title: "Crypto Scam FAQ: Rug Pulls, Honeypots & Red Flags | AIDYOR",
    description:
      "Answers to common crypto scam questions: what rug pulls, honeypots and locked liquidity are, how to spot red flags, and how to stay safe. Free guide from AIDYOR.",
    h1: "Crypto Scam & Token Safety FAQ",
    intro:
      "Learn how to protect yourself from crypto scams, identify red flags, and follow security best practices.",
  },
  "/blog": {
    title: "Crypto Security Blog: Scam Detection Guides | AIDYOR",
    description:
      "Guides on crypto scams, honeypots, rug pulls, token approvals and on-chain safety checks, from the AIDYOR token security scanner.",
    h1: "AIDYOR Crypto Security Blog",
    intro:
      "Guides on spotting honeypots, rug pulls, fake tokens and wallet drainers before you buy.",
  },
  "/glossary": {
    title: "Crypto Glossary: Scam & DeFi Terms Explained | AIDYOR",
    description:
      "Plain-English definitions of crypto and DeFi terms, from honeypot and rug pull to liquidity lock, slippage and tokenomics.",
    h1: "Crypto Glossary",
    intro: "Essential terms every crypto investor should know.",
  },
};

// Filled automatically from src/ (see loaders below). Manual PAGES override it.
const DYNAMIC = {};

// ---------------------------------------------------------------------------
const MAIN_STYLE =
  "max-width:48rem;margin:0 auto;padding:2rem 1rem;min-height:100vh;background:hsl(var(--background));color:hsl(var(--foreground));font-family:system-ui,sans-serif;line-height:1.6";

const ACRONYMS = {
  api: "API",
  faq: "FAQ",
  ocr: "OCR",
  bnb: "BNB",
  dex: "DEX",
  dyor: "DYOR",
  fdv: "FDV",
  amm: "AMM",
  fomo: "FOMO",
  fud: "FUD",
  lp: "LP",
  ai: "AI",
};

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
    .map((w) => ACRONYMS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// ---------------------------------------------------------------------------
// Source readers / parsers (all defensive)
// ---------------------------------------------------------------------------
function readSrc(rel) {
  try {
    return fs.readFileSync(path.join(SRC, rel), "utf8");
  } catch {
    console.warn(`[prerender] could not read src/${rel}`);
    return "";
  }
}

const unescapeStr = (s) =>
  s.replace(/\\n/g, "\n").replace(/\\(["'\\])/g, "$1");

// Reads  key: "value"  (value may be on the next line, may contain \" escapes)
function field(block, key) {
  const re = new RegExp(key + String.raw`:\s*"((?:[^"\\]|\\.)*)"`);
  const m = block.match(re);
  return m ? unescapeStr(m[1]) : "";
}

function splitBySlug(src) {
  const starts = [...src.matchAll(/\bslug:\s*"([^"]+)"/g)];
  return starts.map((m, i) => ({
    slug: m[1],
    block: src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length),
  }));
}

function loadBlog() {
  try {
    const src = readSrc("data/blogPosts.ts");
    const posts = splitBySlug(src).map(({ slug, block }) => {
      const c = block.match(/content:\s*`([\s\S]*?)`\s*\n?\s*\}/);
      return {
        slug,
        title: field(block, "title"),
        excerpt: field(block, "excerpt"),
        date: field(block, "date"),
        metaTitle: field(block, "metaTitle"),
        metaDescription: field(block, "metaDescription"),
        content: c ? c[1].trim() : "",
      };
    });
    let n = 0;
    for (const p of posts) {
      if (!p.slug || !p.title) continue;
      const route = `/blog/${p.slug}`;
      const url = `${SITE}${route}`;
      const title = p.metaTitle || `${p.title} | AIDYOR`;
      const description = p.metaDescription || p.excerpt;
      const ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: p.title,
        description,
        datePublished: p.date || undefined,
        dateModified: p.date || undefined,
        author: { "@type": "Organization", name: "AIDYOR", url: SITE },
        publisher: { "@type": "Organization", name: "AIDYOR", url: SITE },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      };
      DYNAMIC[route] = {
        title,
        description,
        h1: p.title,
        intro: p.excerpt,
        bodyHtml: p.content, // trusted HTML from our own repo
        jsonLd: ld,
      };
      n++;
    }
    console.log(`[prerender] blog posts parsed: ${n}`);
  } catch (e) {
    console.warn("[prerender] blog parsing failed, skipping:", e.message);
  }
}

function loadGlossary() {
  try {
    const src = readSrc("pages/Glossary.tsx");
    const re =
      /\{\s*term:\s*"((?:[^"\\]|\\.)*)",\s*slug:\s*"([^"]+)",\s*shortDefinition:\s*"((?:[^"\\]|\\.)*)"/g;
    let n = 0;
    for (const m of src.matchAll(re)) {
      const term = unescapeStr(m[1]);
      const slug = m[2];
      const def = unescapeStr(m[3]);
      DYNAMIC[`/glossary/${slug}`] = {
        title: `${term} Meaning in Crypto | AIDYOR`,
        description: `${def} Part of the AIDYOR crypto glossary.`,
        h1: term,
        intro: def,
      };
      n++;
    }
    console.log(`[prerender] glossary terms parsed: ${n}`);
  } catch (e) {
    console.warn("[prerender] glossary parsing failed, skipping:", e.message);
  }
}

function loadChains() {
  try {
    // Only prerender chain pages if the route really exists in the app.
    const app = readSrc("App.tsx");
    const hasRoute = /path=["']\/chains\/:slug["']/.test(app);
    const hasPage = fs.existsSync(path.join(SRC, "pages", "ChainLanding.tsx"));
    if (!hasRoute || !hasPage) {
      console.warn(
        "[prerender] /chains/:slug route or ChainLanding.tsx not found in src/, skipping chain pages"
      );
      return;
    }
    const src = readSrc("data/chains.ts");
    let n = 0;
    for (const { slug, block } of splitBySlug(src)) {
      const name = field(block, "name");
      if (!slug || !name) continue;
      const type = field(block, "type");
      const intro = field(block, "intro");
      const rm = block.match(/risks:\s*\[([\s\S]*?)\]/);
      const risks = rm
        ? [...rm[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => unescapeStr(x[1]))
        : [];
      const body =
        `<p>Check any token on ${esc(name)}, ${esc(type)}, for honeypots, rug pull signals, hidden taxes, and risky contract permissions before you buy. Free, instant, and no wallet connection required.</p>` +
        `<h2>Why ${esc(name)} tokens need checking</h2><p>${esc(intro)}</p>` +
        (risks.length
          ? `<h2>Common risks on ${esc(name)}</h2><ul>${risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
          : "");
      DYNAMIC[`/chains/${slug}`] = {
        title: `${name} Token Scanner: Honeypot & Rug Pull Checker | AIDYOR`,
        description: `Check any ${name} token for honeypots, rug pulls, hidden taxes and risky contracts. Free ${name} token safety scanner with a 0-100 risk score. No wallet needed.`,
        h1: `${name} Token Scanner & Safety Checker`,
        intro: "",
        bodyHtml: body,
      };
      n++;
    }
    console.log(`[prerender] chain pages parsed: ${n}`);
  } catch (e) {
    console.warn("[prerender] chains parsing failed, skipping:", e.message);
  }
}

// ---------------------------------------------------------------------------
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

// replace with a function so "$" characters in the replacement are never special
function setMeta(html, re, replacement) {
  return re.test(html) ? html.replace(re, () => replacement) : html;
}

function buildPage(template, route) {
  const url = `${SITE}${route}`;
  const meta = { ...(DYNAMIC[route] || {}), ...(PAGES[route] || {}) };
  const lastSlug = route.split("/").filter(Boolean).pop() || "";
  const title = meta.title || `${humanize(lastSlug)} | AIDYOR`;
  const h1 = meta.h1 || humanize(lastSlug);

  let html = template;
  html = setMeta(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  html = setMeta(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  html = setMeta(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = setMeta(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);

  if (meta.description) {
    const d = esc(meta.description);
    html = setMeta(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${d}" />`);
    html = setMeta(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}" />`);
    html = setMeta(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}" />`);
  }

  // meta keywords is ignored by Google
  html = html.replace(/<meta name="keywords"[^>]*>\s*/g, "");

  // Homepage SoftwareApplication schema belongs on the homepage only
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
    (block) => (block.includes('"SoftwareApplication"') ? "" : block)
  );

  // Page-specific structured data (blog posts)
  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    html = html.replace(
      "</head>",
      () => `<script type="application/ld+json">${json}</script></head>`
    );
  }

  // Static H1 + intro + body inside #root (React replaces it on mount)
  const intro = meta.intro ? `<p>${esc(meta.intro)}</p>` : "";
  const body = meta.bodyHtml || "";
  const staticMain = `<div id="root"><main style="${MAIN_STYLE}"><h1>${esc(h1)}</h1>${intro}${body}</main></div>`;
  html = html.replace(/<div id="root"><\/div>/, () => staticMain);

  return html;
}

function main() {
  const templatePath = path.join(DIST, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("[prerender] dist/index.html not found. Did vite build run?");
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, "utf8");

  loadBlog();
  loadGlossary();
  loadChains();

  const routes = new Set([
    ...readSitemapPaths(),
    ...Object.keys(PAGES),
    ...Object.keys(DYNAMIC),
  ]);
  routes.delete("/");

  let count = 0;
  for (const route of routes) {
    const outDir = path.join(DIST, route);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), buildPage(template, route));
    count++;
  }
  console.log(`[prerender] wrote ${count} pages`);
}

main();
