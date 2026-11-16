import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type User } from "@supabase/supabase-js";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    EMAIL_REGEX.test(normalized)
  );
}

function base64urlToUint8Array(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url public key");
  }

  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

// Supabase Auth Admin API lookup.
// Pagination is necessary because listUsers() does not return every user
// in a single request.
async function findUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
): Promise<User | null> {
  const targetEmail = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];

    const match = users.find(
      (candidate: User) =>
        candidate.email?.toLowerCase() === targetEmail,
    );

    if (match) return match;

    if (users.length < perPage) break;
  }

  return null;
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

    let body: {
      action?: string;
      email?: string;
      credential?: AuthenticationResponseJSON;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    if (body.action === "start") {
      if (!validateEmail(body.email)) {
        return jsonResponse(
          { error: "Invalid email format" },
          400,
          corsHeaders,
        );
      }

      const user = await findUserByEmail(supabaseAdmin, body.email);

      // Return the same response for an unknown user and an account
      // without a registered passkey.
      const notFoundResponse = () =>
        jsonResponse(
          { error: "No passkey found for this email" },
          404,
          corsHeaders,
        );

      if (!user) {
        return notFoundResponse();
      }

      const { data: credentials, error: credentialsError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .select("credential_id")
          .eq("user_id", user.id);

      if (credentialsError) {
        console.error("Could not load passkey credentials");

        return jsonResponse(
          { error: "Failed to start authentication" },
          500,
          corsHeaders,
        );
      }

      if (!credentials?.length) {
        return notFoundResponse();
      }

      const rpID = new URL(origin).hostname;

      const options = await generateAuthenticationOptions({
        rpID,
        timeout: 60000,
        userVerification: "required",
        allowCredentials: credentials.map(
          (credential: { credential_id: string }) => ({
            id: credential.credential_id,
          }),
        ),
      });

      // Remove any earlier unfinished authentication challenge.
      const { error: deleteError } = await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("purpose", "authentication");

      if (deleteError) {
        console.error("Could not clear previous authentication challenge");

        return jsonResponse(
          { error: "Failed to start authentication" },
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
          purpose: "authentication",
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Could not save authentication challenge");

        return jsonResponse(
          { error: "Failed to start authentication" },
          500,
          corsHeaders,
        );
      }

      // Do not return the user's internal UUID.
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
      if (
        !validateEmail(body.email) ||
        !body.credential ||
        typeof body.credential.id !== "string" ||
        !body.credential.id ||
        typeof body.credential.rawId !== "string" ||
        body.credential.type !== "public-key" ||
        !body.credential.response
      ) {
        return jsonResponse(
          { error: "Invalid authentication request" },
          400,
          corsHeaders,
        );
      }

      const user = await findUserByEmail(supabaseAdmin, body.email);

      if (!user || !user.email) {
        return jsonResponse(
          { error: "Authentication failed" },
          401,
          corsHeaders,
        );
      }

      const credential = body.credential;

      const { data: storedCredential, error: credentialError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .select("id, credential_id, public_key, counter")
          .eq("credential_id", credential.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (credentialError || !storedCredential) {
        return jsonResponse(
          { error: "Authentication failed" },
          401,
          corsHeaders,
        );
      }

      const { data: challengeRow, error: challengeError } =
        await supabaseAdmin
          .from("passkey_challenges")
          .select("id, challenge")
          .eq("user_id", user.id)
          .eq("purpose", "authentication")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (challengeError || !challengeRow) {
        return jsonResponse(
          {
            error: "Authentication session expired. Please try again.",
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
        console.error("Could not consume authentication challenge");

        return jsonResponse(
          { error: "Authentication failed" },
          500,
          corsHeaders,
        );
      }

      const rpID = new URL(origin).hostname;

      let verification;

      try {
        verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: storedCredential.credential_id,
            publicKey: base64urlToUint8Array(
              storedCredential.public_key,
            ),
            counter: Number(storedCredential.counter),
          },
        });
      } catch (error) {
        console.error(
          "Passkey authentication verification failed:",
          error instanceof Error ? error.message : "Unknown error",
        );

        return jsonResponse(
          { error: "Passkey verification failed" },
          401,
          corsHeaders,
        );
      }

      if (!verification.verified) {
        return jsonResponse(
          { error: "Passkey verification failed" },
          401,
          corsHeaders,
        );
      }

      // Update the authenticator counter only if it has not changed
      // since it was read. This prevents concurrent requests from
      // silently overwriting a newer counter.
      const { data: updatedCredential, error: updateError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .update({
            counter: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", storedCredential.id)
          .eq("counter", storedCredential.counter)
          .select("id")
          .maybeSingle();

      if (updateError || !updatedCredential) {
        console.error("Could not update passkey counter");

        return jsonResponse(
          { error: "Authentication failed. Please try again." },
          401,
          corsHeaders,
        );
      }

      // Create a one-time Supabase magic-link token.
      // The frontend exchanges the hashed token using verifyOtp().
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: user.email,
          options: {
            redirectTo: origin,
          },
        });

      if (sessionError) {
        console.error("Could not create Supabase sign-in token");

        return jsonResponse(
          { error: "Failed to create sign-in session" },
          500,
          corsHeaders,
        );
      }

      const hashedToken = sessionData.properties?.hashed_token;

      if (!hashedToken) {
        console.error("Supabase did not return a hashed magic-link token");

        return jsonResponse(
          { error: "Failed to create sign-in session" },
          500,
          corsHeaders,
        );
      }

      return jsonResponse(
        {
          success: true,
          token: hashedToken,
        },
        200,
        corsHeaders,
      );
    }

    return jsonResponse({ error: "Invalid action" }, 400, corsHeaders);
  } catch (error) {
    console.error(
      "[passkey-authenticate] Internal error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Authentication failed. Please try again." },
      500,
      corsHeaders,
    );
  }
});