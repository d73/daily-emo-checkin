import { useState } from "react";
import { authClient } from "../auth";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "signin"
        ? await authClient.signIn.username({ username, password })
        : await authClient.signUp.email({ username, email, password, name: username });
    setBusy(false);
    if (res.error) setError(friendly(res.error));
  }

  return (
    <section className="card">
      <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="stack">
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} />
        </label>
        {mode === "signup" && (
          <label>
            Email <span className="muted small">(for password reset later)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
        )}
        <label>
          Password <span className="muted small">{mode === "signup" && "(at least 8 characters)"}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button className="link" onClick={() => (setMode(mode === "signin" ? "signup" : "signin"), setError(null))}>
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      <p className="muted small notice">
        This app is a self-reflection tool. It is not therapy and not an emergency service. What you write is stored on
        our server and, on some pages, sent to an AI service (Anthropic) to write a reply.
      </p>
    </section>
  );
}

function friendly(err: { status?: number; message?: string; code?: string }) {
  if (err.status === 429) return "Too many tries. Please wait a while and try again.";
  if (err.status === 401 || err.code === "INVALID_USERNAME_OR_PASSWORD") return "Wrong username or password.";
  return err.message || "Something went wrong. Please try again.";
}
