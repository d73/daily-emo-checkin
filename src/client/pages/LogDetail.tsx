import { useEffect, useState } from "react";
import { api, formatDateTime, formatDay, formatTime, type Checkin, type LogEvent } from "../api";
import { STATUS_LABEL } from "../../shared/flow";

const WHO = { user: "You", app: "App", ai: "AI" } as const;

export function LogDetail({ id }: { id: string }) {
  const [log, setLog] = useState<{ checkin: Checkin; events: LogEvent[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ checkin: Checkin; events: LogEvent[] }>(`/checkins/${id}`)
      .then(setLog)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  return (
    <section className="card">
      <a href="#/logs" className="back">
        ← All logs
      </a>
      {error && <p className="error">{error}</p>}
      {!log && !error && <p className="muted">Loading…</p>}
      {log && (
        <>
          <h1>{formatDateTime(log.checkin.startedAt)}</h1>
          <p className="muted small">
            Day: {formatDay(log.checkin.day)} · Mood {log.checkin.startScore} → {log.checkin.latestScore} ·{" "}
            {STATUS_LABEL[log.checkin.status]}
          </p>
          <ol className="timeline">
            {log.events.map((e) => (
              <li key={e.seq} className={`event ${e.actor}`}>
                <span className="event-meta small muted">
                  {formatTime(e.at)} · {WHO[e.actor]}
                </span>
                {e.score !== null && <span className="event-text">Score: {e.score} / 10</span>}
                {e.exercise && <strong className="event-text">Exercise: {e.exercise.name}</strong>}
                {e.text && <span className="event-text">{e.text}</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
