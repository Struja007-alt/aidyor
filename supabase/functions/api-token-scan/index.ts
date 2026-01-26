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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hash function for API keys
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a new API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'aidyor_sk_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Validate API key and get client info
async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  client?: any;
  keyRecord?: any;
  plan?: any;
  usage?: any;
  error?: string;
}> {
  if (!apiKey || !apiKey.startsWith('aidyor_sk_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = await hashApiKey(apiKey);
  
  // Get API key record
  const { data: keyRecord, error: keyError } = await supabase
    .from('api_keys')
    .select('*, api_clients(*)')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (keyError || !keyRecord) {
    console.log('API key lookup failed:', keyError?.message);
    return { valid: false, error: 'Invalid or inactive API key' };
  }

  const client = keyRecord.api_clients;
  
  if (client.status !== 'active') {
    return { valid: false, error: `API client account is ${client.status}` };
  }

  // Get plan limits
  const { data: plan, error: planError } = await supabase
    .from('api_plans')
    .select('*')
    .eq('tier', client.plan_tier)
    .single();

  if (planError || !plan) {
    return { valid: false, error: 'Plan configuration error' };
  }

  // Get current billing period usage
  const billingPeriod = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
  
  let { data: usage, error: usageError } = await supabase
    .from('api_usage')
    .select('*')
    .eq('client_id', client.id)
    .eq('billing_period', billingPeriod)
    .single();

  // Create usage record if doesn't exist
  if (usageError && usageError.code === 'PGRST116') {
    const { data: newUsage, error: insertError } = await supabase
      .from('api_usage')
      .insert({
        client_id: client.id,
        api_key_id: keyRecord.id,
        billing_period: billingPeriod,
        scan_count: 0,
        overage_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create usage record:', insertError);
      return { valid: false, error: 'Usage tracking error' };
    }
    usage = newUsage;
  }

  return { valid: true, client, keyRecord, plan, usage };
}

// Track API usage
async function trackUsage(clientId: string, keyId: string, planLimit: number, currentUsage: any): Promise<{
  allowed: boolean;
  isOverage: boolean;
  remainingScans: number;
}> {
  const totalScans = currentUsage.scan_count + 1;
  const isOverage = totalScans > planLimit;
  
  // Update usage
  const { error } = await supabase
    .from('api_usage')
    .update({
      scan_count: totalScans,
      overage_count: isOverage ? currentUsage.overage_count + 1 : currentUsage.overage_count
    })
    .eq('id', currentUsage.id);

  if (error) {
    console.error('Failed to update usage:', error);
  }

  // Update last_used_at on API key
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);

  return {
    allowed: true, // Always allow, just charge overage
    isOverage,
    remainingScans: Math.max(0, planLimit - totalScans)
  };
}

// Call the risk orchestrator
async function performScan(address: string, network?: string): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/risk-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ address, network })
    });

    if (!response.ok) {
      throw new Error(`Risk orchestrator returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/api-token-scan', '');

  try {
    // Health check endpoint
    if (path === '/health' || path === '') {
      return new Response(JSON.stringify({
        status: 'healthy',
        version: '1.0.0',
        endpoints: {
          'POST /scan': 'Scan a token address for security risks',
          'GET /usage': 'Get current billing period usage',
          'GET /plans': 'List available API plans',
          'POST /keys': 'Generate a new API key (requires auth)',
          'GET /keys': 'List your API keys (requires auth)'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Public endpoint: List plans
    if (path === '/plans' && req.method === 'GET') {
      const { data: plans, error } = await supabase
        .from('api_plans')
        .select('tier, name, price_cents, monthly_scan_limit, overage_price_cents, description')
        .order('price_cents');

      if (error) throw error;

      return new Response(JSON.stringify({
        plans: plans.map(p => ({
          ...p,
          price: `$${(p.price_cents / 100).toFixed(2)}/month`,
          overage_price: `$${(p.overage_price_cents / 100).toFixed(2)}/scan`
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');

    // Scan endpoint
    if (path === '/scan' && req.method === 'POST') {
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Missing API key',
          message: 'Include your API key in the x-api-key header'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate API key
      const validation = await validateApiKey(apiKey);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Authentication failed',
          message: validation.error
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse request body
      const body = await req.json();
      const { address, network } = body;

      if (!address) {
        return new Response(JSON.stringify({
          error: 'Missing required field',
          message: 'address is required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Track usage
      const usageResult = await trackUsage(
        validation.client.id,
        validation.keyRecord.id,
        validation.plan.monthly_scan_limit,
        validation.usage
      );

      // Perform scan
      const scanResult = await performScan(address, network);

      return new Response(JSON.stringify({
        success: true,
        data: scanResult,
        usage: {
          scans_this_period: validation.usage.scan_count + 1,
          plan_limit: validation.plan.monthly_scan_limit,
          remaining: usageResult.remainingScans,
          is_overage: usageResult.isOverage,
          overage_rate: `$${(validation.plan.overage_price_cents / 100).toFixed(2)}/scan`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Usage endpoint
    if (path === '/usage' && req.method === 'GET') {
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Missing API key',
          message: 'Include your API key in the x-api-key header'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validation = await validateApiKey(apiKey);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Authentication failed',
          message: validation.error
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        plan: {
          tier: validation.client.plan_tier,
          name: validation.plan.name,
          monthly_limit: validation.plan.monthly_scan_limit,
          overage_rate: `$${(validation.plan.overage_price_cents / 100).toFixed(2)}/scan`
        },
        current_period: {
          start: validation.usage.billing_period,
          scans_used: validation.usage.scan_count,
          overage_scans: validation.usage.overage_count,
          remaining: Math.max(0, validation.plan.monthly_scan_limit - validation.usage.scan_count),
          estimated_overage_charge: `$${((validation.usage.overage_count * validation.plan.overage_price_cents) / 100).toFixed(2)}`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Admin: Create new API client (requires service role or admin)
    if (path === '/clients' && req.method === 'POST') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.includes(supabaseServiceKey)) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin access required'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { company_name, contact_email, plan_tier = 'starter', user_id } = body;

      if (!company_name || !contact_email) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'company_name and contact_email are required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create client
      const { data: client, error: clientError } = await supabase
        .from('api_clients')
        .insert({
          company_name,
          contact_email,
          plan_tier,
          user_id
        })
        .select()
        .single();

      if (clientError) {
        throw clientError;
      }

      // Generate API key
      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 12);

      const { data: keyRecord, error: keyError } = await supabase
        .from('api_keys')
        .insert({
          client_id: client.id,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name: 'Default Key'
        })
        .select()
        .single();

      if (keyError) {
        throw keyError;
      }

      return new Response(JSON.stringify({
        success: true,
        client: {
          id: client.id,
          company_name: client.company_name,
          plan_tier: client.plan_tier,
          status: client.status
        },
        api_key: {
          key: rawKey, // Only returned once!
          prefix: keyPrefix,
          warning: 'Store this key securely. It will not be shown again.'
        }
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown endpoints
    return new Response(JSON.stringify({
      error: 'Not found',
      message: `Unknown endpoint: ${req.method} ${path}`
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
