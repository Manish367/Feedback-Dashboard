import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">Perf Feedback</span>
          <span className="company-tag">{user.company.name}</span>
          <nav className="tabs">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              My Feedback
            </NavLink>
            {user.isManager && (
              <NavLink to="/give" className={({ isActive }) => (isActive ? "active" : "")}>
                Give Feedback
              </NavLink>
            )}
            {user.isHR && (
              <NavLink to="/hr" className={({ isActive }) => (isActive ? "active" : "")}>
                HR Dashboard
              </NavLink>
            )}
          </nav>
        </div>
        <div className="topbar-right">
          <span>
            {user.name} · {user.title ?? "—"}
          </span>
          {user.manager && <span className="manager-tag">Manager: {user.manager.name}</span>}
          <button className="linklike" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
