// scripts/prerender.mjs
// Runs after `vite build`. For every public URL it writes dist/<path>/index.html
// with the page's own <title>, description, canonical, OG/Twitter tags and an H1,
// so crawlers see correct data in the RAW HTML (before any JavaScript runs).

import fs from "node:fs";
import path from "node:path";

const SITE = "https://aidyor.app";
const DIST = path.resolve("dist");
const SITEMAP_CANDIDATES = [
  path.join(DIST, "sitemap.xml"),
  path.resolve("public", "sitemap.xml"),
];

// ---------------------------------------------------------------------------
// Per-page metadata. Add your important pages here (blog posts, glossary,
// chain pages). Pages NOT listed still get a self-referencing canonical,
// og:url and a title built from the URL slug, so nothing points at the homepage.
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
  // Example:
  // "/blog/what-is-a-honeypot-token": {
  //   title: "What Is a Honeypot Token? How to Detect One | AIDYOR",
  //   description: "…",
  //   h1: "What Is a Honeypot Token?",
  //   intro: "…",
  // },
};

// ---------------------------------------------------------------------------
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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

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

function buildPage(template, route) {
  const url = `${SITE}${route}`;
  const meta = PAGES[route] || {};
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

  // Static H1 + intro inside #root (React replaces it on mount)
  const intro = meta.intro ? `<p>${esc(meta.intro)}</p>` : "";
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root"><main><h1>${esc(h1)}</h1>${intro}</main></div>`
  );

  return html;
}

function main() {
  const templatePath = path.join(DIST, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("[prerender] dist/index.html not found. Did vite build run?");
    process.exit(1);
  }
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
}

main();
