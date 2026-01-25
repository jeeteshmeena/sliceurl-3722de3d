import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user with anon client
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list': {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const { data: links, error, count } = await supabase
          .from('links')
          .select('id, short_code, original_url, title, click_count, created_at, is_password_protected, expires_at, is_private', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch links' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            links,
            pagination: {
              page,
              limit,
              total: count,
              total_pages: Math.ceil((count || 0) / limit)
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const linkId = url.searchParams.get('id');
        if (!linkId) {
          return new Response(
            JSON.stringify({ error: 'Link ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // First delete associated clicks
        await supabase.from('clicks').delete().eq('link_id', linkId);

        // Then delete the link
        const { error } = await supabase
          .from('links')
          .delete()
          .eq('id', linkId)
          .eq('user_id', user.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete link' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Link ${linkId} deleted by user ${user.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const body = await req.json();
        const { id, original_url, title, password, expires_at, is_private, custom_slug } = body;

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Link ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updates: Record<string, unknown> = {};
        
        if (original_url !== undefined) updates.original_url = original_url;
        if (title !== undefined) updates.title = title;
        if (expires_at !== undefined) updates.expires_at = expires_at;
        if (is_private !== undefined) updates.is_private = is_private;
        if (custom_slug !== undefined) {
          updates.custom_slug = custom_slug;
          updates.short_code = custom_slug;
        }
        
        if (password !== undefined) {
          if (password === null || password === '') {
            updates.password_hash = null;
            updates.is_password_protected = false;
          } else {
            updates.password_hash = await hashPassword(password);
            updates.is_password_protected = true;
          }
        }

        updates.updated_at = new Date().toISOString();

        const { data: link, error } = await supabase
          .from('links')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update link' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Remove password_hash from response
        const { password_hash: _, ...safeLink } = link;

        console.log(`Link ${id} updated by user ${user.id}`);

        return new Response(
          JSON.stringify({ success: true, link: safeLink }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: list, delete, or update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
