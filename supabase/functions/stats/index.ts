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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const shortCode = url.searchParams.get('short_code');
    const linkId = url.searchParams.get('link_id');
    const days = parseInt(url.searchParams.get('days') || '30');

    if (!shortCode && !linkId) {
      return new Response(
        JSON.stringify({ error: 'Short code or link ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get link scoped to caller's user_id (ownership check)
    let link;
    const query = supabase.from('links').select('*').eq('user_id', user.id);
    if (shortCode) {
      const { data, error } = await query.eq('short_code', shortCode).maybeSingle();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      link = data;
    } else {
      const { data, error } = await query.eq('id', linkId).maybeSingle();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      link = data;
    }

    // Get clicks for this link
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('*')
      .eq('link_id', link.id)
      .gte('clicked_at', startDate.toISOString())
      .order('clicked_at', { ascending: false });

    if (clicksError) {
      console.error('Error fetching clicks:', clicksError);
    }

    const allClicks = clicks || [];

    // Calculate statistics
    const totalClicks = allClicks.length;
    const uniqueClicks = allClicks.filter(c => c.is_unique).length;

    const devices: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const operatingSystems: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const referrers: Record<string, number> = {};

    allClicks.forEach(click => {
      const device = click.device_type || 'unknown';
      devices[device] = (devices[device] || 0) + 1;
      const browser = click.browser || 'unknown';
      browsers[browser] = (browsers[browser] || 0) + 1;
      const os = click.os || 'unknown';
      operatingSystems[os] = (operatingSystems[os] || 0) + 1;
      const country = click.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
      const referrer = click.referrer || 'Direct';
      referrers[referrer] = (referrers[referrer] || 0) + 1;
    });

    const timeline: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      timeline[dateStr] = 0;
    }

    allClicks.forEach(click => {
      const dateStr = new Date(click.clicked_at).toISOString().split('T')[0];
      if (timeline[dateStr] !== undefined) timeline[dateStr]++;
    });

    const timelineArray = Object.entries(timeline)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    allClicks.forEach(click => {
      const date = new Date(click.clicked_at);
      heatmap[date.getDay()][date.getHours()]++;
    });

    const stats = {
      link: {
        id: link.id,
        short_code: link.short_code,
        original_url: link.original_url,
        title: link.title,
        created_at: link.created_at,
        click_count: link.click_count,
        last_clicked_at: link.last_clicked_at
      },
      summary: { total_clicks: totalClicks, unique_clicks: uniqueClicks, period_days: days },
      devices: Object.entries(devices).map(([name, count]) => ({ name, count })),
      browsers: Object.entries(browsers).map(([name, count]) => ({ name, count })),
      operating_systems: Object.entries(operatingSystems).map(([name, count]) => ({ name, count })),
      countries: Object.entries(countries).map(([name, count]) => ({ name, count })),
      referrers: Object.entries(referrers).map(([name, count]) => ({ name, count })),
      timeline: timelineArray,
      heatmap
    };

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stats error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
