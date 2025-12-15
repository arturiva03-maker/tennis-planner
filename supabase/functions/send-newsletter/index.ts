import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string[];
  subject: string;
  body: string;
  fromName: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, body, fromName } = await req.json() as EmailRequest;

    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ error: "Keine Empfänger angegeben" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "Betreff und Nachricht sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: "SMTP-Konfiguration fehlt. Bitte SMTP_USER und SMTP_PASS in Supabase Secrets konfigurieren." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: smtpUser,
      password: smtpPass,
    });

    const errors: string[] = [];
    let successCount = 0;

    // Send emails one by one (for Gmail rate limits)
    for (const recipient of to) {
      try {
        await client.send({
          from: `${fromName} <${smtpUser}>`,
          to: recipient,
          subject: subject,
          content: body,
        });
        successCount++;
      } catch (err) {
        errors.push(`${recipient}: ${err.message}`);
      }
    }

    await client.close();

    if (errors.length > 0 && successCount === 0) {
      return new Response(
        JSON.stringify({
          error: "Alle E-Mails fehlgeschlagen",
          details: errors
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Newsletter error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
