import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { FeedbackEntry, Parameter, ReportSummary } from "../lib/types";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function recentPeriods(count = 4): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default function GiveFeedback() {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [parameters, setParameters] = useState<Parameter[] | null>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const [historyByEmployee, setHistoryByEmployee] = useState<Record<string, FeedbackEntry[]>>({});
  const [activeReport, setActiveReport] = useState<ReportSummary | null>(null);

  useEffect(() => {
    api.get<ReportSummary[]>("/me/reports").then(setReports);
    api.get<Parameter[]>("/parameters").then(setParameters);
  }, []);

  useEffect(() => {
    if (!reports) return;
    Promise.all(
      reports.map((r) => api.get<FeedbackEntry[]>(`/feedback/${r.id}`).then((fb) => [r.id, fb] as const))
    ).then((entries) => setHistoryByEmployee(Object.fromEntries(entries)));
  }, [reports]);

  const periods = useMemo(() => recentPeriods(), []);

  if (!reports || !parameters) return <p className="empty-state">Loading...</p>;

  function statusFor(employeeId: string): boolean {
    return (historyByEmployee[employeeId] ?? []).some((f) => f.period === period);
  }

  function refreshHistory(employeeId: string) {
    api.get<FeedbackEntry[]>(`/feedback/${employeeId}`).then((fb) =>
      setHistoryByEmployee((prev) => ({ ...prev, [employeeId]: fb }))
    );
  }

  return (
    <div>
      <div className="card">
        <h1>Give Feedback</h1>
        <p className="subtitle">Submit or edit monthly feedback for your direct reports.</p>
        <div className="pill-select">
          {periods.map((p) => (
            <button key={p} className={p === period ? "active" : ""} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Your team ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="empty-state">You have no direct reports.</p>
        ) : (
          <div className="grid-cards">
            {reports.map((r) => {
              const submitted = statusFor(r.id);
              return (
                <div className="report-card" key={r.id} onClick={() => setActiveReport(r)}>
                  <div className="name">{r.name}</div>
                  <div className="title">{r.title}</div>
                  <div style={{ marginTop: 10 }}>
                    <span className={`badge ${submitted ? "submitted" : "missing"}`}>
                      {submitted ? "Submitted" : "Not submitted"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeReport && (
        <FeedbackModal
          report={activeReport}
          period={period}
          parameters={parameters}
          existing={(historyByEmployee[activeReport.id] ?? []).find((f) => f.period === period) ?? null}
          onClose={() => setActiveReport(null)}
          onSaved={() => {
            refreshHistory(activeReport.id);
            setActiveReport(null);
          }}
        />
      )}
    </div>
  );
}

function FeedbackModal({
  report,
  period,
  parameters,
  existing,
  onClose,
  onSaved,
}: {
  report: ReportSummary;
  period: string;
  parameters: Parameter[];
  existing: FeedbackEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, { score: number; comment: string }>>(() => {
    const initial: Record<string, { score: number; comment: string }> = {};
    for (const p of parameters) {
      const existingScore = existing?.scores.find((s) => s.parameter.id === p.id);
      initial[p.id] = { score: existingScore?.score ?? 3, comment: existingScore?.comment ?? "" };
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError(null);
    const scores = parameters.map((p) => ({
      parameterId: p.id,
      score: values[p.id].score,
      comment: values[p.id].comment.trim(),
    }));
    if (scores.some((s) => !s.comment)) {
      setError("Please add a short comment for every parameter.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/feedback", { employeeId: report.id, period, scores });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {existing ? "Edit" : "Give"} feedback for {report.name} — {period}
        </h2>
        {parameters.map((p) => (
          <div className="field" key={p.id}>
            <label>
              {p.label} — {values[p.id].score}/5
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={values[p.id].score}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [p.id]: { ...prev[p.id], score: Number(e.target.value) } }))
              }
              style={{ width: "100%" }}
            />
            <textarea
              placeholder={`Why this score for ${p.label.toLowerCase()}?`}
              value={values[p.id].comment}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [p.id]: { ...prev[p.id], comment: e.target.value } }))
              }
            />
          </div>
        ))}
        {error && <p className="error-text">{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" onClick={handleSubmit} disabled={busy}>
            {busy ? "Saving..." : existing ? "Save changes" : "Submit feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
