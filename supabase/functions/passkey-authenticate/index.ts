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

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;

// Validate email format and length
function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

// Generate a random challenge
function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, credential } = await req.json();

    if (action === 'start') {
      // Validate email format and length
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return new Response(
          JSON.stringify({ error: emailValidation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user by email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to lookup user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'No passkey found for this email' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's passkeys
      const { data: credentials, error: credError } = await supabaseAdmin
        .from('passkey_credentials')
        .select('credential_id')
        .eq('user_id', user.id);

      if (credError || !credentials?.length) {
        return new Response(
          JSON.stringify({ error: 'No passkey registered for this account' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const challenge = generateChallenge();
      
      const options = {
        challenge,
        timeout: 60000,
        rpId: new URL(origin || supabaseUrl).hostname,
        userVerification: 'preferred' as const,
        allowCredentials: credentials.map(cred => ({
          id: cred.credential_id,
          type: 'public-key' as const,
        })),
      };

      console.log('Generated authentication options for email:', email);

      return new Response(
        JSON.stringify({ options, challenge, userId: user.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'complete') {
      if (!credential || !credential.userId) {
        return new Response(
          JSON.stringify({ error: 'Missing credential data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify credential exists for user
      const { data: storedCred, error: credError } = await supabaseAdmin
        .from('passkey_credentials')
        .select('*')
        .eq('credential_id', credential.id)
        .eq('user_id', credential.userId)
        .maybeSingle();

      if (credError) {
        console.error('Credential lookup error:', credError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify passkey' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!storedCred) {
        console.error('Credential not found for user:', credential.userId);
        return new Response(
          JSON.stringify({ error: 'Invalid passkey' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update counter and last used
      await supabaseAdmin
        .from('passkey_credentials')
        .update({ 
          counter: storedCred.counter + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', storedCred.id);

      // Generate a custom session token for the user
      // Use admin API to sign in as user
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: credential.email,
        options: {
          redirectTo: origin || undefined,
        }
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Passkey authentication successful for user:', credential.userId);

      // Return the magic link token for client to exchange
      const token = new URL(sessionData.properties.action_link).searchParams.get('token');

      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          type: sessionData.properties.email_otp ? 'otp' : 'magiclink'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error('[Internal] Passkey authentication error:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    // Return generic error message to client (no implementation details)
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
