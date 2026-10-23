import { useEffect, useState } from "react";
import { authClient } from "./auth";
import { AuthScreen } from "./pages/AuthScreen";
import { MainTab } from "./pages/MainTab";
import { LogsTab } from "./pages/LogsTab";
import { LogDetail } from "./pages/LogDetail";
import { SettingsTab } from "./pages/SettingsTab";
import { HelpDialog } from "./components/HelpDialog";

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const hash = useHash();
  const [helpOpen, setHelpOpen] = useState(false);

  if (isPending) return <div className="center muted">Loading…</div>;

  const logMatch = hash.match(/^#\/logs\/([\w-]+)$/);
  const tab = hash.startsWith("#/logs") ? "logs" : hash.startsWith("#/settings") ? "settings" : "main";

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Daily Check-in</span>
        <button className="help-link" onClick={() => setHelpOpen(true)}>
          Need help now?
        </button>
      </header>

      <main className="content">
        {!session ? (
          <AuthScreen />
        ) : logMatch ? (
          <LogDetail id={logMatch[1]} />
        ) : tab === "logs" ? (
          <LogsTab />
        ) : tab === "settings" ? (
          <SettingsTab />
        ) : (
          <MainTab />
        )}
      </main>

      {session && (
        <nav className="tabs" aria-label="Tabs">
          <a href="#/" className={tab === "main" ? "active" : ""}>
            Check-in
          </a>
          <a href="#/logs" className={tab === "logs" ? "active" : ""}>
            Logs
          </a>
          <a href="#/settings" className={tab === "settings" ? "active" : ""}>
            Settings
          </a>
        </nav>
      )}

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
