import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { TrackerResponse } from "../lib/types";

export default function HRTracker() {
  const [periods, setPeriods] = useState<string[] | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerResponse | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);

  useEffect(() => {
    api.get<string[]>("/hr/periods").then((p) => {
      setPeriods(p);
      setPeriod(p[p.length - 1]);
    });
  }, []);

  useEffect(() => {
    if (!period) return;
    api.get<TrackerResponse>(`/hr/tracker?period=${period}`).then(setTracker);
  }, [period]);

  if (!periods || !period || !tracker) return <p className="empty-state">Loading...</p>;

  const rows = onlyMissing ? tracker.rows.filter((r) => !r.submitted) : tracker.rows;

  return (
    <div>
      <div className="card">
        <h1>HR Dashboard — Submission Tracker</h1>
        <p className="subtitle">Every manager → direct-report pair in your company, and whether that month's feedback is in.</p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="pill-select">
            {periods.map((p) => (
              <button key={p} className={p === period ? "active" : ""} onClick={() => setPeriod(p)}>
                {p}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Only show missing
          </label>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <Stat label="Total pairs" value={tracker.total} />
          <Stat label="Submitted" value={tracker.total - tracker.missingCount} />
          <Stat label="Missing" value={tracker.missingCount} highlight={tracker.missingCount > 0} />
        </div>
        {rows.length === 0 ? (
          <p className="empty-state">Nothing to show for this filter.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Submitted at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>
                    {r.employeeName}
                    <div className="subtitle" style={{ margin: 0 }}>
                      {r.employeeTitle}
                    </div>
                  </td>
                  <td>{r.managerName}</td>
                  <td>
                    <span className={`badge ${r.submitted ? "submitted" : "missing"}`}>
                      {r.submitted ? "Submitted" : "Missing"}
                    </span>
                  </td>
                  <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color: highlight ? "var(--danger)" : "var(--text)" }}>{value}</div>
      <div className="subtitle" style={{ margin: 0 }}>
        {label}
      </div>
    </div>
  );
}
