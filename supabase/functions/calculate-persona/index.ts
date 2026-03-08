import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UserPersona = 'influencer' | 'marketer' | 'agency' | 'casual';

function classifyPersona(
  totalLinks: number, 
  totalClicks: number, 
  utmUsageCount: number, 
  folderCount: number,
  linksThisWeek: number
): UserPersona {
  if (totalLinks > 50 && totalClicks > 1000) return 'influencer';
  if (folderCount >= 3 && linksThisWeek > 10) return 'agency';
  if (totalLinks > 10 && utmUsageCount > totalLinks * 0.5) return 'marketer';
  return 'casual';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT and extract user_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the JWT using anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user_id = claimsData.claims.sub;

    // Use service role client for data queries
    const supabase = createClient(supabaseUrl, serviceKey);

    // Count total links
    const { count: totalLinks } = await supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    // Count total clicks across all user's links
    const { data: userLinks } = await supabase
      .from('links')
      .select('id, click_count')
      .eq('user_id', user_id);

    const totalClicks = userLinks?.reduce((sum, link) => sum + (link.click_count || 0), 0) || 0;

    // Count folders
    const { count: folderCount } = await supabase
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    // Count links created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { count: linksThisWeek } = await supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', oneWeekAgo.toISOString());

    // Count UTM usage (links with utm parameters in original URL)
    const { data: utmLinks } = await supabase
      .from('links')
      .select('original_url')
      .eq('user_id', user_id);

    const utmUsageCount = utmLinks?.filter(link => 
      link.original_url.includes('utm_') || 
      link.original_url.includes('ref=') ||
      link.original_url.includes('source=')
    ).length || 0;

    // Classify persona
    const persona = classifyPersona(
      totalLinks || 0,
      totalClicks,
      utmUsageCount,
      folderCount || 0,
      linksThisWeek || 0
    );

    // Upsert user persona
    const { error: upsertError } = await supabase
      .from('user_personas')
      .upsert({
        user_id,
        persona,
        total_links: totalLinks || 0,
        total_clicks: totalClicks,
        utm_usage_count: utmUsageCount,
        folder_count: folderCount || 0,
        links_this_week: linksThisWeek || 0,
        last_calculated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error upserting persona:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Persona calculated for user ${user_id}: ${persona}`);

    return new Response(
      JSON.stringify({ 
        persona,
        stats: {
          totalLinks: totalLinks || 0,
          totalClicks,
          utmUsageCount,
          folderCount: folderCount || 0,
          linksThisWeek: linksThisWeek || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calculate persona error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
