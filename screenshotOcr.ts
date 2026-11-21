/**
 * Screenshot OCR.
 *
 * Job: screenshot image in, contract addresses (with a confidence score) out.
 * Knows nothing about token scanning or the page UI. The page passes callbacks
 * for progress and analytics and decides what to do with the result.
 *
 * Order:
 *  1. AI vision (server function ocr-extract). The server checks that the
 *     address exists on-chain and scores it. 95+ means confirmed.
 *  2. Basic OCR (Tesseract) only if AI vision found nothing. Last resort,
 *     always low confidence, never meant to be auto-scanned.
 */

import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import {
  extractAddressesFromText,
  fixOcrMisreads,
  extractBestEthAddress,
  dropFragments,
} from "./extractAddresses";

/** An address with this confidence or higher was confirmed to exist on-chain. */
export const VERIFIED_CONFIDENCE = 95;

// Basic OCR cannot tell look-alike characters apart (9/o, f/t, 5/S ...), so its
// confidence is capped low on purpose.
const BASIC_OCR_CONFIDENCE = 40;
const BASIC_OCR_REPAIRED_CONFIDENCE = 30;

export interface OcrAnalyticsPayload {
  method: 'vlm' | 'tesseract' | 'vlm_fallback_tesseract';
  vlmAttempted: boolean;
  vlmSucceeded: boolean;
  tesseractAttempted: boolean;
  tesseractSucceeded: boolean;
  addressesFound: number;
  addressesValidated: number;
  processingTimeMs: number;
  imageSizeBytes?: number;
  groundTruthAddress?: string;
  extractedAddress?: string;
  errorType?: string;
  errorMessage?: string;
  confidence?: number;
  charCount?: number;
  rawTextLength?: number;
  fixApplied?: boolean;
}

export interface OcrCallbacks {
  onProgress?: (percent: number) => void;
  onStage?: (stage: string) => void;
  logAnalytics?: (data: OcrAnalyticsPayload) => void;
}

export interface OcrResult {
  addresses: string[];
  /** 0-100 per address. VERIFIED_CONFIDENCE or more = confirmed on-chain. */
  confidences: number[];
  tokenName: string | null;
  tokenSymbol: string | null;
  /** Fragments like "0x9efd...25068c" when the screenshot only shows part of an address. */
  truncatedAddresses: string[] | null;
  source: 'vlm' | 'tesseract' | 'none';
}


// ---------------------------------------------------------------------------
// AI vision (server function ocr-extract)
// ---------------------------------------------------------------------------
type VlmResult = {
  addresses: string[];
  addressConfidences: number[];
  tokenName: string | null;
  tokenSymbol: string | null;
  truncatedAddresses: string[] | null;
  limitReached?: boolean;
};

const EMPTY_VLM: VlmResult = {
  addresses: [],
  addressConfidences: [],
  tokenName: null,
  tokenSymbol: null,
  truncatedAddresses: null,
};

