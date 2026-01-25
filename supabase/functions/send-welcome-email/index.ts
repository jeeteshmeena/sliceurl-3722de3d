import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const displayName = name || email.split("@")[0];
    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SliceURL</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                <span style="color: #141414;">Slice</span><span style="color: #6b7280;">URL</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
              
              <!-- Welcome Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 56px; height: 56px; background-color: #f5f5f5; border-radius: 14px; line-height: 56px; font-size: 28px;">
                  👋
                </div>
              </div>
              
              <!-- Greeting -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #141414; text-align: center;">
                Welcome, ${displayName}!
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #6b7280; text-align: center;">
                You're all set to start slicing your URLs. Here's what you can do with SliceURL:
              </p>
              
              <!-- Features List -->
              <div style="background-color: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <div style="margin-bottom: 16px;">
                  <span style="font-size: 16px; margin-right: 12px;">🔗</span>
                  <span style="font-size: 14px; color: #374151; font-weight: 500;">Shorten URLs</span>
                  <span style="display: block; font-size: 13px; color: #6b7280; margin-left: 28px;">Create clean, memorable short links</span>
                </div>
                <div style="margin-bottom: 16px;">
                  <span style="font-size: 16px; margin-right: 12px;">📊</span>
                  <span style="font-size: 14px; color: #374151; font-weight: 500;">Track Analytics</span>
                  <span style="display: block; font-size: 13px; color: #6b7280; margin-left: 28px;">See clicks, locations, and devices</span>
                </div>
                <div style="margin-bottom: 16px;">
                  <span style="font-size: 16px; margin-right: 12px;">📱</span>
                  <span style="font-size: 14px; color: #374151; font-weight: 500;">Generate QR Codes</span>
                  <span style="display: block; font-size: 13px; color: #6b7280; margin-left: 28px;">Customize with colors and logos</span>
                </div>
                <div>
                  <span style="font-size: 16px; margin-right: 12px;">📦</span>
                  <span style="font-size: 14px; color: #374151; font-weight: 500;">Share Files</span>
                  <span style="display: block; font-size: 13px; color: #6b7280; margin-left: 28px;">Upload and share via SliceBox</span>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="https://sliceurl.lovable.app/dashboard" 
                   style="display: inline-block; background-color: #141414; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                  Go to Dashboard →
                </a>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">
                Need help? Reply to this email or visit our 
                <a href="https://sliceurl.lovable.app/about" style="color: #6b7280;">about page</a>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${currentYear} SliceURL. Made with ❤️ by JeetX
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Use fetch to call Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SliceURL <noreply@sliceurl.lovable.app>",
        to: [email],
        subject: "Welcome to SliceURL! 🎉",
        html: htmlContent,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-welcome-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
