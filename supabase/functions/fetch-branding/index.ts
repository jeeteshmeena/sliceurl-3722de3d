import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract hex color from various formats
function parseColor(color: string): string | null {
  if (!color) return null;
  
  // Already hex
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1], g = color[2], b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  
  // RGB format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  
  return null;
}

// Get contrasting color
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// Darken or lighten a color
function adjustColor(hexColor: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hexColor.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hexColor.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hexColor.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

// Generate brand colors based on domain name (fallback)
function generateBrandColorsFromDomain(url: string): { colors: string[], palette: any, faviconUrl: string } {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  
  // Simple hash of domain to generate consistent colors
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  const primaryColor = `hsl(${hue}, 70%, 50%)`;
  
  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };
  
  const primary = hslToHex(hue, 70, 50);
  const secondary = hslToHex((hue + 30) % 360, 60, 40);
  
  return {
    colors: [primary, secondary],
    palette: {
      primary,
      secondary,
      background: "#FFFFFF",
      foreground: primary,
      gradientStart: primary,
      gradientEnd: secondary,
    },
    faviconUrl: `${urlObj.origin}/favicon.ico`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching branding for:", url);

    let html: string | null = null;
    let fetchError: string | null = null;

    // Try to fetch the webpage with better headers
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (response.ok) {
        html = await response.text();
      } else {
        fetchError = `HTTP ${response.status}`;
        console.log("Fetch failed with status:", response.status);
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Network error";
      console.log("Fetch error:", fetchError);
    }

    // If we couldn't fetch the page, generate colors from domain
    if (!html) {
      console.log("Using fallback domain-based colors for:", url);
      const fallback = generateBrandColorsFromDomain(url);
      return new Response(
        JSON.stringify({
          success: true,
          ...fallback,
          ogImage: null,
          fallback: true,
          fallbackReason: fetchError,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const colors: string[] = [];
    let faviconUrl: string | null = null;

    // Extract theme-color
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    if (themeColorMatch) {
      const color = parseColor(themeColorMatch[1]);
      if (color) colors.push(color);
    }

    // Extract OG image and try to get dominant color (simplified - just use as logo reference)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    
    // Extract favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch) {
      let favicon = faviconMatch[1];
      if (favicon.startsWith("/")) {
        const urlObj = new URL(url);
        favicon = `${urlObj.origin}${favicon}`;
      } else if (!favicon.startsWith("http")) {
        const urlObj = new URL(url);
        favicon = `${urlObj.origin}/${favicon}`;
      }
      faviconUrl = favicon;
    } else {
      // Try default favicon
      const urlObj = new URL(url);
      faviconUrl = `${urlObj.origin}/favicon.ico`;
    }

    // Extract colors from CSS (simplified extraction)
    const cssColorMatches = html.matchAll(/(?:background-color|color|border-color):\s*([^;}"']+)/gi);
    for (const match of cssColorMatches) {
      const color = parseColor(match[1].trim());
      if (color && !colors.includes(color)) {
        colors.push(color);
      }
      if (colors.length >= 5) break;
    }

    // If we don't have enough colors, use domain-based fallback
    if (colors.length === 0) {
      console.log("No colors found, using domain-based colors");
      const fallback = generateBrandColorsFromDomain(url);
      return new Response(
        JSON.stringify({
          success: true,
          colors: fallback.colors,
          palette: fallback.palette,
          faviconUrl: faviconUrl || fallback.faviconUrl,
          ogImage: ogImageMatch ? ogImageMatch[1] : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let primaryColor = colors[0] || "#6366f1";
    
    // Generate a palette
    const palette = {
      primary: primaryColor,
      secondary: colors[1] || adjustColor(primaryColor, -40),
      background: getContrastColor(primaryColor),
      foreground: primaryColor,
      gradientStart: primaryColor,
      gradientEnd: colors[1] || adjustColor(primaryColor, -60),
    };

    console.log("Extracted branding:", { colors, palette, faviconUrl });

    return new Response(
      JSON.stringify({
        success: true,
        colors,
        palette,
        faviconUrl,
        ogImage: ogImageMatch ? ogImageMatch[1] : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching branding:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch branding";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
