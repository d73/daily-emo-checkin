// Password hashing with PBKDF2-SHA256 from the built-in Web Crypto API.
// Why not Better Auth's default (scrypt in JavaScript): it can use more than the
// 10 ms of CPU time per request that the Cloudflare Workers free plan allows.
// 100,000 rounds is the most Cloudflare's Web Crypto accepts, and the default.
// The round count is stored with each hash, so changing it later only affects new
// passwords; old ones still verify.
// Stored format: pbkdf2-sha256$<rounds>$<salt base64>$<hash base64>

export const MAX_ROUNDS = 100_000;
const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, rounds: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password.normalize("NFKC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: rounds },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, rounds = MAX_ROUNDS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, rounds);
  return `pbkdf2-sha256$${rounds}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [scheme, roundsStr, saltB64, hashB64] = hash.split("$");
  const rounds = Number(roundsStr);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS || !saltB64 || !hashB64) return false;
  const expected = fromB64(hashB64);
  const actual = await derive(password, fromB64(saltB64), rounds);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
