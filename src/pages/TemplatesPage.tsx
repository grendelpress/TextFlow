import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { MessageTemplate } from "../types";
import { FileText, Plus, Trash2, CreditCard as Edit2, X, CheckCircle2, ChevronDown, Send } from "lucide-react";

const CATEGORIES = ["transactional", "marketing", "reminder", "support"] as const;
const CATEGORY_COLORS: Record<string, string> = {
  transactional: "bg-blue-100 text-blue-700",
  marketing: "bg-orange-100 text-orange-700",
  reminder: "bg-yellow-100 text-yellow-700",
  support: "bg-emerald-100 text-emerald-700",
};

const STARTER_TEMPLATES = [
  { name: "Appointment Reminder", body: "Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}}. Reply STOP to unsubscribe.", category: "reminder" as const },
  { name: "Order Confirmation", body: "Your order #{{order_id}} has been confirmed! Estimated delivery: {{date}}. Reply STOP to unsubscribe.", category: "transactional" as const },
  { name: "Welcome Message", body: "Welcome to {{business_name}}! We're glad you're here. Text us anytime for support. Reply STOP to opt out.", category: "transactional" as const },
  { name: "Promotional Offer", body: "{{business_name}}: Special offer just for you! Use code {{code}} for {{discount}} off. Expires {{date}}. Reply STOP to unsubscribe.", category: "marketing" as const },
  { name: "Follow-up", body: "Hi {{name}}, just following up on your recent visit to {{business_name}}. How was your experience? Reply to let us know!", category: "support" as const },
];

const navigateToCompose = (body: string) => {
  window.history.pushState({ templateBody: body }, "", "/messages");
  window.dispatchEvent(new PopStateEvent("popstate", { state: { templateBody: body } }));
};

export function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", body: "", category: "transactional" as MessageTemplate["category"] });
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase.from("message_templates").select("*").order("use_count", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", body: "", category: "transactional" });
    setShowForm(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setForm({ name: t.name, body: t.body, category: t.category });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("message_templates").update(form).eq("id", editing.id);
      } else {
        await supabase.from("message_templates").insert(form);
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await supabase.from("message_templates").delete().eq("id", id);
    setTemplates((ts) => ts.filter((t) => t.id !== id));
  };

  const useTemplate = async (t: MessageTemplate) => {
    await supabase
      .from("message_templates")
      .update({ use_count: t.use_count + 1 })
      .eq("id", t.id);
    navigateToCompose(t.body);
  };

  const useStarter = async (t: typeof STARTER_TEMPLATES[number]) => {
    const { data } = await supabase
      .from("message_templates")
      .insert({ name: t.name, body: t.body, category: t.category })
      .select()
      .single();
    if (data) {
      await supabase
        .from("message_templates")
        .update({ use_count: 1 })
        .eq("id", data.id);
    }
    navigateToCompose(t.body);
  };

  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);
  const hasTemplates = templates.length > 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
          <p className="text-slate-500 text-sm mt-0.5">Reusable SMS templates for common business messages</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={15} /> New Template
        </button>
      </div>

      {hasTemplates && (
        <div className="flex gap-2">
          {["all", ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === c ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 && !hasTemplates ? (
        <div>
          <div className="text-center py-8 mb-6">
            <FileText size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No templates yet</p>
            <p className="text-slate-300 text-sm mt-1">Create your own or start with one of our examples</p>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-3">Starter templates</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STARTER_TEMPLATES.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{t.name}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                  </div>
                  <button onClick={() => useStarter(t)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Send size={11} /> Use
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">{t.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => useTemplate(t)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Use this template"
                  >
                    <Send size={11} /> Use
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{t.body}</p>
              <p className="text-xs text-slate-300 mt-3">Used {t.use_count} time{t.use_count !== 1 ? "s" : ""} &bull; {t.body.length} chars</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Appointment Reminder" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <div className="relative">
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MessageTemplate["category"] }))} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message Body</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required rows={5} maxLength={1600} placeholder="Use {{variable}} for dynamic content, e.g. {{name}}" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
                <p className="mt-1 text-xs text-slate-400">{form.body.length}/1600 characters</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <CheckCircle2 size={14} /> {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
