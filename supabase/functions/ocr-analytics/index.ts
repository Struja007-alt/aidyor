import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRAnalyticsPayload {
  method: 'vlm' | 'tesseract' | 'vlm_fallback_tesseract';
  vlm_attempted: boolean;
  vlm_succeeded: boolean;
  tesseract_attempted: boolean;
  tesseract_succeeded: boolean;
  addresses_found: number;
  addresses_validated: number;
  processing_time_ms: number;
  image_size_bytes?: number;
  ground_truth_address?: string;
  extracted_address?: string;
  error_type?: string;
  error_message?: string;
  // Enhanced metrics
  confidence?: number;
  char_count?: number;
  raw_text_length?: number;
  fix_applied?: boolean;
}

// Calculate Levenshtein distance for CER
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Calculate Character Error Rate
function calculateCER(extracted: string, groundTruth: string): number {
  if (!groundTruth || groundTruth.length === 0) return 0;
  const distance = levenshteinDistance(extracted.toLowerCase(), groundTruth.toLowerCase());
  return Math.min(1, distance / groundTruth.length);
}

// Calculate Word Error Rate (treat address as single word)
function calculateWER(extracted: string, groundTruth: string): number {
  if (!groundTruth) return 0;
  // For addresses, WER is essentially 0 or 1 (exact match or not)
  return extracted.toLowerCase() === groundTruth.toLowerCase() ? 0 : 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: OCRAnalyticsPayload = await req.json();
    
    console.log("[ocr-analytics] Logging OCR metrics:", {
      method: payload.method,
      addresses_found: payload.addresses_found,
      processing_time_ms: payload.processing_time_ms,
      confidence: payload.confidence,
      fix_applied: payload.fix_applied,
    });

    // Calculate accuracy metrics if ground truth provided
    let cer: number | null = null;
    let wer: number | null = null;
    let exactMatch: boolean | null = null;
    
    if (payload.ground_truth_address && payload.extracted_address) {
      cer = calculateCER(payload.extracted_address, payload.ground_truth_address);
      wer = calculateWER(payload.extracted_address, payload.ground_truth_address);
      exactMatch = payload.extracted_address.toLowerCase() === payload.ground_truth_address.toLowerCase();
      
      console.log("[ocr-analytics] Accuracy metrics:", { cer, wer, exactMatch });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('ocr_analytics').insert({
      method: payload.method,
      vlm_attempted: payload.vlm_attempted,
      vlm_succeeded: payload.vlm_succeeded,
      tesseract_attempted: payload.tesseract_attempted,
      tesseract_succeeded: payload.tesseract_succeeded,
      addresses_found: payload.addresses_found,
      addresses_validated: payload.addresses_validated,
      processing_time_ms: payload.processing_time_ms,
      image_size_bytes: payload.image_size_bytes || null,
      ground_truth_address: payload.ground_truth_address || null,
      extracted_address: payload.extracted_address || null,
      cer: cer,
      wer: wer,
      exact_match: exactMatch,
      error_type: payload.error_type || null,
      error_message: payload.error_message || null,
      // Enhanced metrics
      confidence: payload.confidence || null,
      char_count: payload.char_count || null,
      raw_text_length: payload.raw_text_length || null,
      fix_applied: payload.fix_applied || false,
    });

    if (error) {
      console.error("[ocr-analytics] Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log analytics" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ocr-analytics] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
