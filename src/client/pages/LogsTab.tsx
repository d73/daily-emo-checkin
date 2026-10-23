import { useEffect, useState } from "react";
import { api, formatDateTime, formatDay, type Checkin } from "../api";
import { STATUS_LABEL } from "../../shared/flow";

export function LogsTab() {
  const [rows, setRows] = useState<Checkin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ checkins: Checkin[] }>("/checkins")
      .then((r) => setRows(r.checkins))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="center muted">Loading…</p>;

  return (
    <section className="card">
      <h1>Logs</h1>
      {rows.length === 0 ? (
        <p className="muted">No check-ins yet.</p>
      ) : (
        <ul className="log-list">
          {rows.map((c) => (
            <li key={c.id}>
              <a href={`#/logs/${c.id}`}>
                <span className="log-when">{formatDateTime(c.startedAt)}</span>
                <span className="log-scores">
                  {c.startScore} → {c.latestScore}
                </span>
                <span className="muted small">
                  Day: {formatDay(c.day)} · {STATUS_LABEL[c.status]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
