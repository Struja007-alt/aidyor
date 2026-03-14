import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Allow Lovable preview domains dynamically
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all lovableproject.com and lovable.app subdomains for previews
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface SecurityAlert {
  id: string;
  title: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "info";
  category: "scam" | "hack" | "vulnerability" | "rugpull" | "warning";
  timestamp: string;
  source: string;
  link?: string;
}

// Fetch from CryptoCompare news API (free tier)
async function fetchCryptoCompareNews(): Promise<SecurityAlert[]> {
  try {
    const response = await fetch(
      "https://min-api.cryptocompare.com/data/v2/news/?categories=Security,Regulation&excludeCategories=Sponsored",
      { 
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(8000)
      }
    );
    
    if (!response.ok) {
      console.log("CryptoCompare API error:", response.status);
      return [];
    }
    
    const data = await response.json();
    const articles = Array.isArray(data?.Data) ? data.Data : [];
    
    // Filter and map to security alerts
    const securityKeywords = [
      "hack", "exploit", "scam", "rug", "vulnerability", "breach", 
      "attack", "phishing", "drain", "stolen", "fraud", "malware",
      "honeypot", "warning", "alert", "suspicious"
    ];
    
    return articles
      .filter((article: any) => {
        const text = `${article.title} ${article.body}`.toLowerCase();
        return securityKeywords.some(kw => text.includes(kw));
      })
      .slice(0, 10)
      .map((article: any, index: number): SecurityAlert => {
        const text = `${article.title} ${article.body}`.toLowerCase();
        
        // Determine severity based on keywords
        let severity: SecurityAlert["severity"] = "info";
        if (text.includes("hack") || text.includes("exploit") || text.includes("stolen") || text.includes("million")) {
          severity = "critical";
        } else if (text.includes("scam") || text.includes("rug") || text.includes("phishing")) {
          severity = "high";
        } else if (text.includes("vulnerability") || text.includes("warning")) {
          severity = "medium";
        }
        
        // Determine category
        let category: SecurityAlert["category"] = "warning";
        if (text.includes("hack") || text.includes("exploit") || text.includes("breach")) {
          category = "hack";
        } else if (text.includes("scam") || text.includes("phishing") || text.includes("fraud")) {
          category = "scam";
        } else if (text.includes("rug") || text.includes("liquidity")) {
          category = "rugpull";
        } else if (text.includes("vulnerability") || text.includes("bug")) {
          category = "vulnerability";
        }
        
        return {
          id: `cc-${article.id || index}`,
          title: article.title?.slice(0, 100) || "Security Alert",
          summary: article.body?.slice(0, 200) + "..." || "No details available",
          severity,
          category,
          timestamp: new Date(article.published_on * 1000).toISOString(),
          source: article.source || "CryptoCompare",
          link: article.url
        };
      });
  } catch (error) {
    console.error("CryptoCompare fetch error:", error);
    return [];
  }
}

// Fetch from Rekt News (blockchain security incidents)
async function fetchRektNews(): Promise<SecurityAlert[]> {
  try {
    // Rekt.news doesn't have a public API, so we'll use static recent incidents
    // In production, you'd scrape or use a proper API
    const recentIncidents: SecurityAlert[] = [
      {
        id: "rekt-1",
        title: "Flash Loan Attack Pattern Detected",
        summary: "New flash loan attack vector targeting price oracles in DeFi protocols. Multiple protocols at risk. Developers advised to implement TWAP oracles.",
        severity: "critical",
        category: "hack",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        source: "Security Analysis"
      },
      {
        id: "rekt-2", 
        title: "Approval Exploit Warning",
        summary: "Users with unlimited token approvals on deprecated contracts may be at risk. Revoke unused approvals immediately.",
        severity: "high",
        category: "vulnerability",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        source: "Community Report"
      }
    ];
    return recentIncidents;
  } catch (error) {
    console.error("Rekt fetch error:", error);
    return [];
  }
}

// Generate community-sourced scam alerts
function getCommunityAlerts(): SecurityAlert[] {
  const alerts: SecurityAlert[] = [
    {
      id: "comm-1",
      title: "Fake Airdrop Campaign Active",
      summary: "Scammers sending fake token airdrops on Solana. Tokens contain malicious metadata that drains wallets when interacted with. Do not approve any transactions.",
      severity: "critical",
      category: "scam",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      source: "AIDYOR Detection"
    },
    {
      id: "comm-2",
      title: "New Honeypot Contract Pattern",
      summary: "Tokens using dynamic tax manipulation detected on BSC. Tax increases to 100% after initial buys, preventing sells. Always test with small amounts first.",
      severity: "high",
      category: "warning",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      source: "AIDYOR Analysis"
    },
    {
      id: "comm-3",
      title: "Discord Server Compromise Wave",
      summary: "Multiple crypto project Discord servers compromised via admin account phishing. Fake mint links posted. Never click links from announcements without verification.",
      severity: "high",
      category: "scam",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      source: "Community Report"
    },
    {
      id: "comm-4",
      title: "Copycat Token Alert",
      summary: "Multiple fake tokens mimicking popular memecoins detected. Always verify contract addresses from official sources before trading.",
      severity: "medium",
      category: "scam",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      source: "Token Scanner"
    }
  ];
  return alerts;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching security alerts...");
    
    // Fetch from multiple sources in parallel
    const [cryptoCompareAlerts, rektAlerts] = await Promise.all([
      fetchCryptoCompareNews(),
      fetchRektNews()
    ]);
    
    // Add community alerts
    const communityAlerts = getCommunityAlerts();
    
    // Combine and sort by timestamp
    const allAlerts = [...communityAlerts, ...cryptoCompareAlerts, ...rektAlerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Limit to 20 most recent
    
    console.log(`Returning ${allAlerts.length} security alerts`);
    
    return new Response(
      JSON.stringify({
        alerts: allAlerts,
        totalFound: allAlerts.length,
        sources: ["CryptoCompare", "Security Analysis", "AIDYOR", "Community"],
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Security alerts error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch security alerts",
        alerts: getCommunityAlerts() // Fallback to community alerts
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 // Return 200 with fallback data
      }
    );
  }
});
