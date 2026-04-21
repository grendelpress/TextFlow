import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import {
  Building2, KeyRound, CheckCircle2,
  ArrowRight, ArrowLeft, ExternalLink, Info, Zap,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Business Info", icon: Building2 },
  { id: 2, title: "SignalWire Setup", icon: KeyRound },
  { id: 3, title: "Review", icon: CheckCircle2 },
];

export function SetupWizard() {
  const { user, refreshProfile } = useApp();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    signalwire_project_id: "",
    signalwire_api_token: "",
    signalwire_space: "",
    timezone: "America/New_York",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...form, setup_completed: true })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-slate-800 font-bold text-xl">TextFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome! Let's get you set up</h1>
          <p className="text-slate-500">Takes about 3 minutes to configure your business SMS.</p>
        </div>

        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step > s.id ? "bg-emerald-500 text-white" :
                  step === s.id ? "bg-blue-600 text-white" :
                  "bg-slate-200 text-slate-400"
                }`}>
                  {step > s.id ? <CheckCircle2 size={18} /> : s.id}
                </div>
                <span className={`mt-1 text-xs font-medium ${step === s.id ? "text-blue-600" : "text-slate-400"}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-16 mx-2 mb-4 transition-colors ${step > s.id ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">Business Information</h2>
                <p className="text-slate-500 text-sm">This helps personalize your experience.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name *</label>
                  <input className={inputClass} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Acme Plumbing Services" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                  <input className={inputClass} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Phone</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
                  <select className={inputClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                    {[
                      ["America/New_York", "Eastern (ET)"],
                      ["America/Chicago", "Central (CT)"],
                      ["America/Denver", "Mountain (MT)"],
                      ["America/Los_Angeles", "Pacific (PT)"],
                      ["America/Anchorage", "Alaska (AKT)"],
                      ["Pacific/Honolulu", "Hawaii (HT)"],
                    ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">Connect SignalWire</h2>
                <p className="text-slate-500 text-sm">Credentials are stored securely and used only to send/receive SMS on your behalf.</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-medium">How to find your credentials:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                    <li>Log into your SignalWire dashboard</li>
                    <li>Go to Settings &rarr; API</li>
                    <li>Copy your Project ID and API Token</li>
                    <li>Your space name is the subdomain of your SignalWire URL</li>
                  </ol>
                  <a href="https://signalwire.com/signup" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 mt-1">
                    Create a free SignalWire account <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SignalWire Space Name *</label>
                  <div className="flex">
                    <input className="flex-1 bg-white border border-r-0 border-slate-200 rounded-l-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value={form.signalwire_space} onChange={(e) => set("signalwire_space", e.target.value)} placeholder="yourspace" />
                    <span className="bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-2.5 text-slate-500 text-sm flex items-center">.signalwire.com</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Project ID *</label>
                  <input className={inputClass} value={form.signalwire_project_id} onChange={(e) => set("signalwire_project_id", e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">API Token *</label>
                  <input type="password" className={inputClass} value={form.signalwire_api_token} onChange={(e) => set("signalwire_api_token", e.target.value)} placeholder="PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  <p className="mt-1 text-xs text-slate-400">Stored encrypted. Never shared with third parties.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">Almost done!</h2>
                <p className="text-slate-500 text-sm">Review your setup before finishing.</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Business Name", value: form.business_name || "—" },
                  { label: "Contact Name", value: form.contact_name || "—" },
                  { label: "SignalWire Space", value: form.signalwire_space ? `${form.signalwire_space}.signalwire.com` : "—" },
                  { label: "Project ID", value: form.signalwire_project_id ? `${form.signalwire_project_id.slice(0, 8)}...` : "—" },
                  { label: "API Token", value: form.signalwire_api_token ? "••••••••" : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700">
                  After finishing, go to <strong>Phone Numbers</strong> to provision a number, then you can start sending and receiving SMS right away!
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-0 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !form.business_name}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving || !form.signalwire_project_id || !form.signalwire_api_token || !form.signalwire_space}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
              >
                {saving ? "Saving..." : "Finish Setup"} <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-slate-400 text-xs">
          You can update these settings anytime in the Settings page.
        </p>
      </div>
    </div>
  );
}
