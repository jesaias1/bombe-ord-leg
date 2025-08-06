import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log("Received password reset webhook");

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response("Invalid JSON", { status: 400 });
    }

    // Extract user email and reset link from the payload
    const { user, email_data } = payload;
    
    if (!user?.email) {
      console.error("No user email found in payload");
      return new Response("No user email found", { status: 400 });
    }

    // Construct the reset link from email_data
    const resetLink = email_data?.action_link || 
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${email_data?.token_hash}&type=${email_data?.email_action_type}&redirect_to=${email_data?.redirect_to || ''}`;

    console.log("Sending password reset email to:", user.email);

    const emailResponse = await resend.emails.send({
      from: "ORD BOMBEN <onboarding@resend.dev>",
      to: [user.email],
      subject: "Nulstil din adgangskode - ORD BOMBEN",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">🔒 Adgangskode Reset</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">ORD BOMBEN</p>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Nulstil din adgangskode</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Vi modtog en anmodning om at nulstille din adgangskode til ORD BOMBEN. Klik på knappen nedenfor for at vælge en ny adgangskode.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔑 Nulstil Adgangskode
              </a>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #991b1b; font-size: 14px; margin: 0;">
                <strong>⚠️ Vigtig:</strong> Dette link udløber om 1 time af sikkerhedsmæssige årsager.
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
              Hvis du ikke anmodede om denne adgangskode nulstilling, kan du ignorere denne e-mail. Din adgangskode vil forblive uændret.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
              Problemer med linket? Kopier og indsæt denne URL i din browser:<br>
              <span style="word-break: break-all; color: #3b82f6;">${resetLink}</span>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);