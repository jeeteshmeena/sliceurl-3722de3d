import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash function for API keys
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return new TextDecoder().decode(hexEncode(hashArray));
}

// Generate secure random API key
function generateApiKey(): string {
  const prefix = 'slc_';
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const key = prefix + new TextDecoder().decode(hexEncode(randomBytes));
  return key;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role client for database operations and JWT verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get auth header for user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token and verify using service role client
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token by passing it directly to getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    if (action === 'create') {
      // Generate new API key
      const { name } = await req.json().catch(() => ({ name: null }));
      
      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 12); // Store first 12 chars for display

      const { data: apiKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          name: name || 'API Key',
          status: 'active',
          rate_limit_daily: 100,
          requests_today: 0,
          rate_limit_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating API key:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`API key created for user ${user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          api_key: rawKey, // Return raw key ONLY on creation
          key_id: apiKey.id,
          prefix: keyPrefix,
          warning: 'Copy this key now. You will not be able to see it again!'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // List all API keys for user (without actual keys)
      const { data: keys, error: listError } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, status, rate_limit_daily, requests_today, rate_limit_reset_at, created_at, revoked_at, last_request_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listError) {
        console.error('Error listing API keys:', listError);
        return new Response(
          JSON.stringify({ error: 'Failed to list API keys' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ keys }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'revoke') {
      const { key_id } = await req.json();
      
      if (!key_id) {
        return new Response(
          JSON.stringify({ error: 'key_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: revokeError } = await supabase
        .from('api_keys')
        .update({ 
          status: 'revoked', 
          revoked_at: new Date().toISOString() 
        })
        .eq('id', key_id)
        .eq('user_id', user.id);

      if (revokeError) {
        console.error('Error revoking API key:', revokeError);
        return new Response(
          JSON.stringify({ error: 'Failed to revoke API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`API key ${key_id} revoked`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { key_id } = await req.json();
      
      if (!key_id) {
        return new Response(
          JSON.stringify({ error: 'key_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', key_id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting API key:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`API key ${key_id} deleted`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'usage') {
      // Get usage stats for user
      const { data: keys, error: usageError } = await supabase
        .from('api_keys')
        .select('requests_today, rate_limit_daily, rate_limit_reset_at')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (usageError) {
        return new Response(
          JSON.stringify({ error: 'Failed to get usage' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const totalUsed = keys?.reduce((sum, k) => sum + k.requests_today, 0) || 0;
      const totalLimit = keys?.reduce((sum, k) => sum + k.rate_limit_daily, 0) || 0;
      const resetAt = keys?.[0]?.rate_limit_reset_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      return new Response(
        JSON.stringify({ 
          requests_used: totalUsed,
          requests_limit: totalLimit,
          requests_remaining: Math.max(0, totalLimit - totalUsed),
          reset_at: resetAt
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API keys error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});