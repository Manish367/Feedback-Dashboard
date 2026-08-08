import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: "center", padding: 48 }}>
      <h1 style={{ marginBottom: 8 }}>404 — Page not found</h1>
      <p className="subtitle">There's nothing at this URL.</p>
      <Link to="/" className="btn secondary" style={{ display: "inline-block", textDecoration: "none" }}>
        Back to My Feedback
      </Link>
    </div>
  );
}
