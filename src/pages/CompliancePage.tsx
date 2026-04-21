import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { OptOut } from "../types";
import {
  ShieldCheck, UserX, UserCheck, Plus, Search,
  X, AlertCircle, Info, RefreshCw,
} from "lucide-react";

export function CompliancePage() {
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const load = async () => {
    const { data } = await supabase.from("opt_outs").select("*").order("opted_out_at", { ascending: false });
    setOptOuts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const { error } = await supabase.from("opt_outs").upsert({
        phone_number: addPhone,
        opted_out_at: new Date().toISOString(),
        opted_in_at: null,
        is_active: true,
        source: "manual",
      }, { onConflict: "user_id,phone_number" });
      if (error) throw error;
      setShowAdd(false);
      setAddPhone("");
      await load();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const toggleOptOut = async (opt: OptOut) => {
    const isActive = !opt.is_active;
    await supabase.from("opt_outs").update({
      is_active: isActive,
      opted_in_at: isActive ? null : new Date().toISOString(),
    }).eq("id", opt.id);
    setOptOuts((os) => os.map((o) => o.id === opt.id ? { ...o, is_active: isActive } : o));
  };

  const filtered = optOuts.filter((o) => !search || o.phone_number.includes(search));
  const activeCount = optOuts.filter((o) => o.is_active).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance & Opt-Outs</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage TCPA compliance and contact opt-out preferences</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Add Opt-Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-emerald-600" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Auto-Compliance</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">STOP, UNSUBSCRIBE, CANCEL, END, and QUIT keywords are automatically handled. Contacts receive a confirmation and are added to this list.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <UserX size={18} className="text-red-500" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Opted Out</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">contacts blocked from receiving messages</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserCheck size={18} className="text-blue-600" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Re-subscribed</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{optOuts.filter((o) => !o.is_active).length}</p>
          <p className="text-xs text-slate-400 mt-0.5">contacts that opted back in via START</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">TCPA Compliance Requirements</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700 text-xs">
            <li>Always obtain prior written consent before sending marketing SMS</li>
            <li>Include opt-out instructions in every marketing message (e.g., "Reply STOP to unsubscribe")</li>
            <li>Honor opt-out requests within 10 business days (TextFlow does this instantly)</li>
            <li>Keep records of consent and opt-outs (this list serves as your audit trail)</li>
            <li>Do not send SMS between 9PM–8AM in the recipient's timezone</li>
            <li>Transactional messages must be related to an existing business relationship</li>
          </ul>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phone numbers..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShieldCheck size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No opt-outs recorded</p>
              <p className="text-slate-300 text-sm mt-1">
                {search ? "No matching numbers" : "Contacts who reply STOP will appear here automatically"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              <div className="grid grid-cols-4 gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <span>Phone Number</span>
                <span>Opted Out</span>
                <span>Source</span>
                <span>Status</span>
              </div>
              {filtered.map((o) => (
                <div key={o.id} className="grid grid-cols-4 gap-4 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                  <span className="font-mono text-sm font-medium text-slate-800">{o.phone_number}</span>
                  <span className="text-sm text-slate-500">{new Date(o.opted_out_at).toLocaleDateString()}</span>
                  <span className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    o.source === "reply" ? "bg-blue-100 text-blue-700" :
                    o.source === "manual" ? "bg-slate-100 text-slate-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {o.source}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.is_active ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {o.is_active ? "Opted Out" : "Subscribed"}
                    </span>
                    <button onClick={() => toggleOptOut(o)} className="text-xs text-slate-400 hover:text-blue-500 transition-colors ml-2" title={o.is_active ? "Re-subscribe" : "Opt out again"}>
                      {o.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Add Manual Opt-Out</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={addOptOut} className="p-5 space-y-4">
              {addError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5" /> {addError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input type="tel" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} required placeholder="+1 (555) 000-0000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <p className="mt-1 text-xs text-slate-400">This number will be blocked from receiving any messages.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={adding} className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <UserX size={14} /> {adding ? "Adding..." : "Add Opt-Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
