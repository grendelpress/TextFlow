import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Message } from "../types";
import {
  MessageSquare, TrendingUp, Users, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Phone, AlertCircle,
} from "lucide-react";

interface Stats {
  total: number;
  sent: number;
  received: number;
  failed: number;
  contacts: number;
  deliveryRate: number;
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function StatCard({ label, value, icon: Icon, trend, color }: {
  label: string; value: string | number; icon: React.ElementType;
  trend?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  const statusColors: Record<string, string> = {
    delivered: "bg-emerald-100 text-emerald-700",
    sent: "bg-blue-100 text-blue-700",
    received: "bg-slate-100 text-slate-700",
    failed: "bg-red-100 text-red-700",
    undelivered: "bg-orange-100 text-orange-700",
    queued: "bg-yellow-100 text-yellow-700",
    pending: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        msg.direction === "inbound" ? "bg-blue-100" : "bg-slate-100"
      }`}>
        {msg.direction === "inbound"
          ? <ArrowDownRight size={14} className="text-blue-600" />
          : <ArrowUpRight size={14} className="text-slate-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-800">{msg.contact_phone}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[msg.status] || "bg-slate-100 text-slate-500"}`}>
            {msg.status}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate">{msg.body}</p>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

export function Dashboard() {
  const { profile } = useApp();
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, received: 0, failed: 0, contacts: 0, deliveryRate: 0 });
  const [recent, setRecent] = useState<Message[]>([]);
  const [phoneCount, setPhoneCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [msgRes, pnRes] = await Promise.all([
        supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("phone_numbers").select("id").eq("is_active", true),
      ]);

      const messages = msgRes.data || [];
      const sent = messages.filter((m) => m.direction === "outbound").length;
      const received = messages.filter((m) => m.direction === "inbound").length;
      const failed = messages.filter((m) => m.status === "failed" || m.status === "undelivered").length;
      const delivered = messages.filter((m) => m.status === "delivered").length;
      const contacts = new Set(messages.map((m) => m.contact_phone)).size;
      const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;

      setStats({ total: messages.length, sent, received, failed, contacts, deliveryRate });
      setRecent(messages.slice(0, 8));
      setPhoneCount((pnRes.data || []).length);
      setLoading(false);
    };
    load();
  }, []);

  const hasCredentials = profile?.signalwire_project_id && profile?.signalwire_api_token;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          {profile?.contact_name ? `, ${profile.contact_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-0.5">Here's what's happening with your SMS today.</p>
      </div>

      {!hasCredentials && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">SignalWire not connected</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Add your SignalWire credentials in{" "}
              <a href="/settings" className="underline font-medium" onClick={(e) => { e.preventDefault(); navigate("/settings"); }}>
                Settings
              </a>{" "}
              to start sending and receiving SMS.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Messages" value={stats.total} icon={MessageSquare} color="bg-blue-50 text-blue-600" />
          <StatCard label="Sent" value={stats.sent} icon={ArrowUpRight} trend={`${stats.deliveryRate}% delivery rate`} color="bg-slate-50 text-slate-600" />
          <StatCard label="Received" value={stats.received} icon={ArrowDownRight} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Contacts Reached" value={stats.contacts} icon={Users} color="bg-orange-50 text-orange-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <a href="/messages" onClick={(e) => { e.preventDefault(); navigate("/messages"); }} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </a>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare size={32} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No messages yet</p>
              <p className="text-slate-300 text-xs mt-1">Send your first SMS to get started</p>
            </div>
          ) : (
            recent.map((m) => <MessageRow key={m.id} msg={m} />)
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Account Status</h2>
            <div className="space-y-3">
              {[
                { label: "SignalWire", ok: !!hasCredentials, okText: "Connected", failText: "Not connected" },
                { label: "Phone Numbers", ok: phoneCount > 0, okText: `${phoneCount} active`, failText: "None provisioned" },
                { label: "Compliance", ok: true, okText: "Opt-out enabled", failText: "" },
              ].map(({ label, ok, okText, failText }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                      {ok ? okText : failText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Send a message", href: "/messages", icon: MessageSquare },
                { label: "Add phone number", href: "/numbers", icon: Phone },
                { label: "View compliance", href: "/compliance", icon: CheckCircle2 },
                { label: "Configure webhooks", href: "/webhooks", icon: TrendingUp },
              ].map(({ label, href, icon: Icon }) => (
                <a key={href} href={href} onClick={(e) => { e.preventDefault(); navigate(href); }} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <Icon size={15} className="text-slate-400" />
                  <span className="text-sm text-slate-700">{label}</span>
                  <ArrowUpRight size={13} className="text-slate-300 ml-auto" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
