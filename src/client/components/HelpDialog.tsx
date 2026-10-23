import { CRISIS_RESOURCES } from "../../shared/crisis";

export function CrisisResources() {
  return (
    <ul className="resources">
      {CRISIS_RESOURCES.map((r) => (
        <li key={r.label}>
          <a href={r.href}>{r.label}</a>
          <span className="muted">{r.detail}</span>
        </li>
      ))}
    </ul>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 id="help-title">Need help now?</h2>
        <p>If you are thinking about hurting yourself or are in danger, please reach out now. You don't have to go through this alone.</p>
        <CrisisResources />
        <p className="muted small">This app is a self-reflection tool. It is not therapy and not an emergency service.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
