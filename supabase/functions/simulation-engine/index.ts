import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface SimulationRequest {
  address: string;
  network: string;
  marketData: {
    price: number;
    liquidity: number;
    volume24h: number;
    change24h: number;
    txns24h?: { buys: number; sells: number };
  };
}

interface PumpDumpSignal {
  type: "pump" | "dump" | "warning";
  indicator: string;
  severity: "low" | "medium" | "high";
  value: number;
  threshold: number;
}

interface SimulationResponse {
  success: boolean;
  data?: {
    pumpDumpStatus: "pump" | "dump" | "unusual" | "normal";
    confidence: number;
    signals: PumpDumpSignal[];
    metrics: {
      priceVelocity: number;
      volumeAnomaly: number;
      buySellRatio: number;
      liquidityStress: number;
    };
    prediction: {
      shortTerm: "bullish" | "bearish" | "neutral";
      riskLevel: "low" | "medium" | "high" | "critical";
      recommendation: string;
    };
  };
  error?: string;
  timestamp: string;
}

// Address validation patterns
const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  return ADDRESS_PATTERNS.evm.test(address) || ADDRESS_PATTERNS.solana.test(address);
}

function validateMarketData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.price !== 'number') return false;
  if (typeof data.liquidity !== 'number') return false;
  if (typeof data.volume24h !== 'number') return false;
  if (typeof data.change24h !== 'number') return false;
  return true;
}

// Thresholds for pump/dump detection
const THRESHOLDS = {
  PUMP: {
    PRICE_CHANGE: 30,
    VOLUME_SPIKE: 300,
    BUY_RATIO: 3,
  },
  DUMP: {
    PRICE_CHANGE: -25,
    VOLUME_SPIKE: 200,
    SELL_RATIO: 3,
  },
  WARNING: {
    PRICE_CHANGE: 15,
    VOLUME_SPIKE: 100,
    LIQUIDITY_DRAIN: 30,
  },
};

