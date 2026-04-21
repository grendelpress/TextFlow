import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { hasSupabaseConfig } from "./lib/supabase";
import { AuthPage } from "./pages/AuthPage";
import { SetupWizard } from "./pages/SetupWizard";
import { Dashboard } from "./pages/Dashboard";
import { MessagesPage } from "./pages/MessagesPage";
import { PhoneNumbersPage } from "./pages/PhoneNumbersPage";
import { WebhooksPage } from "./pages/WebhooksPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { CompliancePage } from "./pages/CompliancePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { Sidebar } from "./components/Layout/Sidebar";
import { Zap } from "lucide-react";

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  return path;
}

function AppShell() {
  const { user, profile, loading } = useApp();
  const path = useRoute();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse">
            <Zap size={24} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading TextFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!profile?.setup_completed) return <SetupWizard />;

  const page = (() => {
    if (path === "/" || path === "") return <Dashboard />;
    if (path === "/messages") return <MessagesPage />;
    if (path === "/numbers") return <PhoneNumbersPage />;
    if (path === "/webhooks") return <WebhooksPage />;
    if (path === "/templates") return <TemplatesPage />;
    if (path === "/compliance") return <CompliancePage />;
    if (path === "/settings") return <SettingsPage />;
    if (path === "/support") return <SupportPage />;
    return <Dashboard />;
  })();

  const isMessages = path === "/messages";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 ${isMessages ? "overflow-hidden flex flex-col" : "overflow-auto"}`}>{page}</main>
    </div>
  );
}

export default function App() {
  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Configuration required</h1>
          <p className="text-slate-400 text-sm mb-4">
            Supabase environment variables are missing. Please ensure <code className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">VITE_SUPABASE_URL</code> and <code className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">VITE_SUPABASE_ANON_KEY</code> are set in your <code className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">.env</code> file, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
