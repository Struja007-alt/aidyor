import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type User } from "@supabase/supabase-js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";

const PROD_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
];

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_ORIGINS =
  Deno.env.get("ALLOW_LOCALHOST_ORIGINS") === "true"
    ? [...PROD_ORIGINS, ...DEV_ORIGINS]
    : PROD_ORIGINS;

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin)
    ? origin
    : PROD_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;

  const normalized = email.trim();

  return (
    normalized.length > 0 &&
    normalized.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  );
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getAuthenticatedUser(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<User | null> {
  const authorization = req.headers.get("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);

  if (error || !data.user) return null;

  return data.user;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Invalid origin" }, 403, corsHeaders);
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || "0");

    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request too large" }, 413, corsHeaders);
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Registration must only be available to an authenticated account.
    const user = await getAuthenticatedUser(req, supabaseAdmin);

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const rpID = new URL(origin).hostname;

    let body: {
      action?: string;
      credential?: RegistrationResponseJSON;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    if (body.action === "start") {
      const { data: existingCredentials, error: credentialsError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .select("credential_id")
          .eq("user_id", user.id);

      if (credentialsError) {
        console.error("Could not load existing passkeys");
        return jsonResponse(
          { error: "Failed to load existing passkeys" },
          500,
          corsHeaders,
        );
      }

      const excludeCredentials = (existingCredentials || []).map(
        (credential: { credential_id: string }) => ({
          id: credential.credential_id,
        }),
      );

      const options = await generateRegistrationOptions({
        rpName: "AIDYOR",
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        userDisplayName: user.email?.split("@")[0] || "AIDYOR user",
        timeout: 60000,
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      // Remove any previous unfinished registration challenge.
      const { error: deleteError } = await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("purpose", "registration");

      if (deleteError) {
        console.error("Could not clear previous registration challenge");
        return jsonResponse(
          { error: "Failed to start passkey registration" },
          500,
          corsHeaders,
        );
      }

      const expiresAt = new Date(
        Date.now() + CHALLENGE_TTL_MS,
      ).toISOString();

      const { error: insertError } = await supabaseAdmin
        .from("passkey_challenges")
        .insert({
          user_id: user.id,
          challenge: options.challenge,
          purpose: "registration",
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Could not save registration challenge");
        return jsonResponse(
          { error: "Failed to start passkey registration" },
          500,
          corsHeaders,
        );
      }

      return jsonResponse(
        {
          options,
          challenge: options.challenge,
        },
        200,
        corsHeaders,
      );
    }

    if (body.action === "complete") {
      const credential = body.credential;

      if (
        !credential ||
        typeof credential.id !== "string" ||
        !credential.id ||
        typeof credential.rawId !== "string" ||
        credential.type !== "public-key" ||
        !credential.response
      ) {
        return jsonResponse(
          { error: "Invalid registration credential" },
          400,
          corsHeaders,
        );
      }

      const { data: challengeRow, error: challengeError } =
        await supabaseAdmin
          .from("passkey_challenges")
          .select("id, challenge")
          .eq("user_id", user.id)
          .eq("purpose", "registration")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (challengeError || !challengeRow) {
        return jsonResponse(
          {
            error: "Registration session expired. Please try again.",
          },
          400,
          corsHeaders,
        );
      }

      // Consume the challenge before verification to prevent replay.
      const { error: consumeError } = await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("id", challengeRow.id);

      if (consumeError) {
        console.error("Could not consume registration challenge");
        return jsonResponse(
          { error: "Could not complete registration" },
          500,
          corsHeaders,
        );
      }

      let verification;

      try {
        verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
        });
      } catch (error) {
        console.error(
          "Passkey registration verification failed:",
          error instanceof Error ? error.message : "Unknown error",
        );

        return jsonResponse(
          { error: "Passkey verification failed" },
          400,
          corsHeaders,
        );
      }

      if (!verification.verified || !verification.registrationInfo) {
        return jsonResponse(
          { error: "Passkey verification failed" },
          400,
          corsHeaders,
        );
      }

      const {
        credential: verifiedCredential,
        credentialDeviceType,
      } = verification.registrationInfo;

      const publicKey = uint8ArrayToBase64url(
        verifiedCredential.publicKey,
      );

      // Credential IDs are globally unique in the database.
      const { data: existingCredential, error: lookupError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .select("id")
          .eq("credential_id", verifiedCredential.id)
          .maybeSingle();

      if (lookupError) {
        console.error("Could not check for existing credential");
        return jsonResponse(
          { error: "Failed to save passkey" },
          500,
          corsHeaders,
        );
      }

      if (existingCredential) {
        return jsonResponse(
          { error: "This passkey is already registered" },
          409,
          corsHeaders,
        );
      }

      const { error: insertCredentialError } = await supabaseAdmin
        .from("passkey_credentials")
        .insert({
          user_id: user.id,
          credential_id: verifiedCredential.id,
          public_key: publicKey,
          counter: verifiedCredential.counter,
          device_type: credentialDeviceType || "platform",
        });

      if (insertCredentialError) {
        console.error("Could not save verified passkey");
        return jsonResponse(
          { error: "Failed to save passkey" },
          500,
          corsHeaders,
        );
      }

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    return jsonResponse({ error: "Invalid action" }, 400, corsHeaders);
  } catch (error) {
    console.error(
      "[passkey-register] Internal error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Registration failed. Please try again." },
      500,
      corsHeaders,
    );
  }
});