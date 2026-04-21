import { NavLink } from "../NavLink";
import {
  LayoutDashboard, MessageSquare, Phone, Webhook,
  Settings, ShieldCheck, FileText, LogOut, Zap, LifeBuoy,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../context/AppContext";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/numbers", icon: Phone, label: "Phone Numbers" },
  { to: "/webhooks", icon: Webhook, label: "Webhooks" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/compliance", icon: ShieldCheck, label: "Compliance" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/support", icon: LifeBuoy, label: "Support" },
];

export function Sidebar() {
  const { profile } = useApp();

  return (
    <aside className="w-64 bg-slate-900 flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm leading-tight truncate">TextFlow</p>
            <p className="text-slate-400 text-xs truncate">
              {profile?.business_name || "Business SMS"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} icon={Icon} label={label} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
