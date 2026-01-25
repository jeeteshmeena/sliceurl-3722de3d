import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LinkHealthStatus = 'active' | 'low_activity' | 'inactive' | 'broken';

async function checkUrlHealth(url: string): Promise<{ isAccessible: boolean; statusCode?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    });
    
    clearTimeout(timeoutId);
    return { isAccessible: response.ok, statusCode: response.status };
  } catch (error) {
    console.error(`URL check failed for ${url}:`, error);
    return { isAccessible: false };
  }
}

function calculateHealthStatus(
  lastClickedAt: string | null, 
  isBroken: boolean
): LinkHealthStatus {
  if (isBroken) return 'broken';
  
  if (!lastClickedAt) return 'active'; // New link, no clicks yet
  
  const now = new Date();
  const lastClick = new Date(lastClickedAt);
  const daysSinceClick = (now.getTime() - lastClick.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceClick > 30) return 'inactive';
  if (daysSinceClick > 14) return 'low_activity';
  return 'active';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { link_id, check_url = false } = await req.json();

    if (!link_id) {
      return new Response(
        JSON.stringify({ error: 'link_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get link data
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('original_url, last_clicked_at, is_broken, notify_on_broken')
      .eq('id', link_id)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isBroken = link.is_broken || false;
    const wasBroken = link.is_broken || false;

    // Optionally check if URL is still accessible
    if (check_url) {
      const healthCheck = await checkUrlHealth(link.original_url);
      isBroken = !healthCheck.isAccessible;
    }

    // Calculate health status
    const healthStatus = calculateHealthStatus(link.last_clicked_at, isBroken);

    // Update link health status
    const { error: updateError } = await supabase
      .from('links')
      .update({
        health_status: healthStatus,
        is_broken: isBroken,
        last_health_check: new Date().toISOString()
      })
      .eq('id', link_id);

    if (updateError) {
      console.error('Error updating link health:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If link just became broken and notifications are enabled, send alert
    if (isBroken && !wasBroken && link.notify_on_broken) {
      try {
        await supabase.functions.invoke('notify-broken-link', {
          body: { link_id, reason: 'Destination URL is unreachable' }
        });
        console.log('Broken link notification triggered for:', link_id);
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }
    }

    console.log(`Health check for link ${link_id}: ${healthStatus}`);

    return new Response(
      JSON.stringify({ 
        health_status: healthStatus,
        is_broken: isBroken,
        last_clicked_at: link.last_clicked_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check link health error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
