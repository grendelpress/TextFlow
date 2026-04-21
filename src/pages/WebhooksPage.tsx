import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Webhook, PhoneNumber } from "../types";
import {
  Webhook as WebhookIcon, Plus, Trash2, ToggleLeft, ToggleRight,
  X, Copy, CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
  ExternalLink, ArrowDownToLine, Radio,
} from "lucide-react";

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", phone_number_id: "", secret: "" });

  const inboundUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-webhook`;

  const load = async () => {
    const [whRes, pnRes] = await Promise.all([
      supabase.from("webhooks").select("*").order("created_at", { ascending: false }),
      supabase.from("phone_numbers").select("*").eq("is_active", true),
    ]);
    setWebhooks(whRes.data || []);
    setPhoneNumbers(pnRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.from("webhooks").insert({
        name: form.name,
        url: form.url,
        phone_number_id: form.phone_number_id || null,
        secret: form.secret,
      });
      if (error) throw error;
      setShowAdd(false);
      setForm({ name: "", url: "", phone_number_id: "", secret: "" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (wh: Webhook) => {
    await supabase.from("webhooks").update({ is_active: !wh.is_active }).eq("id", wh.id);
    setWebhooks((ws) => ws.map((w) => w.id === wh.id ? { ...w, is_active: !w.is_active } : w));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this forwarding rule?")) return;
    await supabase.from("webhooks").delete().eq("id", id);
    setWebhooks((ws) => ws.filter((w) => w.id !== id));
  };

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusColor = (status: number | null) => {
    if (!status) return "text-slate-400";
    if (status >= 200 && status < 300) return "text-emerald-600";
    return "text-red-500";
  };

  const linkedNumber = (pnId: string | null) => {
    if (!pnId) return "All numbers";
    const pn = phoneNumbers.find((p) => p.id === pnId);
    return pn?.friendly_name || pn?.number || "Unknown";
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 text-sm mt-0.5">Receive inbound SMS and forward messages to external services</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Inbound URL card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ArrowDownToLine size={17} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Your Inbound SMS Webhook URL</h2>
            <p className="text-blue-100 text-xs mt-0.5">Paste this into SignalWire for each phone number</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <code className="flex-1 text-sm font-mono text-slate-800 break-all select-all">{inboundUrl}</code>
            <button
              onClick={() => copy(inboundUrl, "inbound")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
            >
              {copied === "inbound" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {copied === "inbound" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: "1", label: "Open SignalWire", sub: "Go to Phone Numbers in your dashboard", href: "https://signalwire.com/signin" },
              { step: "2", label: "Select a number", sub: "Open its settings and find Message Handler" },
              { step: "3", label: "Paste the URL", sub: "Choose LaML Webhook → POST and save" },
            ].map(({ step, label, sub, href }) => (
              <div key={step} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                      Open <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forwarding rules */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Radio size={15} className="text-slate-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Forwarding Rules</h2>
              <p className="text-xs text-slate-400 mt-0.5">Re-send inbound messages to external URLs (Zapier, Make, etc.)</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={13} /> Add Rule
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-14">
            <WebhookIcon size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">No forwarding rules yet</p>
            <p className="text-slate-300 text-xs mt-1 mb-4">Automatically relay inbound SMS to Zapier, Make, or your own server</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              <Plus size={14} /> Add forwarding rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${wh.is_active ? "bg-blue-50" : "bg-slate-100"}`}>
                      <WebhookIcon size={15} className={wh.is_active ? "text-blue-600" : "text-slate-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{wh.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {wh.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{wh.url}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">Listens: {linkedNumber(wh.phone_number_id)}</span>
                        {wh.last_triggered_at && (
                          <span className={`text-xs ${statusColor(wh.last_status)}`}>
                            Last: {wh.last_status ?? "—"} &bull; {new Date(wh.last_triggered_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {wh.secret && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-400 font-mono">Secret: ••••••••</span>
                          <button onClick={() => copy(wh.secret, wh.id)} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                            {copied === wh.id ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                            {copied === wh.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggle(wh)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                      {wh.is_active ? <ToggleRight size={18} className="text-blue-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
                    </button>
                    <button onClick={() => remove(wh.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add rule modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Add Forwarding Rule</h3>
              <button onClick={() => { setShowAdd(false); setError(""); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Zapier CRM Sync"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  required
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">Inbound messages will be POSTed here as JSON</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number (optional)</label>
                <div className="relative">
                  <select
                    value={form.phone_number_id}
                    onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All numbers</option>
                    {phoneNumbers.map((pn) => (
                      <option key={pn.id} value={pn.id}>{pn.friendly_name || pn.number}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="mt-1 text-xs text-slate-400">Leave blank to forward messages from all numbers</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Signing Secret <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  placeholder="Sent as X-Webhook-Secret header"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setError(""); }} className="px-4 py-2 text-sm text-slate-600 font-medium hover:text-slate-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {saving ? "Saving..." : "Add Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
