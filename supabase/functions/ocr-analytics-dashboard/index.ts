import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get date range from query params (default last 30 days)
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all analytics data within range
    const { data: rawData, error } = await supabase
      .from('ocr_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ocr-analytics-dashboard] Query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = rawData || [];

    // Calculate summary metrics
    const totalScans = data.length;
    const vlmAttempts = data.filter(d => d.vlm_attempted).length;
    const vlmSuccesses = data.filter(d => d.vlm_succeeded).length;
    const tesseractAttempts = data.filter(d => d.tesseract_attempted).length;
    const tesseractSuccesses = data.filter(d => d.tesseract_succeeded).length;
    const correctionsApplied = data.filter(d => d.fix_applied).length;
    const exactMatches = data.filter(d => d.exact_match === true).length;
    const totalAddressesFound = data.reduce((sum, d) => sum + (d.addresses_found || 0), 0);
    const totalAddressesValidated = data.reduce((sum, d) => sum + (d.addresses_validated || 0), 0);

    // Calculate average metrics
    const avgProcessingTime = data.length > 0
      ? data.reduce((sum, d) => sum + (d.processing_time_ms || 0), 0) / data.length
      : 0;
    
    const confidenceData = data.filter(d => d.confidence !== null);
    const avgConfidence = confidenceData.length > 0
      ? confidenceData.reduce((sum, d) => sum + (d.confidence || 0), 0) / confidenceData.length
      : 0;

    const cerData = data.filter(d => d.cer !== null);
    const avgCER = cerData.length > 0
      ? cerData.reduce((sum, d) => sum + (d.cer || 0), 0) / cerData.length
      : 0;

    // Group by day for time series
    const dailyStats: Record<string, {
      date: string;
      scans: number;
      vlmSuccess: number;
      tesseractSuccess: number;
      corrections: number;
      avgConfidence: number;
      exactMatches: number;
    }> = {};

    data.forEach(d => {
      const date = new Date(d.created_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          scans: 0,
          vlmSuccess: 0,
          tesseractSuccess: 0,
          corrections: 0,
          avgConfidence: 0,
          exactMatches: 0,
        };
      }
      dailyStats[date].scans++;
      if (d.vlm_succeeded) dailyStats[date].vlmSuccess++;
      if (d.tesseract_succeeded) dailyStats[date].tesseractSuccess++;
      if (d.fix_applied) dailyStats[date].corrections++;
      if (d.exact_match) dailyStats[date].exactMatches++;
      if (d.confidence) dailyStats[date].avgConfidence += d.confidence;
    });

    // Calculate daily averages
    Object.keys(dailyStats).forEach(date => {
      const dayData = dailyStats[date];
      if (dayData.scans > 0) {
        dayData.avgConfidence = dayData.avgConfidence / dayData.scans;
      }
    });

    // Method distribution
    const methodDistribution = {
      vlm: data.filter(d => d.method === 'vlm').length,
      tesseract: data.filter(d => d.method === 'tesseract').length,
      vlm_fallback_tesseract: data.filter(d => d.method === 'vlm_fallback_tesseract').length,
    };

    // Confidence score distribution (buckets)
    const confidenceBuckets = {
      '0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0,
    };

    confidenceData.forEach(d => {
      const conf = d.confidence || 0;
      if (conf <= 0.2) confidenceBuckets['0-0.2']++;
      else if (conf <= 0.4) confidenceBuckets['0.2-0.4']++;
      else if (conf <= 0.6) confidenceBuckets['0.4-0.6']++;
      else if (conf <= 0.8) confidenceBuckets['0.6-0.8']++;
      else confidenceBuckets['0.8-1.0']++;
    });

    // Error type distribution
    const errorTypes: Record<string, number> = {};
    data.filter(d => d.error_type).forEach(d => {
      const type = d.error_type!;
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    const response = {
      summary: {
        totalScans,
        vlmSuccessRate: vlmAttempts > 0 ? (vlmSuccesses / vlmAttempts) * 100 : 0,
        tesseractSuccessRate: tesseractAttempts > 0 ? (tesseractSuccesses / tesseractAttempts) * 100 : 0,
        correctionRate: totalScans > 0 ? (correctionsApplied / totalScans) * 100 : 0,
        exactMatchRate: totalScans > 0 ? (exactMatches / totalScans) * 100 : 0,
        avgProcessingTime: Math.round(avgProcessingTime),
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgCER: Math.round(avgCER * 1000) / 1000,
        totalAddressesFound,
        totalAddressesValidated,
        validationRate: totalAddressesFound > 0 
          ? (totalAddressesValidated / totalAddressesFound) * 100 
          : 0,
      },
      timeSeries: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      methodDistribution,
      confidenceDistribution: Object.entries(confidenceBuckets).map(([range, count]) => ({
        range,
        count,
      })),
      errorTypes: Object.entries(errorTypes).map(([type, count]) => ({
        type,
        count,
      })),
      periodDays: days,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ocr-analytics-dashboard] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
