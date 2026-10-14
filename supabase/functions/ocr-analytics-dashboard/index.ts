import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Comma-separated list of admin emails, set as a Supabase secret.
// If unset, nobody is admin (fail closed).
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAIL") ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function corsFor(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

interface Row {
  created_at: string;
  method: string;
  vlm_attempted: boolean;
  vlm_succeeded: boolean;
  tesseract_attempted: boolean;
  tesseract_succeeded: boolean;
  fix_applied: boolean;
  exact_match: boolean | null;
  addresses_found: number | null;
  addresses_validated: number | null;
  processing_time_ms: number | null;
  confidence: number | null;
  cer: number | null;
  error_type: string | null;
}

const COLUMNS =
  "created_at,method,vlm_attempted,vlm_succeeded,tesseract_attempted,tesseract_succeeded," +
  "fix_applied,exact_match,addresses_found,addresses_validated,processing_time_ms,confidence,cer,error_type";

const PAGE_SIZE = 1000; // Supabase caps a single response at 1000 rows
const MAX_PAGES = 50;   // hard ceiling: 50,000 rows

serve(async (req) => {
  const cors = corsFor(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // ----- Admin-only auth check -----
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const user = userData.user;
    const email = (user.email ?? "").toLowerCase();
    const isAdmin =
      ADMIN_EMAILS.length > 0 &&
      ADMIN_EMAILS.includes(email) &&
      Boolean(user.email_confirmed_at);

    if (!isAdmin) {
      if (ADMIN_EMAILS.length === 0) {
        console.error("[ocr-analytics-dashboard] ADMIN_EMAIL secret is not configured");
      }
      return json({ error: "Forbidden" }, 403);
    }

    // ----- Parameters -----
    const url = new URL(req.url);
    const parsedDays = parseInt(url.searchParams.get("days") || "30", 10);
    const days = Math.min(Math.max(Number.isFinite(parsedDays) ? parsedDays : 30, 1), 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ----- Fetch all rows (paginated) -----
    let data: Row[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const { data: chunk, error } = await supabase
        .from("ocr_analytics")
        .select(COLUMNS)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[ocr-analytics-dashboard] Query error:", error);
        return json({ error: "Failed to fetch analytics" }, 500);
      }

      data = data.concat((chunk ?? []) as unknown as Row[]);
      if (!chunk || chunk.length < PAGE_SIZE) break;
    }

    // ----- Summary metrics -----
    const totalScans = data.length;
    const vlmAttempts = data.filter((d) => d.vlm_attempted).length;
    const vlmSuccesses = data.filter((d) => d.vlm_succeeded).length;
    const tesseractAttempts = data.filter((d) => d.tesseract_attempted).length;
    const tesseractSuccesses = data.filter((d) => d.tesseract_succeeded).length;
    const correctionsApplied = data.filter((d) => d.fix_applied).length;

    // Exact match is only measurable on rows that have ground truth
    const comparable = data.filter((d) => d.exact_match !== null && d.exact_match !== undefined);
    const exactMatches = comparable.filter((d) => d.exact_match === true).length;

    const totalAddressesFound = data.reduce((s, d) => s + (d.addresses_found || 0), 0);
    const totalAddressesValidated = data.reduce((s, d) => s + (d.addresses_validated || 0), 0);

    const avgProcessingTime = totalScans > 0
      ? data.reduce((s, d) => s + (d.processing_time_ms || 0), 0) / totalScans
      : 0;

    const confidenceData = data.filter((d) => d.confidence !== null && d.confidence !== undefined);
    const avgConfidence = confidenceData.length > 0
      ? confidenceData.reduce((s, d) => s + (d.confidence || 0), 0) / confidenceData.length
      : 0;

    const cerData = data.filter((d) => d.cer !== null && d.cer !== undefined);
    const avgCER = cerData.length > 0
      ? cerData.reduce((s, d) => s + (d.cer || 0), 0) / cerData.length
      : 0;

    // ----- Daily time series -----
    const dailyStats: Record<string, {
      date: string; scans: number; vlmSuccess: number; tesseractSuccess: number;
      corrections: number; avgConfidence: number; exactMatches: number;
    }> = {};
    const dailyConfCount: Record<string, number> = {};

    data.forEach((d) => {
      const date = new Date(d.created_at).toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date, scans: 0, vlmSuccess: 0, tesseractSuccess: 0,
          corrections: 0, avgConfidence: 0, exactMatches: 0,
        };
        dailyConfCount[date] = 0;
      }
      dailyStats[date].scans++;
      if (d.vlm_succeeded) dailyStats[date].vlmSuccess++;
      if (d.tesseract_succeeded) dailyStats[date].tesseractSuccess++;
      if (d.fix_applied) dailyStats[date].corrections++;
      if (d.exact_match) dailyStats[date].exactMatches++;
      if (d.confidence !== null && d.confidence !== undefined) {
        dailyStats[date].avgConfidence += d.confidence;
        dailyConfCount[date]++;
      }
    });

    Object.keys(dailyStats).forEach((date) => {
      const n = dailyConfCount[date];
      dailyStats[date].avgConfidence = n > 0 ? dailyStats[date].avgConfidence / n : 0;
    });

    // ----- Distributions -----
    const methodDistribution = {
      vlm: data.filter((d) => d.method === "vlm").length,
      tesseract: data.filter((d) => d.method === "tesseract").length,
      vlm_fallback_tesseract: data.filter((d) => d.method === "vlm_fallback_tesseract").length,
    };

    const confidenceBuckets: Record<string, number> = {
      "0-0.2": 0, "0.2-0.4": 0, "0.4-0.6": 0, "0.6-0.8": 0, "0.8-1.0": 0,
    };
    confidenceData.forEach((d) => {
      const c = d.confidence || 0;
      if (c <= 0.2) confidenceBuckets["0-0.2"]++;
      else if (c <= 0.4) confidenceBuckets["0.2-0.4"]++;
      else if (c <= 0.6) confidenceBuckets["0.4-0.6"]++;
      else if (c <= 0.8) confidenceBuckets["0.6-0.8"]++;
      else confidenceBuckets["0.8-1.0"]++;
    });

    const errorTypes: Record<string, number> = {};
    data.filter((d) => d.error_type).forEach((d) => {
      const t = d.error_type!;
      errorTypes[t] = (errorTypes[t] || 0) + 1;
    });

    return json({
      summary: {
        totalScans,
        vlmSuccessRate: vlmAttempts > 0 ? (vlmSuccesses / vlmAttempts) * 100 : 0,
        tesseractSuccessRate: tesseractAttempts > 0 ? (tesseractSuccesses / tesseractAttempts) * 100 : 0,
        correctionRate: totalScans > 0 ? (correctionsApplied / totalScans) * 100 : 0,
        exactMatchRate: comparable.length > 0 ? (exactMatches / comparable.length) * 100 : 0,
        avgProcessingTime: Math.round(avgProcessingTime),
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgCER: Math.round(avgCER * 1000) / 1000,
        totalAddressesFound,
        totalAddressesValidated,
        validationRate: totalAddressesFound > 0 ? (totalAddressesValidated / totalAddressesFound) * 100 : 0,
      },
      timeSeries: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      methodDistribution,
      confidenceDistribution: Object.entries(confidenceBuckets).map(([range, count]) => ({ range, count })),
      errorTypes: Object.entries(errorTypes).map(([type, count]) => ({ type, count })),
      periodDays: days,
    });
  } catch (error) {
    console.error("[ocr-analytics-dashboard] Error:", error);
    return json({ error: "Internal error" }, 500);
  }
});