import { useEffect, useState } from "react";
import { supabase, swProxy } from "../lib/supabase";
import { PhoneNumber } from "../types";
import {
  Phone, Plus, Trash2, RefreshCw,
  X, Info, AlertCircle, Download, Pencil, Check,
} from "lucide-react";

interface SWNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
}

type Tab = "import" | "manual";

const E164 = /^\+[1-9]\d{7,14}$/;

function EditableLabel({ id, value, onSave }: { id: string; value: string; onSave: (id: string, name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { setDraft(value); setEditing(false); return; }
    setSaving(true);
    await onSave(id, trimmed);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          className="text-sm font-semibold text-slate-800 bg-slate-100 border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
        />
        <button onClick={commit} disabled={saving} className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
          <Check size={14} />
        </button>
        <button onClick={() => { setDraft(value); setEditing(false); }} className="p-1 text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/label">
      <span className="text-sm font-semibold text-slate-800">{value}</span>
      <button
        onClick={() => setEditing(true)}
        className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
        title="Edit label"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

export function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<Tab>("import");
  const [error, setError] = useState("");

  const [remote, setRemote] = useState<SWNumber[]>([]);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const [manualNumber, setManualNumber] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualError, setManualError] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("phone_numbers").select("*").order("created_at", { ascending: false });
    setNumbers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fetchRemote = async () => {
    setFetchingRemote(true);
    setRemoteError("");
    try {
      const data = await swProxy("list-account-numbers", "GET");
      setRemote(data.numbers || []);
    } catch (err: unknown) {
      setRemoteError(err instanceof Error ? err.message : "Failed to load numbers");
    } finally {
      setFetchingRemote(false);
    }
  };

  const openAdd = () => {
    setShowAdd(true);
    setTab("import");
    setError("");
    setRemoteError("");
    setManualError("");
    setManualNumber("");
    setManualLabel("");
    if (remote.length === 0) fetchRemote();
  };

  const attachFromSignalWire = async (n: SWNumber) => {
    setAdding(n.sid);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error: insertError } = await supabase.from("phone_numbers").insert({
        user_id: user.id,
        number: n.phone_number,
        friendly_name: n.friendly_name || n.phone_number,
        signalwire_sid: n.sid,
        capabilities: n.capabilities,
      });
      if (insertError) throw insertError;
      await load();
      setShowAdd(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to attach number");
    } finally {
      setAdding(null);
    }
  };

  const attachManual = async () => {
    const trimmed = manualNumber.trim();
    if (!E164.test(trimmed)) {
      setManualError("Enter a number in E.164 format, e.g. +15551234567");
      return;
    }
    if (numbers.some((n) => n.number === trimmed)) {
      setManualError("That number is already attached");
      return;
    }
    setSavingManual(true);
    setManualError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error: insertError } = await supabase.from("phone_numbers").insert({
        user_id: user.id,
        number: trimmed,
        friendly_name: manualLabel.trim() || trimmed,
        signalwire_sid: "",
        capabilities: { sms: true, mms: false, voice: false },
      });
      if (insertError) throw insertError;
      await load();
      setShowAdd(false);
    } catch (err: unknown) {
      setManualError(err instanceof Error ? err.message : "Failed to add number");
    } finally {
      setSavingManual(false);
    }
  };

  const removeNumber = async (num: PhoneNumber) => {
    if (!confirm(`Remove ${num.friendly_name || num.number} from this app? The number will remain in your SignalWire account.`)) return;
    try {
      await supabase.from("phone_numbers").delete().eq("id", num.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove number");
    }
  };

  const updateLabel = async (id: string, name: string) => {
    await supabase.from("phone_numbers").update({ friendly_name: name }).eq("id", id);
    setNumbers((ns) => ns.map((n) => n.id === id ? { ...n, friendly_name: name } : n));
  };

  const attachedSids = new Set(numbers.map((n) => n.signalwire_sid).filter(Boolean));
  const attachedNumbers = new Set(numbers.map((n) => n.number));
  const importable = remote.filter((r) => !attachedSids.has(r.sid) && !attachedNumbers.has(r.phone_number));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <p className="text-slate-500 text-sm mt-0.5">Attach the SignalWire numbers you've already purchased</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Attach Number
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-16">
            <Phone size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No phone numbers yet</p>
            <p className="text-slate-300 text-sm mt-1 mb-4">Attach a number you already own in SignalWire to start sending and receiving SMS</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors">
              <Plus size={15} /> Attach your first number
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {numbers.map((num) => (
              <div key={num.id} className="group flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <EditableLabel id={num.id} value={num.friendly_name || num.number} onSave={updateLabel} />
                    {num.is_active && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>}
                    {!num.signalwire_sid && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Unverified</span>}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{num.number}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {num.capabilities.sms && <span className="px-2 py-1 bg-slate-100 rounded-md">SMS</span>}
                  {num.capabilities.mms && <span className="px-2 py-1 bg-slate-100 rounded-md">MMS</span>}
                </div>
                <button onClick={() => removeNumber(num)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove from app">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-slate-900">Attach Existing Number</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">Numbers must be purchased and 10DLC-registered in your SignalWire dashboard. This screen only attaches existing numbers so the app can send and receive on them.</p>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setTab("import")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === "import" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Download size={14} /> Import from SignalWire
                </button>
                <button
                  onClick={() => setTab("manual")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Pencil size={14} /> Enter Manually
                </button>
              </div>

              {tab === "import" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Numbers in Your SignalWire Account</p>
                    <button onClick={fetchRemote} disabled={fetchingRemote} className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1">
                      <RefreshCw size={12} className={fetchingRemote ? "animate-spin" : ""} /> Refresh
                    </button>
                  </div>

                  {remoteError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {remoteError}
                    </div>
                  )}

                  {fetchingRemote ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading numbers from SignalWire...</div>
                  ) : importable.length === 0 && !remoteError ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-500">
                        {remote.length === 0
                          ? "No numbers found in your SignalWire account."
                          : "All of your SignalWire numbers are already attached."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {importable.map((n) => (
                        <div key={n.sid} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{n.friendly_name || n.phone_number}</div>
                            <div className="text-xs text-slate-400 font-mono">{n.phone_number}</div>
                            <div className="flex gap-1 mt-1">
                              {n.capabilities.sms && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">SMS</span>}
                              {n.capabilities.mms && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">MMS</span>}
                              {n.capabilities.voice && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">Voice</span>}
                            </div>
                          </div>
                          <button onClick={() => attachFromSignalWire(n)} disabled={adding === n.sid} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0">
                            {adding === n.sid ? "Attaching..." : "Attach"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number (E.164)</label>
                    <input
                      type="text"
                      value={manualNumber}
                      onChange={(e) => setManualNumber(e.target.value)}
                      placeholder="+15551234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Label (optional)</label>
                    <input
                      type="text"
                      value={manualLabel}
                      onChange={(e) => setManualLabel(e.target.value)}
                      placeholder="e.g. Support Line"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Manually-added numbers are marked Unverified until you match them via Import from SignalWire.
                  </p>
                  {manualError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{manualError}</div>
                  )}
                  <button onClick={attachManual} disabled={savingManual} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {savingManual ? "Adding..." : "Attach Number"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