function analyzePumpDump(marketData: SimulationRequest["marketData"]): SimulationResponse["data"] {
  const signals: PumpDumpSignal[] = [];
  let pumpScore = 0;
  let dumpScore = 0;

  const { price, liquidity, volume24h, change24h, txns24h } = marketData;

  // Calculate metrics
  const priceVelocity = change24h; // Price change velocity
  const volumeAnomaly = liquidity > 0 ? (volume24h / liquidity) * 100 : 0; // Volume relative to liquidity
  const buySellRatio = txns24h && txns24h.sells > 0 
    ? txns24h.buys / txns24h.sells 
    : txns24h?.buys || 1;
  const liquidityStress = volume24h > 0 ? (volume24h / (liquidity + 1)) * 100 : 0;

  // Analyze price velocity
  if (change24h >= THRESHOLDS.PUMP.PRICE_CHANGE) {
    signals.push({
      type: "pump",
      indicator: "Extreme Price Surge",
      severity: "high",
      value: change24h,
      threshold: THRESHOLDS.PUMP.PRICE_CHANGE,
    });
    pumpScore += 40;
  } else if (change24h >= THRESHOLDS.WARNING.PRICE_CHANGE) {
    signals.push({
      type: "warning",
      indicator: "Significant Price Increase",
      severity: "medium",
      value: change24h,
      threshold: THRESHOLDS.WARNING.PRICE_CHANGE,
    });
    pumpScore += 20;
  } else if (change24h <= THRESHOLDS.DUMP.PRICE_CHANGE) {
    signals.push({
      type: "dump",
      indicator: "Severe Price Drop",
      severity: "high",
      value: change24h,
      threshold: THRESHOLDS.DUMP.PRICE_CHANGE,
    });
    dumpScore += 40;
  } else if (change24h <= -THRESHOLDS.WARNING.PRICE_CHANGE) {
    signals.push({
      type: "warning",
      indicator: "Notable Price Decline",
      severity: "medium",
      value: change24h,
      threshold: -THRESHOLDS.WARNING.PRICE_CHANGE,
    });
    dumpScore += 20;
  }

  // Analyze volume anomaly
  if (volumeAnomaly >= THRESHOLDS.PUMP.VOLUME_SPIKE) {
    signals.push({
      type: change24h > 0 ? "pump" : "dump",
      indicator: "Extreme Volume Spike",
      severity: "high",
      value: volumeAnomaly,
      threshold: THRESHOLDS.PUMP.VOLUME_SPIKE,
    });
    if (change24h > 0) pumpScore += 30;
    else dumpScore += 30;
  } else if (volumeAnomaly >= THRESHOLDS.WARNING.VOLUME_SPIKE) {
    signals.push({
      type: "warning",
      indicator: "High Volume Activity",
      severity: "medium",
      value: volumeAnomaly,
      threshold: THRESHOLDS.WARNING.VOLUME_SPIKE,
    });
    if (change24h > 0) pumpScore += 15;
    else dumpScore += 15;
  }

  // Analyze buy/sell ratio
  if (buySellRatio >= THRESHOLDS.PUMP.BUY_RATIO) {
    signals.push({
      type: "pump",
      indicator: "Heavy Buy Pressure",
      severity: buySellRatio > 5 ? "high" : "medium",
      value: buySellRatio,
      threshold: THRESHOLDS.PUMP.BUY_RATIO,
    });
    pumpScore += 25;
  } else if (buySellRatio <= 1 / THRESHOLDS.DUMP.SELL_RATIO) {
    signals.push({
      type: "dump",
      indicator: "Heavy Sell Pressure",
      severity: buySellRatio < 0.2 ? "high" : "medium",
      value: 1 / buySellRatio,
      threshold: THRESHOLDS.DUMP.SELL_RATIO,
    });
    dumpScore += 25;
  }

  // Analyze liquidity stress
  if (liquidityStress >= THRESHOLDS.WARNING.LIQUIDITY_DRAIN) {
    signals.push({
      type: "warning",
      indicator: "Liquidity Stress",
      severity: liquidityStress > 50 ? "high" : "medium",
      value: liquidityStress,
      threshold: THRESHOLDS.WARNING.LIQUIDITY_DRAIN,
    });
    dumpScore += 15;
  }

  // Determine status
  let pumpDumpStatus: "pump" | "dump" | "unusual" | "normal" = "normal";
  let confidence = 0.5;

  if (pumpScore >= 50) {
    pumpDumpStatus = "pump";
    confidence = Math.min(0.95, 0.5 + pumpScore / 100);
  } else if (dumpScore >= 50) {
    pumpDumpStatus = "dump";
    confidence = Math.min(0.95, 0.5 + dumpScore / 100);
  } else if (pumpScore >= 25 || dumpScore >= 25 || signals.length >= 2) {
    pumpDumpStatus = "unusual";
    confidence = Math.min(0.85, 0.4 + (pumpScore + dumpScore) / 150);
  } else {
    confidence = 0.7;
  }

  // Generate prediction
  let shortTerm: "bullish" | "bearish" | "neutral" = "neutral";
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let recommendation = "No immediate concerns detected.";

  if (pumpDumpStatus === "pump") {
    shortTerm = "bullish";
    riskLevel = pumpScore > 70 ? "high" : "medium";
    recommendation = "Potential pump in progress. Consider taking profits if invested. High risk for new entries.";
  } else if (pumpDumpStatus === "dump") {
    shortTerm = "bearish";
    riskLevel = dumpScore > 70 ? "critical" : "high";
    recommendation = "Dump pattern detected. Avoid new positions. Existing holders should evaluate exit strategies.";
  } else if (pumpDumpStatus === "unusual") {
    shortTerm = change24h > 0 ? "bullish" : "bearish";
    riskLevel = "medium";
    recommendation = "Unusual activity detected. Monitor closely before making decisions.";
  } else {
    shortTerm = change24h > 5 ? "bullish" : change24h < -5 ? "bearish" : "neutral";
    riskLevel = "low";
    recommendation = "Normal market conditions. Standard due diligence recommended.";
  }

  return {
    pumpDumpStatus,
    confidence,
    signals,
    metrics: {
      priceVelocity,
      volumeAnomaly,
      buySellRatio,
      liquidityStress,
    },
    prediction: {
      shortTerm,
      riskLevel,
      recommendation,
    },
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Simulation Engine] Request from user: ${user.id}`);

    const { address, network, marketData }: SimulationRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid address format", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!marketData || !validateMarketData(marketData)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid market data format", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Simulation Engine] Analyzing: ${address} on ${network}`);

    const analysis = analyzePumpDump(marketData);

    const response: SimulationResponse = {
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    };

    if (analysis) {
      console.log(`[Simulation Engine] Result: ${analysis.pumpDumpStatus} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Simulation Engine] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred processing your request",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
