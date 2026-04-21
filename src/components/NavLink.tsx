import { Video as LucideIcon } from "lucide-react";

interface Props {
  to: string;
  icon: LucideIcon;
  label: string;
}

export function NavLink({ to, icon: Icon, label }: Props) {
  const current = window.location.pathname === to || (to !== "/" && window.location.pathname.startsWith(to));

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        window.history.pushState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        current
          ? "bg-blue-600 text-white font-medium"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <Icon size={16} />
      {label}
    </a>
  );
}
