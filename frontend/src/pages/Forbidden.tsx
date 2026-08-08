import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Forbidden({ requiredRole }: { requiredRole: "manager" | "HR" }) {
  const { user } = useAuth();
  return (
    <div className="card" style={{ textAlign: "center", padding: 48 }}>
      <h1 style={{ marginBottom: 8 }}>403 — Access denied</h1>
      <p className="subtitle">
        {user?.name} doesn't have {requiredRole} access, so this page isn't available.
      </p>
      <Link to="/" className="btn secondary" style={{ display: "inline-block", textDecoration: "none" }}>
        Back to My Feedback
      </Link>
    </div>
  );
}
