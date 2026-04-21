import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Settings, KeyRound, Building2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export function SettingsPage() {
  const { user, profile, refreshProfile } = useApp();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    signalwire_project_id: "",
    signalwire_api_token: "",
    signalwire_space: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name,
        contact_name: profile.contact_name,
        phone: profile.phone,
        signalwire_project_id: profile.signalwire_project_id,
        signalwire_api_token: profile.signalwire_api_token,
        signalwire_space: profile.signalwire_space,
        timezone: profile.timezone,
      });
    }
  }, [profile]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm";

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your business profile and API credentials</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={14} /> Settings saved successfully
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 size={15} className="text-slate-500" />
            </div>
            <h2 className="font-semibold text-slate-800">Business Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Business Name</label>
              <input className={inputClass} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Your Business Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Contact Name</label>
              <input className={inputClass} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Your Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Business Phone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Timezone</label>
              <select className={inputClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {[
                  ["America/New_York", "Eastern Time (ET)"],
                  ["America/Chicago", "Central Time (CT)"],
                  ["America/Denver", "Mountain Time (MT)"],
                  ["America/Los_Angeles", "Pacific Time (PT)"],
                  ["America/Anchorage", "Alaska Time (AKT)"],
                  ["Pacific/Honolulu", "Hawaii Time (HT)"],
                  ["Europe/London", "GMT / London"],
                  ["Europe/Paris", "Central European (CET)"],
                  ["Asia/Tokyo", "Japan Standard (JST)"],
                  ["Australia/Sydney", "Australian Eastern (AET)"],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <KeyRound size={15} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">SignalWire Credentials</h2>
              <p className="text-xs text-slate-400">Used to send and receive SMS on your behalf</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Space Name</label>
              <div className="flex">
                <input className="flex-1 bg-white border border-r-0 border-slate-200 rounded-l-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={form.signalwire_space} onChange={(e) => set("signalwire_space", e.target.value)} placeholder="yourspace" />
                <span className="bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-2.5 text-slate-500 text-sm flex items-center whitespace-nowrap">.signalwire.com</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Project ID</label>
              <input className={`${inputClass} font-mono`} value={form.signalwire_project_id} onChange={(e) => set("signalwire_project_id", e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">API Token</label>
              <div className="relative">
                <input type={showToken ? "text" : "password"} className={`${inputClass} pr-10`} value={form.signalwire_api_token} onChange={(e) => set("signalwire_api_token", e.target.value)} placeholder="PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">Stored securely. Never shared with third parties.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings size={15} className="text-slate-500" />
            </div>
            <h2 className="font-semibold text-slate-800">Account</h2>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-sm font-medium text-slate-800 mt-0.5">{user?.email}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Member since {profile ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
            <CheckCircle2 size={16} /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
