import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { FeedbackEntry, Parameter } from "../lib/types";
import { useAuth } from "../lib/AuthContext";

export default function MyFeedback() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackEntry[] | null>(null);
  const [parameters, setParameters] = useState<Parameter[] | null>(null);

  useEffect(() => {
    api.get<FeedbackEntry[]>("/me/feedback").then(setFeedback);
    api.get<Parameter[]>("/parameters").then(setParameters);
  }, []);

  if (!feedback || !parameters) return <p className="empty-state">Loading...</p>;

  if (feedback.length === 0) {
    return (
      <div className="card">
        <h1>My Feedback</h1>
        <p className="subtitle">Your monthly feedback history, once it starts coming in, will show up here.</p>
        <p className="empty-state">No feedback recorded yet.</p>
      </div>
    );
  }

  const periods = feedback.map((f) => f.period);

  return (
    <div>
      <div className="card">
        <h1>My Feedback</h1>
        <p className="subtitle">
          Scores over time, per parameter{user?.manager ? ` — from ${user.manager.name}` : ""}.
        </p>
        {parameters.map((param) => {
          const points = feedback.map((f) => {
            const s = f.scores.find((sc) => sc.parameter.id === param.id);
            return { period: f.period, score: s?.score ?? 0 };
          });
          return (
            <div className="trend-row" key={param.id}>
              <div className="trend-label">{param.label}</div>
              <div className="trend-points">
                {points.map((p) => (
                  <div className="trend-point" key={p.period}>
                    <div className="bar">
                      <div className="bar-fill" style={{ height: `${(p.score / 5) * 100}%` }} title={`${p.score}/5`} />
                    </div>
                    <div>{p.score || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="trend-row" style={{ marginTop: 4 }}>
          <div className="trend-label" />
          <div className="trend-points">
            {periods.map((p) => (
              <div className="trend-point period" key={p}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Feedback detail by month</h2>
        {[...feedback].reverse().map((f) => (
          <div key={f.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>{f.period}</strong>
              <span className="subtitle" style={{ margin: 0 }}>
                from {f.manager.name}
              </span>
            </div>
            {f.scores.map((s) => (
              <div className="param-row" key={s.id}>
                <div>{s.parameter.label}</div>
                <div>{s.comment}</div>
                <div style={{ textAlign: "right", fontWeight: 600 }}>{s.score}/5</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