async function callOcrExtract(imageData: string, retryCount = 0): Promise<VlmResult> {
  const MAX_CLIENT_RETRIES = 2;
  const RETRY_DELAYS = [1500, 3000];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageBase64: imageData }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Don't retry on client errors (rate limit, payment, auth)
      if (response.status === 429) {
        const limitReached = errorData?.error === "ocr_daily_limit";
        toast.error(
          limitReached
            ? (errorData?.message || "Daily screenshot-scan limit reached. Paste the contract address instead.")
            : "AI rate limit reached. Try again in a minute."
        );
        return { ...EMPTY_VLM, limitReached };
      }
      if (response.status === 402) {
        toast.error("AI credits exhausted.");
        return EMPTY_VLM;
      }
      if (response.status === 401) {
        toast.error("Authentication required. Please sign in.");
        return EMPTY_VLM;
      }

      // Retry on server errors
      if (retryCount < MAX_CLIENT_RETRIES && response.status >= 500) {
        const delay = RETRY_DELAYS[retryCount] || 3000;
        console.warn(`[OCR] Server error ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_CLIENT_RETRIES})`);
        toast.info("AI service busy, retrying...", { duration: delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callOcrExtract(imageData, retryCount + 1);
      }

      console.error("[OCR] ocr-extract error:", response.status, errorData);
      return EMPTY_VLM;
    }

    const data = await response.json();
    return {
      addresses: data.addresses || [],
      addressConfidences: data.addressConfidences || [],
      tokenName: data.tokenName || null,
      tokenSymbol: data.tokenSymbol || null,
      truncatedAddresses: data.truncatedAddresses || null,
    };
  } catch (error) {
    // Retry on network errors (timeout, connection refused, etc.)
    if (retryCount < MAX_CLIENT_RETRIES) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const delay = RETRY_DELAYS[retryCount] || 3000;
      console.warn(`[OCR] ${isAbort ? 'Timeout' : 'Network error'}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_CLIENT_RETRIES})`);
      toast.info(isAbort ? "Request timed out, retrying..." : "Connection issue, retrying...", { duration: delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callOcrExtract(imageData, retryCount + 1);
    }

    console.error("[OCR] ocr-extract failed after retries:", error);
    return EMPTY_VLM;
  }
}

