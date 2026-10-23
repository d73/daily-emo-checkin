import { useEffect, useState } from "react";
import { api, ApiError, localTimeZone, type Checkin, type Me, type PageData, type StepResponse } from "../api";
import { PROMPTS } from "../../shared/flow";
import { ScorePicker } from "../components/ScorePicker";
import { WordsInput } from "../components/WordsInput";
import { CrisisResources } from "../components/HelpDialog";

export function MainTab() {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [data, setData] = useState<PageData>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);

  useEffect(() => {
    // Resume a check-in in progress, if any.
    Promise.all([api<StepResponse | { checkin: null }>("/checkins/current"), api<Me>("/me")])
      .then(([cur, me]) => {
        if (cur.checkin) {
          setCheckin(cur.checkin);
          setData((cur as StepResponse).data ?? {});
        }
        setPractice(!me.aiConnected);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function run(call: () => Promise<StepResponse>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await call();
      setCheckin(res.checkin);
      setData(res.data ?? {});
      return true;
    } catch (e) {
      const err = e as ApiError;
      // Out of step (for example, two open tabs): jump to where the server is.
      if (err.status === 409 && err.body?.checkin) {
        setCheckin(err.body.checkin as Checkin);
        setData((err.body.data as PageData) ?? {});
      }
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const start = (score: number) =>
    run(() => api("/checkins", { body: { score, timezone: localTimeZone() } }));
  const step = (body: Record<string, unknown>) =>
    run(() => api(`/checkins/${checkin!.id}/step`, { body: { page: checkin!.page, ...body } }));
  const end = () => run(() => api(`/checkins/${checkin!.id}/end`, { method: "POST" }));
  const reset = () => (setCheckin(null), setData({}), setError(null));

  if (loading) return <p className="center muted">Loading…</p>;

  const page = checkin && (checkin.status === "open" || checkin.page === "crisis" || checkin.page === "ended") ? checkin.page : "checkin";
  const inSession = page !== "checkin" && page !== "crisis" && page !== "ended";

  return (
    <section className="card flow">
      {practice && inSession && (page === "talk-more" || page === "exercise") && (
        <p className="badge">Practice mode: AI not connected, replies are canned.</p>
      )}

      {page === "checkin" && (
        <>
          <h1>{PROMPTS.checkin}</h1>
          <ScorePicker onPick={start} disabled={busy} />
        </>
      )}

      {page === "feeling" && (
        <>
          <h1>{PROMPTS.feeling}</h1>
          <WordsInput key={`feeling-${checkin!.round}`} page="feeling" onSubmit={(text) => step({ text })} disabled={busy} placeholder="e.g. tired, anxious, hopeful" />
        </>
      )}

      {page === "talk" && (
        <>
          <h1>{PROMPTS.talk}</h1>
          <WordsInput key={`talk-${checkin!.round}`} page="talk" onSubmit={(text) => step({ text })} disabled={busy} />
        </>
      )}

      {page === "choice" && (
        <>
          <h1>{PROMPTS.choice}</h1>
          <div className="choices">
            <button className="primary" disabled={busy} onClick={() => step({ choice: "talk" })}>
              Talk about it
            </button>
            <button className="primary" disabled={busy} onClick={() => step({ choice: "exercise" })}>
              Try an exercise
            </button>
          </div>
          {busy && <p className="muted">Finding an exercise for you…</p>}
        </>
      )}

      {page === "talk-more" && (
        <>
          <h1>{PROMPTS["talk-more"]}</h1>
          <div className="chat">
            {(data.messages ?? []).map((m, i) => (
              <p key={i} className={`bubble ${m.actor}`}>
                {m.text}
              </p>
            ))}
            {busy && <p className="bubble ai muted">…</p>}
          </div>
          <WordsInput
            key={`talkmore-${checkin!.round}`}
            page="talk-more"
            onSubmit={(text) => step({ text })}
            disabled={busy}
            buttonLabel="Send"
            placeholder={(data.messages ?? []).length ? "Write more, or continue below" : "Write as much as you like"}
          />
          {(data.messages ?? []).length > 0 && (
            <button className="secondary" disabled={busy} onClick={() => step({ action: "done" })}>
              I'm done talking
            </button>
          )}
        </>
      )}

      {page === "exercise" && data.exercise && (
        <>
          <h1>{data.exercise.name}</h1>
          <p>{data.exercise.intro}</p>
          <ol className="steps">
            {data.exercise.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <button className="primary" disabled={busy} onClick={() => step({ action: "done" })}>
            I'm done
          </button>
        </>
      )}

      {page === "feeling-now" && (
        <>
          <h1>{PROMPTS["feeling-now"]}</h1>
          <p className="muted small">You started at {checkin!.startScore}.</p>
          <ScorePicker onPick={(score) => step({ score })} disabled={busy} />
        </>
      )}

      {page === "grounded" && (
        <>
          <h1>Thank you for sharing.</h1>
          <p>
            You went from {checkin!.startScore} to {checkin!.latestScore}. It sounds like you're feeling more steady. Would you
            like to end this check-in?
          </p>
          <div className="choices">
            <button className="primary" disabled={busy} onClick={end}>
              End check-in
            </button>
            <button className="secondary" disabled={busy} onClick={() => step({ action: "continue" })}>
              Keep going
            </button>
          </div>
        </>
      )}

      {page === "crisis" && (
        <>
          <h1>You don't have to go through this alone.</h1>
          <p>
            It sounds like you may be going through something really hard. Please reach out to someone who can help right
            now.
          </p>
          <CrisisResources />
          <p className="muted small">This check-in has ended. This app is not an emergency service.</p>
          <button className="secondary" onClick={reset}>
            Back to start
          </button>
        </>
      )}

      {page === "ended" && (
        <>
          <h1>Thanks for checking in.</h1>
          <p>
            You started at {checkin!.startScore} and ended at {checkin!.latestScore}.
          </p>
          <div className="choices">
            <a className="button secondary" href="#/logs">
              See logs
            </a>
            <button className="secondary" onClick={reset}>
              New check-in
            </button>
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}

      {inSession && page !== "grounded" && (
        <button className="link end" disabled={busy} onClick={end}>
          End check-in
        </button>
      )}
    </section>
  );
}
