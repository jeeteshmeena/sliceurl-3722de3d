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

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const linkId = url.searchParams.get('link_id');
    const type = url.searchParams.get('type') || 'hourly';

    if (!linkId) {
      return new Response(
        JSON.stringify({ error: 'link_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check: caller must own the link
    const { data: ownedLink, error: ownErr } = await supabase
      .from('links')
      .select('id')
      .eq('id', linkId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (ownErr || !ownedLink) {
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    let startDate: Date;
    
    if (type === 'hourly') {
      // Last 24 hours
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data: clicks, error } = await supabase
      .from('clicks')
      .select('clicked_at')
      .eq('link_id', linkId)
      .gte('clicked_at', startDate.toISOString())
      .order('clicked_at', { ascending: true });

    if (error) {
      console.error('Error fetching clicks:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let chartData: { label: string; clicks: number }[] = [];

    if (type === 'hourly') {
      // Create 24 hour buckets
      const hourBuckets: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hourBuckets[i] = 0;
      }

      clicks?.forEach((click) => {
        const hour = new Date(click.clicked_at).getHours();
        hourBuckets[hour]++;
      });

      chartData = Object.entries(hourBuckets).map(([hour, count]) => ({
        label: `${hour.toString().padStart(2, '0')}:00`,
        clicks: count
      }));
    } else {
      // Create day of week buckets
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayBuckets: Record<number, number> = {};
      for (let i = 0; i < 7; i++) {
        dayBuckets[i] = 0;
      }

      clicks?.forEach((click) => {
        const day = new Date(click.clicked_at).getDay();
        dayBuckets[day]++;
      });

      chartData = Object.entries(dayBuckets).map(([day, count]) => ({
        label: dayNames[parseInt(day)],
        clicks: count
      }));
    }

    console.log(`Analytics time ${type} for link ${linkId}: ${clicks?.length || 0} clicks`);

    return new Response(
      JSON.stringify({ 
        type,
        data: chartData,
        total: clicks?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics time error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
