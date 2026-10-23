import { useEffect, useState } from "react";
import { api, localTimeZone, type Me } from "../api";
import { authClient } from "../auth";

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function SettingsTab() {
  const [me, setMe] = useState<Me | null>(null);
  const [morning, setMorning] = useState("06:00");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>("/me")
      .then((m) => {
        setMe(m);
        setMorning(toTime(m.morningStartMinutes));
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  async function saveMorning(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/settings", { method: "PUT", body: { morningStartMinutes: fromTime(morning), timezone: localTimeZone() } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDeleteError(null);
    try {
      await api("/account/delete", { body: { password } });
      await authClient.signOut().catch(() => {});
      window.location.hash = "#/";
      window.location.reload();
    } catch (err) {
      setDeleteError((err as Error).message);
      setBusy(false);
    }
  }

  if (!me && !error) return <p className="center muted">Loading…</p>;

  return (
    <section className="card">
      <h1>Settings</h1>
      {me && (
        <p className="muted small">
          Signed in as <strong>{me.username}</strong> ({me.email})
        </p>
      )}

      <form onSubmit={saveMorning} className="stack setting">
        <label>
          My morning starts at
          <input type="time" value={morning} onChange={(e) => setMorning(e.target.value)} required />
        </label>
        <p className="muted small">Check-ins before this time count for the previous day.</p>
        <button className="secondary">{saved ? "Saved" : "Save"}</button>
      </form>
      {error && <p className="error">{error}</p>}

      <button className="secondary" onClick={() => authClient.signOut().then(() => (window.location.hash = "#/"))}>
        Sign out
      </button>

      <div className="danger-zone">
        <h2>Delete account</h2>
        {!deleting ? (
          <>
            <p className="small">Deletes your account and every check-in you have logged.</p>
            <button className="danger" onClick={() => setDeleting(true)}>
              Delete my account and all data
            </button>
          </>
        ) : (
          <form onSubmit={deleteAccount} className="stack">
            <p className="small">
              <strong>This cannot be undone.</strong> Your account, all check-ins and all logs will be deleted.
            </p>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <label>
              Type DELETE to confirm
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            </label>
            {deleteError && <p className="error">{deleteError}</p>}
            <div className="choices">
              <button className="danger" disabled={busy || confirmText !== "DELETE" || !password}>
                {busy ? "Deleting…" : "Delete forever"}
              </button>
              <button type="button" className="secondary" onClick={() => setDeleting(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
