// First line of crisis detection: a phrase list run on every text entry.
// The AI also judges crisis risk on the pages where it is used.
// False positives are accepted on purpose: showing support resources by mistake
// costs far less than missing someone at risk.

const PHRASES = [
  "kill myself",
  "killing myself",
  "suicide",
  "suicidal",
  "end my life",
  "ending my life",
  "take my life",
  "end it all",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "better off without me",
  "dont want to be here",
  "dont want to live",
  "dont want to be alive",
  "no reason to live",
  "nothing to live for",
  "not worth living",
  "hurt myself",
  "hurting myself",
  "harm myself",
  "self harm",
  "selfharm",
  "cut myself",
  "cutting myself",
  "overdose",
  "kms",
];

export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

export function looksLikeCrisis(text: string): boolean {
  const t = normalize(text);
  return PHRASES.some((p) => t.includes(` ${p} `));
}

export type CrisisResource = { label: string; detail: string; href?: string };

// US only for now. Before a public launch: pick resources by the user's country.
export const CRISIS_RESOURCES: CrisisResource[] = [
  { label: "Call or text 988", detail: "Suicide & Crisis Lifeline (US), 24/7", href: "tel:988" },
  { label: "Text HOME to 741741", detail: "Crisis Text Line (US), 24/7", href: "sms:741741?body=HOME" },
  { label: "Call 911", detail: "If you are in immediate danger", href: "tel:911" },
];
