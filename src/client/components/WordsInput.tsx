import { useState } from "react";
import { countWords, wordRule, type Page } from "../../shared/flow";

export function WordsInput({
  page,
  onSubmit,
  disabled,
  buttonLabel = "Next",
  placeholder,
}: {
  page: Page;
  onSubmit: (text: string) => Promise<boolean | void> | void;
  disabled?: boolean;
  buttonLabel?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const n = countWords(text);
  const { min, max } = wordRule(page);
  const tooMany = max !== null && n > max;
  const ready = n >= min && !tooMany;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || disabled) return;
    const ok = await onSubmit(text.trim());
    if (ok !== false) setText("");
  }

  return (
    <form onSubmit={submit} className="words">
      {max !== null ? (
        <input
          aria-label="Your answer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          autoFocus
          disabled={disabled}
        />
      ) : (
        <textarea
          aria-label="Your answer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus
          disabled={disabled}
        />
      )}
      <div className="words-footer">
        <span className={`small ${tooMany ? "error" : "muted"}`}>
          {tooMany ? `Please use ${max} words or fewer.` : max !== null ? `${n} / ${max} words` : `${n} words`}
        </span>
        {/* Next appears once there are enough words. */}
        {ready && (
          <button type="submit" className="primary" disabled={disabled}>
            {buttonLabel}
          </button>
        )}
      </div>
    </form>
  );
}
