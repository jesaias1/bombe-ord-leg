import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    
    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "ORD BOMBEN <onboarding@resend.dev>",
      to: [email],
      subject: "Velkommen til ORD BOMBEN! 💣",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">💣 ORD BOMBEN</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Velkommen til spillet!</p>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Hej ${name || 'spiller'}! 👋</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Tak fordi du tilmeldte dig ORD BOMBEN - det ultimative danske ordspil! Du er nu klar til at teste dine sprogfærdigheder mod andre spillere.
            </p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 18px;">🎮 Sådan spiller du:</h3>
              <ul style="color: #64748b; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Få en stavelse og find et dansk ord der indeholder den</li>
                <li style="margin-bottom: 8px;">Du har 15 sekunder til at svare</li>
                <li style="margin-bottom: 8px;">Ord må ikke gentages</li>
                <li>Sidste spiller tilbage vinder!</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'https://your-domain.com'}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                🚀 Start Spillet Nu
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
              God fornøjelse med spillet!<br>
              <strong>ORD BOMBEN Teamet</strong>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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