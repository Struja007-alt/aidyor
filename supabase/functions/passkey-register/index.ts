import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";

const PROD_ORIGINS = [
  'https://aidyor.app',
  'https://www.aidyor.app',
];
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
];
// Localhost origins are only accepted if the secret ALLOW_LOCALHOST_ORIGINS=true is set.
const ALLOWED_ORIGINS = Deno.env.get('ALLOW_LOCALHOST_ORIGINS') === 'true'
  ? [...PROD_ORIGINS, ...DEV_ORIGINS]
  : PROD_ORIGINS;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: 'Email is required' };
  if (email.length > MAX_EMAIL_LENGTH) return { valid: false, error: 'Invalid email format' };
  if (!EMAIL_REGEX.test(email)) return { valid: false, error: 'Invalid email format' };
  return { valid: true };
}

function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Paginated lookup. listUsers() alone only returns the first page (50 users).
async function findUserByEmail(supabaseAdmin, email) {
  const target = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return { user: null, error };
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === target);
    if (match) return { user: match, error: null };
    if (users.length < perPage) break;
  }
  return { user: null, error: null };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!origin || !isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Invalid origin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const rpID = new URL(origin).hostname;

    const { action, email, credential } = await req.json();

    if (action === 'start') {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return new Response(JSON.stringify({ error: emailValidation.error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, error: authError } = await findUserByEmail(supabaseAdmin, email);
      if (authError) {
        console.error('Auth error:', authError);
        return new Response(JSON.stringify({ error: 'Failed to lookup user' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Same response whether the user doesn't exist or has no passkey
      const genericNotFound = () => new Response(JSON.stringify({ error: 'No passkey found for this email' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      if (!user) return genericNotFound();

      const { data: credentials, error: credError } = await supabaseAdmin
        .from('passkey_credentials')
        .select('credential_id')
        .eq('user_id', user.id);

      if (credError || !credentials?.length) return genericNotFound();

      const options = await generateAuthenticationOptions({
        rpID,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: credentials.map((cred) => ({ id: cred.credential_id })),
      });

      await supabaseAdmin.from('passkey_challenges').delete().eq('user_id', user.id).eq('purpose', 'authentication');

      const { error: challengeInsertError } = await supabaseAdmin
        .from('passkey_challenges')
        .insert({ user_id: user.id, challenge: options.challenge, purpose: 'authentication' });

      if (challengeInsertError) {
        console.error('Challenge insert error:', challengeInsertError);
        return new Response(JSON.stringify({ error: 'Failed to start authentication' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('Generated authentication options for user:', user.id);

      // userId intentionally NOT returned (avoids leaking user UUIDs)
      return new Response(JSON.stringify({ options, challenge: options.challenge }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'complete') {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid || !credential?.id) {
        return new Response(JSON.stringify({ error: 'Missing credential data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, error: authError } = await findUserByEmail(supabaseAdmin, email);
      if (authError) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: storedCred, error: credError } = await supabaseAdmin
        .from('passkey_credentials')
        .select('*')
        .eq('credential_id', credential.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (credError || !storedCred) {
        console.error('Credential not found for user:', user.id);
        return new Response(JSON.stringify({ error: 'Invalid passkey' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: challengeRow, error: challengeFetchError } = await supabaseAdmin
        .from('passkey_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeFetchError || !challengeRow) {
        return new Response(JSON.stringify({ error: 'Authentication session expired. Please try again.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Single-use: consume the challenge BEFORE verifying, so a failed attempt burns it too
      await supabaseAdmin.from('passkey_challenges').delete().eq('id', challengeRow.id);

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: storedCred.credential_id,
            publicKey: base64urlToUint8Array(storedCred.public_key),
            counter: Number(storedCred.counter),
          },
        });
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        return new Response(JSON.stringify({ error: 'Passkey verification failed' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!verification.verified) {
        return new Response(JSON.stringify({ error: 'Passkey verification failed' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await supabaseAdmin
        .from('passkey_credentials')
        .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
        .eq('id', storedCred.id);

      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
        options: { redirectTo: origin || undefined },
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return new Response(JSON.stringify({ error: 'Failed to create session' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('Passkey authentication successful for user:', user.id);

      const hashedToken = sessionData.properties?.hashed_token;

      if (!hashedToken) {
        console.error('No hashed_token in generateLink response');
        return new Response(JSON.stringify({ error: 'Failed to create session' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, token: hashedToken }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Internal] Passkey authentication error:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
