import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

// ---------- CORS ----------
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) return true;
  return false;
}
function corsFor(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ---------- Chain map (Etherscan V2 multichain) ----------
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  eth: 1,
  bsc: 56,
  bnb: 56,
  polygon: 137,
  matic: 137,
  arbitrum: 42161,
  base: 8453,
  avalanche: 43114,
  avax: 43114,
  optimism: 10,
  op: 10,
  fantom: 250,
  ftm: 250,
};

const SOLANA_KEYS = new Set(['solana', 'sol']);
const UNSUPPORTED = new Set(['bitcoin', 'btc', 'cosmos', 'atom']);

// ---------- Static vuln patterns ----------
interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  remediation: string;
  line?: number;
  snippet?: string;
}

const STATIC_PATTERNS: Array<{
  id: string; title: string; severity: Finding['severity']; category: string;
  regex: RegExp; description: string; remediation: string;
}> = [
  {
    id: 'tx-origin', title: 'Use of tx.origin for authorization',
    severity: 'high', category: 'Access Control',
    regex: /\btx\.origin\b/g,
    description: 'tx.origin can be spoofed via phishing contracts and should never be used for authentication.',
    remediation: 'Use msg.sender instead of tx.origin for authorization checks.',
  },
  {
    id: 'delegatecall', title: 'Unrestricted delegatecall',
    severity: 'critical', category: 'Code Injection',
    regex: /\.delegatecall\s*\(/g,
    description: 'delegatecall executes external code in the current contract context — if the target is user-controlled, full storage takeover is possible.',
    remediation: 'Restrict delegatecall targets to a hardcoded allow-list and never pass user-supplied addresses.',
  },
  {
    id: 'selfdestruct', title: 'selfdestruct present in contract',
    severity: 'high', category: 'Rug Pull',
    regex: /\bselfdestruct\s*\(|\bsuicide\s*\(/g,
    description: 'selfdestruct can permanently destroy the contract and forward all funds to an arbitrary address.',
    remediation: 'Remove selfdestruct, or restrict it behind a timelocked, multisig-controlled function.',
  },
  {
    id: 'low-level-call', title: 'Low-level .call without return-value check',
    severity: 'medium', category: 'Error Handling',
    regex: /\.call\s*\{[^}]*\}\s*\(|\.call\s*\(/g,
    description: 'Raw .call() returns a boolean that must be checked; ignoring it can hide failed transfers.',
    remediation: 'Always check the bool returned by .call() and revert on failure.',
  },
  {
    id: 'block-randomness', title: 'Weak randomness from block properties',
    severity: 'high', category: 'Randomness',
    regex: /\b(block\.timestamp|block\.difficulty|block\.prevrandao|blockhash)\b/g,
    description: 'Miners/validators can influence block.timestamp, blockhash, and prevrandao — unsafe for randomness.',
    remediation: 'Use Chainlink VRF or a commit-reveal scheme for on-chain randomness.',
  },
  {
    id: 'reentrancy-pattern', title: 'Potential reentrancy (external call before state update)',
    severity: 'critical', category: 'Reentrancy',
    regex: /\.call\s*\{value:[^}]*\}|\.transfer\s*\(|\.send\s*\(/g,
    description: 'Sending ETH before updating internal state opens the Checks-Effects-Interactions pattern to reentrancy.',
    remediation: 'Apply Checks-Effects-Interactions or use OpenZeppelin ReentrancyGuard (nonReentrant modifier).',
  },
  {
    id: 'floating-pragma', title: 'Floating compiler pragma',
    severity: 'low', category: 'Best Practice',
    regex: /pragma\s+solidity\s+\^/g,
    description: 'Caret pragmas (^0.8.0) let the contract compile on multiple compiler versions, risking subtle behavior differences.',
    remediation: 'Lock to one Solidity version (e.g. pragma solidity 0.8.24;).',
  },
  {
    id: 'old-solc', title: 'Outdated Solidity version (<0.8.0)',
    severity: 'high', category: 'Integer Overflow',
    regex: /pragma\s+solidity\s+[^;]*0\.[0-7]\./g,
    description: 'Solidity <0.8 lacks built-in overflow checks — arithmetic can silently wrap around.',
    remediation: 'Upgrade to Solidity 0.8.x or use OpenZeppelin SafeMath everywhere.',
  },
  {
    id: 'hidden-mint', title: 'Mint function detected',
    severity: 'medium', category: 'Tokenomics',
    regex: /function\s+(_?mint|mintTo|mintFor)\s*\(/g,
    description: 'Public/owner mint functions allow arbitrary supply inflation and dilution of holders.',
    remediation: 'Renounce ownership, cap max supply, or move minting behind a timelock + multisig.',
  },
  {
    id: 'blacklist', title: 'Blacklist / blocklist mechanism',
    severity: 'high', category: 'Honeypot',
    regex: /\b(blacklist|blocklist|isBlocked|_isExcluded|banned)\b/gi,
    description: 'Blacklist mappings let the owner freeze arbitrary wallets — common honeypot mechanism.',
    remediation: 'Remove blacklist logic or document it transparently and renounce ownership.',
  },
  {
    id: 'fee-update', title: 'Owner can change buy/sell fees',
    severity: 'high', category: 'Tax Rug',
    regex: /function\s+set(Buy|Sell|Tax|Fee)[A-Za-z]*\s*\(/g,
    description: 'Mutable tax / fee setters let the owner raise transfer tax to 100% (classic honeypot).',
    remediation: 'Cap tax in the setter (e.g. require(fee <= 10)) or renounce ownership.',
  },
  {
    id: 'unprotected-init', title: 'Initializer without onlyInitializing/initializer guard',
    severity: 'high', category: 'Access Control',
    regex: /function\s+initialize\s*\([^)]*\)\s*(public|external)(?![^{]*initializer)/g,
    description: 'Proxy initializers without an initializer modifier can be re-called by anyone, hijacking ownership.',
    remediation: 'Use OpenZeppelin Initializable + initializer modifier on all init functions.',
  },
];

function runStaticAnalysis(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');
  for (const p of STATIC_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(p.regex.source, p.regex.flags);
    let count = 0;
    while ((match = re.exec(source)) !== null && count < 3) {
      const lineNum = source.slice(0, match.index).split('\n').length;
      const snippet = lines[lineNum - 1]?.trim().slice(0, 200);
      findings.push({
        id: `${p.id}-${count}`, title: p.title, severity: p.severity,
        category: p.category, description: p.description, remediation: p.remediation,
        line: lineNum, snippet,
      });
      count++;
    }
  }
  return findings;
}

// ---------- Etherscan V2 source fetch ----------
async function fetchEvmSource(chainId: number, address: string): Promise<{ source: string; name: string; compiler: string } | null> {
  const key = Deno.env.get('ETHERSCAN_API_KEY') ?? '';
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}${key ? `&apikey=${key}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const entry = json?.result?.[0];
  if (!entry || !entry.SourceCode || entry.SourceCode === '') return null;
  // SourceCode can be plain string OR a `{{...}}` JSON of multi-file project
  let source = entry.SourceCode as string;
  if (source.startsWith('{{') && source.endsWith('}}')) {
    try {
      const obj = JSON.parse(source.slice(1, -1));
      source = Object.values(obj.sources ?? {}).map((f: any) => f.content ?? '').join('\n\n');
    } catch { /* keep raw */ }
  } else if (source.startsWith('{') && source.endsWith('}')) {
    try {
      const obj = JSON.parse(source);
      if (obj.sources) source = Object.values(obj.sources).map((f: any) => f.content ?? '').join('\n\n');
    } catch { /* keep raw */ }
  }
  return { source, name: entry.ContractName ?? 'Unknown', compiler: entry.CompilerVersion ?? 'Unknown' };
}

// ---------- AI deep audit ----------
async function aiAudit(source: string, chainLabel: string): Promise<{ findings: Finding[]; summary: string } | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;
  // Trim very long sources to keep latency reasonable
  const trimmed = source.length > 60_000 ? source.slice(0, 60_000) + '\n\n/* …source truncated for analysis… */' : source;
  const prompt = `You are a senior smart-contract security auditor. Review the following ${chainLabel} contract source and report critical, exploitable bugs.

Focus on: reentrancy, access control flaws, integer overflow/underflow, unchecked external calls, delegatecall abuse, randomness manipulation, front-running, denial-of-service, oracle manipulation, signature replay, proxy storage collisions, and rug-pull mechanisms (mintable supply, blacklists, mutable tax).

Return STRICT JSON only, no markdown:
{
  "summary": "<2-3 sentence overall verdict>",
  "findings": [
    {"title":"...", "severity":"critical|high|medium|low|info", "category":"...", "description":"...", "remediation":"..."}
  ]
}

CONTRACT SOURCE:
\`\`\`solidity
${trimmed}
\`\`\``;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-3.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error('[bug-scanner] AI gateway error:', res.status);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text);
    const findings: Finding[] = (parsed.findings ?? []).map((f: any, i: number) => ({
      id: `ai-${i}`,
      title: String(f.title ?? 'Issue').slice(0, 200),
      severity: ['critical','high','medium','low','info'].includes(f.severity) ? f.severity : 'info',
      category: String(f.category ?? 'AI Audit').slice(0, 60),
      description: String(f.description ?? '').slice(0, 1000),
      remediation: String(f.remediation ?? '').slice(0, 600),
    }));
    return { findings, summary: String(parsed.summary ?? '').slice(0, 600) };
  } catch (e) {
    console.error('[bug-scanner] AI parse error:', e);
    return null;
  }
}

function deriveRiskScore(findings: Finding[]): { score: number; grade: 'A'|'B'|'C'|'D'|'F'; label: string } {
  const weights = { critical: 40, high: 20, medium: 8, low: 3, info: 1 };
  let penalty = 0;
  for (const f of findings) penalty += weights[f.severity] ?? 0;
  const score = Math.max(0, 100 - penalty);
  let grade: 'A'|'B'|'C'|'D'|'F' = 'A';
  if (score < 90) grade = 'B';
  if (score < 75) grade = 'C';
  if (score < 55) grade = 'D';
  if (score < 35) grade = 'F';
  const label = score >= 75 ? 'LIKELY SAFE' : score >= 50 ? 'CAUTION' : 'DANGER';
  return { score, grade, label };
}

// ---------- Main ----------
serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsFor(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  try {
    // ----- Auth: require JWT -----
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // ----- Pro gate: must have active Pro OR Whale Pro via Stripe -----
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    let hasPro = false;
    if (stripeKey && userData.user.email) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
        if (customers.data.length > 0) {
          const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active' });
          for (const s of subs.data) {
            for (const item of s.items.data) {
              const pid = item.price.product as string;
              if (pid === PRODUCT_IDS.pro || pid === PRODUCT_IDS.whale_pro) hasPro = true;
            }
          }
        }
      } catch (e) {
        console.error('[bug-scanner] Stripe check failed:', e);
      }
    }
    if (!hasPro) {
      return new Response(JSON.stringify({
        error: 'PRO_REQUIRED',
        message: 'Smart Contract Bug Scanner is a Pro feature. Upgrade to unlock unlimited audits.',
      }), { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
// ----- Server-side scan limit (atomic, replaces bypassable client-side check) -----
    const { data: limitData, error: limitErr } = await supabase.rpc('check_and_increment_scan', {
      p_user_id: userId,
    });
    if (limitErr) {
      console.error('[bug-scanner] scan limit check failed:', limitErr);
      return new Response(JSON.stringify({ error: 'Could not verify scan limit, try again' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const limitRow = limitData?.[0];
    if (!limitRow?.allowed) {
      return new Response(JSON.stringify({
        error: 'SCAN_LIMIT_REACHED',
        message: 'You have reached your scan limit. Try again later.',
      }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    // ----- Parse body -----
    const body = await req.json();
    const address = String(body?.address ?? '').trim();
    const chain = String(body?.chain ?? 'ethereum').trim().toLowerCase();

    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Validate address format
    const isEvm = CHAIN_IDS[chain] !== undefined;
    const isSolana = SOLANA_KEYS.has(chain);
    if (UNSUPPORTED.has(chain)) {
      return new Response(JSON.stringify({
        error: 'UNSUPPORTED_CHAIN',
        message: `${chain.toUpperCase()} contracts are not yet supported by the bug scanner (no smart-contract bytecode).`,
      }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (isEvm && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({ error: 'Invalid EVM address format' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ----- Solana path: AI-only review (limited) -----
    if (isSolana) {
      return new Response(JSON.stringify({
        chain, address,
        verified: false,
        contractName: 'Solana Program',
        summary: 'Solana program source code is not publicly indexed by an Etherscan-style explorer. The bug scanner currently provides static + AI analysis only for verified EVM contracts. Use the standard token scan (RugCheck) for Solana security signals.',
        findings: [],
        riskScore: 50, grade: 'C', label: 'LIMITED ANALYSIS',
        engines: { static: false, ai: false },
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (!isEvm) {
      return new Response(JSON.stringify({
        error: 'UNSUPPORTED_CHAIN',
        message: `Unknown chain: ${chain}`,
      }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // ----- EVM path: fetch + analyze -----
    const sourceData = await fetchEvmSource(CHAIN_IDS[chain], address);
    if (!sourceData) {
      return new Response(JSON.stringify({
        chain, address,
        verified: false,
        contractName: 'Unverified',
        summary: 'Contract source is not verified on the block explorer. Unverified contracts cannot be audited statically — treat them with extreme caution.',
        findings: [{
          id: 'unverified', title: 'Contract source not verified', severity: 'high',
          category: 'Transparency',
          description: 'No verified source code was found. The bytecode could contain hidden malicious logic.',
          remediation: 'Avoid interacting until the team publishes and verifies the source on the explorer.',
        }],
        riskScore: 35, grade: 'D', label: 'DANGER',
        engines: { static: false, ai: false },
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const staticFindings = runStaticAnalysis(sourceData.source);
    const ai = await aiAudit(sourceData.source, chain);
    const allFindings = [...staticFindings, ...(ai?.findings ?? [])];
    const risk = deriveRiskScore(allFindings);

    return new Response(JSON.stringify({
      chain, address,
      verified: true,
      contractName: sourceData.name,
      compiler: sourceData.compiler,
      summary: ai?.summary ?? `Static analyzer ran ${STATIC_PATTERNS.length} pattern checks and surfaced ${staticFindings.length} potential issue(s).`,
      findings: allFindings,
      riskScore: risk.score,
      grade: risk.grade,
      label: risk.label,
      engines: { static: true, ai: !!ai },
      sourceLength: sourceData.source.length,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[bug-scanner] Internal error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});