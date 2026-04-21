import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const lamlResponse = (replyBody?: string) => {
  const content = replyBody
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyBody}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/xml", ...corsHeaders },
  });
};

const STOP_KEYWORDS = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "UNSTOP"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SignalWire POSTs form-encoded data
    const text = await req.text();
    const params = new URLSearchParams(text);

    const sid = params.get("MessageSid") || params.get("SmsSid") || params.get("message_sid") || "";
    const messageStatus = params.get("MessageStatus") || params.get("SmsStatus") || "";

    // Status callback: has MessageStatus but is not a full inbound message
    if (messageStatus && sid) {
      await supabase
        .from("messages")
        .update({ status: messageStatus })
        .eq("signalwire_sid", sid);
      return lamlResponse();
    }

    const from = params.get("From") || params.get("from") || "";
    const to = params.get("To") || params.get("to") || "";
    const body = params.get("Body") || params.get("body") || "";

    if (!from || !to) {
      return lamlResponse();
    }

    // Find which user owns the `to` number
    const { data: phoneRow } = await supabase
      .from("phone_numbers")
      .select("id, user_id")
      .eq("number", to)
      .eq("is_active", true)
      .maybeSingle();

    if (!phoneRow) {
      // Unknown number — still return valid LaML so SW doesn't retry
      return lamlResponse();
    }

    const normalized = body.trim().toUpperCase();

    if (STOP_KEYWORDS.has(normalized)) {
      await supabase.from("messages").insert({
        user_id: phoneRow.user_id,
        phone_number_id: phoneRow.id,
        direction: "inbound",
        from_number: from,
        to_number: to,
        contact_phone: from,
        body,
        status: "received",
        signalwire_sid: sid,
      });

      await supabase.from("opt_outs").upsert(
        {
          user_id: phoneRow.user_id,
          phone_number: from,
          is_active: true,
          opted_out_at: new Date().toISOString(),
          opted_in_at: null,
          source: "reply",
        },
        { onConflict: "user_id,phone_number" }
      );

      return lamlResponse(
        "You have been unsubscribed and will receive no further messages. Reply START to re-subscribe."
      );
    }

    if (START_KEYWORDS.has(normalized)) {
      await supabase.from("messages").insert({
        user_id: phoneRow.user_id,
        phone_number_id: phoneRow.id,
        direction: "inbound",
        from_number: from,
        to_number: to,
        contact_phone: from,
        body,
        status: "received",
        signalwire_sid: sid,
      });

      await supabase.from("opt_outs").upsert(
        {
          user_id: phoneRow.user_id,
          phone_number: from,
          is_active: false,
          opted_in_at: new Date().toISOString(),
          source: "reply",
        },
        { onConflict: "user_id,phone_number" }
      );

      return lamlResponse(
        "You have been re-subscribed and will resume receiving messages."
      );
    }

    // Insert the inbound message
    await supabase.from("messages").insert({
      user_id: phoneRow.user_id,
      phone_number_id: phoneRow.id,
      direction: "inbound",
      from_number: from,
      to_number: to,
      contact_phone: from,
      body,
      status: "received",
      signalwire_sid: sid,
    });

    // Fan-out to active forwarding webhooks (fire-and-forget)
    const { data: hooks } = await supabase
      .from("webhooks")
      .select("id, url, secret, phone_number_id")
      .eq("user_id", phoneRow.user_id)
      .eq("is_active", true);

    if (hooks && hooks.length > 0) {
      const payload = JSON.stringify({ from, to, body, sid, received_at: new Date().toISOString() });

      EdgeRuntime.waitUntil(
        Promise.allSettled(
          hooks
            .filter((h) => !h.phone_number_id || h.phone_number_id === phoneRow.id)
            .map(async (hook) => {
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (hook.secret) headers["X-Webhook-Secret"] = hook.secret;

              const res = await fetch(hook.url, { method: "POST", headers, body: payload }).catch(() => null);
              const status = res?.status ?? 0;

              await supabase
                .from("webhooks")
                .update({ last_triggered_at: new Date().toISOString(), last_status: status })
                .eq("id", hook.id);
            })
        )
      );
    }

    return lamlResponse();
  } catch (_err) {
    // Always return valid LaML so SignalWire doesn't retry indefinitely
    return lamlResponse();
  }
});
