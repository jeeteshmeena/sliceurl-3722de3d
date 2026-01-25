import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read from global_counters table (increment-only counters)
    const { data: counters, error } = await supabase
      .from('global_counters')
      .select('total_links_created, total_clicks, total_signups')
      .eq('id', 'main')
      .single();

    if (error) {
      console.error('Error fetching global counters:', error);
      // Fallback to counting if table doesn't exist yet
      const { count: totalLinks } = await supabase
        .from('links')
        .select('*', { count: 'exact', head: true });

      const { count: totalClicks } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true });

      const stats = {
        total_links: totalLinks || 0,
        total_clicks: totalClicks || 0,
        avg_slice_time_ms: null,
      };

      console.log('Global stats fetched (fallback):', stats);

      return new Response(
        JSON.stringify(stats),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate average slice time from last 50 successful slices with duration data
    const { data: linksWithDuration } = await supabase
      .from('links')
      .select('slice_duration_ms')
      .not('slice_duration_ms', 'is', null)
      .gt('slice_duration_ms', 0)
      .order('created_at', { ascending: false })
      .limit(50);

    let avg_slice_time_ms: number | null = null;
    if (linksWithDuration && linksWithDuration.length > 0) {
      const totalMs = linksWithDuration.reduce((sum, link) => {
        return sum + (link.slice_duration_ms || 0);
      }, 0);
      avg_slice_time_ms = Math.round(totalMs / linksWithDuration.length);
    }

    const stats = {
      total_links: counters.total_links_created || 0,
      total_clicks: counters.total_clicks || 0,
      avg_slice_time_ms,
    };

    console.log('Global stats fetched:', stats);

    return new Response(
      JSON.stringify(stats),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30' // Cache for 30 seconds
        } 
      }
    );

  } catch (error) {
    console.error('Global stats error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
