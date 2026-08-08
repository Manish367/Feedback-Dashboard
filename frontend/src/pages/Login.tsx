import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div className="login-card">
        <h1>Performance Feedback</h1>
        <p className="subtitle">One login for every company on the platform.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="subtitle" style={{ marginTop: 20, fontSize: 12 }}>
          Demo password for every seeded user: <code>password123</code>
        </p>
      </div>
    </div>
  );
}
