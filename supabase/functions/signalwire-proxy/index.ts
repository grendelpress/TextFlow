import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Creds {
  project: string;
  token: string;
  space: string;
}

const normalizeSpace = (space: string) => {
  const s = space.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return s.includes(".") ? s : `${s}.signalwire.com`;
};

const swFetch = async (creds: Creds, path: string, init: RequestInit = {}) => {
  const auth = btoa(`${creds.project}:${creds.token}`);
  const url = `https://${normalizeSpace(creds.space)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const errObj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const detail = errObj.message || errObj.error || errObj.errors || text || `SignalWire ${res.status}`;
    throw new Error(`SignalWire ${res.status}: ${JSON.stringify(detail)} [url=${url}]`);
  }
  return data;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("signalwire_project_id, signalwire_api_token, signalwire_space")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.signalwire_project_id || !profile?.signalwire_api_token || !profile?.signalwire_space) {
      return json({ error: "SignalWire credentials missing. Add them in Settings." }, 400);
    }

    const creds: Creds = {
      project: profile.signalwire_project_id,
      token: profile.signalwire_api_token,
      space: profile.signalwire_space,
    };

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const accountPath = `/api/laml/2010-04-01/Accounts/${creds.project}`;

    if (action === "list-account-numbers" && req.method === "GET") {
      const data = await swFetch(creds, `/api/relay/rest/phone_numbers?page_size=1000`) as {
        data?: Array<{
          id: string;
          number: string;
          name: string;
          capabilities?: string[];
        }>;
      };
      const numbers = (data.data || []).map((n) => ({
        sid: n.id,
        phone_number: n.number,
        friendly_name: n.name || n.number,
        capabilities: {
          sms: Boolean(n.capabilities?.includes("sms") || n.capabilities?.includes("SMS")),
          mms: Boolean(n.capabilities?.includes("mms") || n.capabilities?.includes("MMS")),
          voice: Boolean(n.capabilities?.includes("voice") || n.capabilities?.includes("voice")),
        },
      }));
      return json({ numbers });
    }

    if (action === "send-sms" && req.method === "POST") {
      const body = await req.json() as { from: string; to: string; body: string };

      // Hard block if destination has an active opt-out
      const { data: optOut } = await admin
        .from("opt_outs")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone_number", body.to)
        .eq("is_active", true)
        .maybeSingle();

      if (optOut) {
        return json(
          { error: `${body.to} has opted out. They must reply START to re-subscribe before you can message them.` },
          400
        );
      }

      const statusCallbackUrl = `${supabaseUrl}/functions/v1/sms-webhook`;

      const form = new URLSearchParams();
      form.set("From", body.from);
      form.set("To", body.to);
      form.set("Body", body.body);
      form.set("StatusCallback", statusCallbackUrl);
      const swData = await swFetch(creds, `${accountPath}/Messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }) as { sid?: string; status?: string };

      // Look up the phone_number record so we can store phone_number_id
      const { data: phoneNumberRow } = await admin
        .from("phone_numbers")
        .select("id")
        .eq("user_id", user.id)
        .eq("number", body.from)
        .maybeSingle();

      const { error: insertError } = await admin.from("messages").insert({
        user_id: user.id,
        phone_number_id: phoneNumberRow?.id ?? null,
        direction: "outbound",
        from_number: body.from,
        to_number: body.to,
        contact_phone: body.to,
        body: body.body,
        status: swData.status ?? "queued",
        signalwire_sid: swData.sid ?? null,
      });

      if (insertError) throw new Error(`Failed to save message: ${insertError.message}`);

      return json(swData);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return json({ error: message }, 500);
  }
});