// ---------------------------------------------------------------------------
// Basic OCR (Tesseract) helpers
// ---------------------------------------------------------------------------
// Advanced image preprocessing for better OCR accuracy
const preprocessImage = async (imageData: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }

      // Upscale image for better OCR. Push small/low-res screenshots up
      // to ~1800px on the longest edge (max 3x) so Tesseract has enough
      // pixels per character, while leaving already-large images alone.
      const scale = Math.max(1, Math.min(3, 1800 / Math.max(img.width, img.height)));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      // Use high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data for processing
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Pass 1: Convert to grayscale with luminance preservation
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      // Pass 2: Adaptive contrast enhancement
      // Calculate histogram for adaptive thresholding
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        histogram[Math.round(data[i])]++;
      }

      // Find optimal threshold using Otsu's method
      const totalPixels = data.length / 4;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];

      let sumB = 0, wB = 0, wF = 0;
      let maxVariance = 0, optimalThreshold = 128;

      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
          maxVariance = variance;
          optimalThreshold = t;
        }
      }

      // Apply adaptive contrast and noise reduction
      const newImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newData = newImgData.data;

      for (let i = 0; i < newData.length; i += 4) {
        let gray = newData[i];

        // Contrast stretch based on histogram analysis
        const contrast = 1.6;
        const mid = optimalThreshold;
        gray = mid + (gray - mid) * contrast;
        gray = Math.max(0, Math.min(255, gray));

        // Apply adaptive binarization with hysteresis
        const highThresh = optimalThreshold + 30;
        const lowThresh = optimalThreshold - 30;

        let final;
        if (gray > highThresh) {
          final = 255;
        } else if (gray < lowThresh) {
          final = 0;
        } else {
          // Use local context for edge pixels
          final = gray > optimalThreshold ? 255 : 0;
        }

        newData[i] = final;
        newData[i + 1] = final;
        newData[i + 2] = final;
      }

      ctx.putImageData(newImgData, 0, 0);

      // Pass 3: Morphological operations - Dilation to connect broken characters
      const dilatedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dData = dilatedData.data;
      const width = canvas.width;

      // Simple 3x3 dilation for black pixels (text)
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          if (newData[idx] === 0) { // If black pixel
            // Check 8-connected neighbors and dilate
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                // Slight dilation - only fill very bright neighbors
                if (newData[nIdx] === 255) {
                  dData[nIdx] = 200; // Mark for potential fill
                }
              }
            }
          }
        }
      }

      // Apply dilation markers
      for (let i = 0; i < dData.length; i += 4) {
        if (dData[i] === 200) {
          dData[i] = 0;
          dData[i + 1] = 0;
          dData[i + 2] = 0;
        }
      }

      ctx.putImageData(dilatedData, 0, 0);

      // Pass 4: Sharpen edges for cleaner character boundaries
      const sharpCanvas = document.createElement('canvas');
      const sharpCtx = sharpCanvas.getContext('2d');
      if (sharpCtx) {
        sharpCanvas.width = canvas.width;
        sharpCanvas.height = canvas.height;

        // Apply subtle blur
        sharpCtx.filter = 'blur(0.5px)';
        sharpCtx.drawImage(canvas, 0, 0);

        // Blend for sharpening effect
        ctx.globalCompositeOperation = 'difference';
        ctx.globalAlpha = 0.15;
        ctx.drawImage(sharpCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }

      // Pass 5: Invert if needed (detect if text is light on dark)
      const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let blackCount = 0, whiteCount = 0;
      for (let i = 0; i < finalData.data.length; i += 4) {
        if (finalData.data[i] < 128) blackCount++;
        else whiteCount++;
      }

      // If more black than white, invert (text should be dark on light for OCR)
      if (blackCount > whiteCount * 1.5) {
        for (let i = 0; i < finalData.data.length; i += 4) {
          finalData.data[i] = 255 - finalData.data[i];
          finalData.data[i + 1] = 255 - finalData.data[i + 1];
          finalData.data[i + 2] = 255 - finalData.data[i + 2];
        }
        ctx.putImageData(finalData, 0, 0);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export async function extractFromScreenshot(
  imageData: string,
  cb: OcrCallbacks = {},
): Promise<OcrResult> {
  const progress = (n: number) => cb.onProgress?.(n);
  const stage = (s: string) => cb.onStage?.(s);

  const startTime = performance.now();
  let vlmAttempted = false;
  let vlmSucceeded = false;
  let tesseractAttempted = false;
  let tesseractSucceeded = false;
  let errorType: string | undefined;
  let errorMessage: string | undefined;
  let rawTextLength = 0;
  let charCount = 0;
  let fixApplied = false;

  const imageSizeBytes = Math.round((imageData.length * 3) / 4);

  let addresses: string[] = [];
  let confidences: number[] = [];
  let tokenName: string | null = null;
  let tokenSymbol: string | null = null;
  let truncatedAddresses: string[] | null = null;
  let limitReached = false;

  try {
    progress(0);
    stage("AI vision reading screenshot…");

    // ------------------------------------------------------------------
    // 1. AI vision: the server checks the address exists on-chain
    // ------------------------------------------------------------------
    vlmAttempted = true;
    progress(10);
    toast.info("Reading screenshot with AI vision...", { duration: 2500 });

    progress(30);
    const vlm = await callOcrExtract(imageData);
    progress(70);

    limitReached = vlm.limitReached === true;
    tokenName = vlm.tokenName;
    tokenSymbol = vlm.tokenSymbol;
    truncatedAddresses = vlm.truncatedAddresses;

    if (vlm.addresses.length > 0) {
      addresses = vlm.addresses;
      // If the server sent no scores, treat the addresses as NOT confirmed.
      confidences = vlm.addressConfidences.length === addresses.length
        ? vlm.addressConfidences
        : addresses.map(() => 60);
      vlmSucceeded = true;
      charCount = addresses.join('').length;
    }

    // ------------------------------------------------------------------
    // 2. Basic OCR: only if AI vision found no address AND no token name
    //    to search by. Low confidence, never meant to be auto-scanned.
    // ------------------------------------------------------------------
    const hasTokenInfo = !!(tokenName || tokenSymbol);
    if (addresses.length === 0 && !hasTokenInfo) {
      tesseractAttempted = true;
      progress(75);
      stage(limitReached ? "Daily AI limit reached. Using basic OCR…" : "AI vision unavailable. Using basic OCR…");
      toast.info("Using basic OCR. Results need checking.", { duration: 2500 });

      try {
        // Attempt 1: preprocessed image
        const processedImage = await preprocessImage(imageData);

        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              progress(75 + Math.round(m.progress * 15));
            }
          },
        });
        const { data: { text } } = await worker.recognize(processedImage);
        await worker.terminate();

        rawTextLength = text.length;
        const corrected = fixOcrMisreads(text);
        fixApplied = corrected.corrections > 0;
        addresses = extractAddressesFromText(corrected.text);

        // Attempt 2: original image, no preprocessing
        if (addresses.length === 0) {
          progress(92);
          stage("Retrying with original image…");

          const fallbackWorker = await createWorker('eng', 1);
          const { data: { text: fallbackText } } = await fallbackWorker.recognize(imageData);
          await fallbackWorker.terminate();

          rawTextLength = fallbackText.length;
          const fallbackCorrected = fixOcrMisreads(fallbackText);
          fixApplied = fixApplied || fallbackCorrected.corrections > 0;
          addresses = extractAddressesFromText(fallbackCorrected.text);
        }

        // Attempt 3: aggressive 0x address recovery
        if (addresses.length === 0) {
          progress(96);
          stage("Aggressive character recovery…");

          const aggressiveWorker = await createWorker('eng', 1);
          const { data: { text: rawText } } = await aggressiveWorker.recognize(processedImage);
          await aggressiveWorker.terminate();

          const best = extractBestEthAddress(rawText);
          if (best) {
            addresses = [best];
            fixApplied = true;
          }
        }

        if (addresses.length > 0) {
          const base = fixApplied ? BASIC_OCR_REPAIRED_CONFIDENCE : BASIC_OCR_CONFIDENCE;
          const cleaned = dropFragments(addresses, addresses.map(() => base));
          addresses = cleaned.addresses;
          confidences = cleaned.confidences;
          charCount = addresses.join('').length;
          tesseractSucceeded = true;
        }
      } catch (tesseractError) {
        console.error("[OCR] Tesseract failed:", tesseractError);
        errorType = 'tesseract_error';
        errorMessage = tesseractError instanceof Error ? tesseractError.message : 'Tesseract failed';
      }

      if (tesseractSucceeded) {
        toast.warning("Basic OCR often misreads characters. Check the address carefully before scanning.", { duration: 6000 });
      }
    }

    progress(100);
    stage(addresses.length > 0 ? "Done" : "");

    const method: OcrAnalyticsPayload['method'] = vlmSucceeded
      ? 'vlm'
      : tesseractAttempted
        ? 'vlm_fallback_tesseract'
        : 'vlm';

    cb.logAnalytics?.({
      method,
      vlmAttempted,
      vlmSucceeded,
      tesseractAttempted,
      tesseractSucceeded,
      addressesFound: addresses.length,
      addressesValidated: addresses.length,
      processingTimeMs: Math.round(performance.now() - startTime),
      imageSizeBytes,
      extractedAddress: addresses[0],
      errorType,
      errorMessage,
      // stored as a 0-1 fraction, which is what the analytics dashboard expects
      confidence: addresses.length > 0 ? (confidences[0] ?? 0) / 100 : 0,
      charCount,
      rawTextLength: rawTextLength > 0 ? rawTextLength : undefined,
      fixApplied,
    });

    return {
      addresses,
      confidences,
      tokenName,
      tokenSymbol,
      truncatedAddresses,
      source: vlmSucceeded ? 'vlm' : tesseractSucceeded ? 'tesseract' : 'none',
    };
  } catch (error) {
    cb.logAnalytics?.({
      method: vlmAttempted ? 'vlm' : 'tesseract',
      vlmAttempted,
      vlmSucceeded,
      tesseractAttempted,
      tesseractSucceeded,
      addressesFound: 0,
      addressesValidated: 0,
      processingTimeMs: Math.round(performance.now() - startTime),
      imageSizeBytes,
      errorType: 'ocr_exception',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      confidence: 0,
      charCount: 0,
      fixApplied: false,
    });
    throw error;
  }
}
