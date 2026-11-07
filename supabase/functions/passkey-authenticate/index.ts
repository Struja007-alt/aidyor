import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";

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

function uint8ArrayToBase64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!origin || !isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Invalid origin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rpID = new URL(origin).hostname;
    const { action, credential } = await req.json();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'start') {
      const { data: existingCreds } = await supabaseAdmin
        .from('passkey_credentials')
        .select('credential_id')
        .eq('user_id', user.id);

      const excludeCredentials = (existingCreds || []).map((cred) => ({
        id: cred.credential_id,
      }));

      const options = await generateRegistrationOptions({
        rpName: 'AI DYOR',
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        userDisplayName: user.email?.split('@')[0] || 'User',
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      // Clean up any stale challenges for this user + purpose, then store the new one
      await supabaseAdmin
        .from('passkey_challenges')
        .delete()
        .eq('user_id', user.id)
        .eq('purpose', 'registration');

      const { error: challengeInsertError } = await supabaseAdmin
        .from('passkey_challenges')
        .insert({
          user_id: user.id,
          challenge: options.challenge,
          purpose: 'registration',
        });

      if (challengeInsertError) {
        console.error('Challenge insert error:', challengeInsertError);
        return new Response(JSON.stringify({ error: 'Failed to start registration' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('Generated registration options for user:', user.id);

      return new Response(JSON.stringify({ options, challenge: options.challenge }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'complete') {
      if (!credential) {
        return new Response(JSON.stringify({ error: 'Missing credential' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: challengeRow, error: challengeFetchError } = await supabaseAdmin
        .from('passkey_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'registration')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeFetchError || !challengeRow) {
        console.error('No valid challenge found:', challengeFetchError);
        return new Response(JSON.stringify({ error: 'Registration session expired. Please try again.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Single-use: consume the challenge BEFORE verifying, so a failed attempt burns it too
      await supabaseAdmin.from('passkey_challenges').delete().eq('id', challengeRow.id);

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
        });
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        return new Response(JSON.stringify({ error: 'Passkey verification failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(JSON.stringify({ error: 'Passkey verification failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { credential: verifiedCredential, credentialDeviceType } = verification.registrationInfo;
      const publicKeyBase64url = uint8ArrayToBase64url(verifiedCredential.publicKey);

      const { error: insertError } = await supabaseAdmin
        .from('passkey_credentials')
        .insert({
          user_id: user.id,
          credential_id: verifiedCredential.id,
          public_key: publicKeyBase64url,
          counter: verifiedCredential.counter,
          device_type: credentialDeviceType || 'platform',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save passkey' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('Passkey registered for user:', user.id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[passkey-register] Internal error:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(JSON.stringify({ error: 'Registration failed. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
