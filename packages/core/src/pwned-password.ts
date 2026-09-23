/** Have I Been Pwned range (k-anonymity) check. Never sends the full password. */

export type PwnedCheckResult = "pwned" | "clear" | "unavailable";

const HIBP_RANGE = "https://api.pwnedpasswords.com/range/";

/** SHA-1 hex (uppercase) of a UTF-8 string via Web Crypto. */
export async function sha1Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Check whether a password appears in known breaches using HIBP's range API.
 * Only the first 5 hex chars of the SHA-1 are sent. Network failures return
 * `"unavailable"` (caller must not treat that as safe, and must not block forever).
 */
export async function checkPwnedPassword(password: string): Promise<PwnedCheckResult> {
  if (!password) return "clear";
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`${HIBP_RANGE}${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return "unavailable";
    const body = await res.text();
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [hashSuffix, countRaw] = trimmed.split(":");
      if (hashSuffix?.toUpperCase() === suffix) {
        const count = Number(countRaw);
        return Number.isFinite(count) && count > 0 ? "pwned" : "clear";
      }
    }
    return "clear";
  } catch {
    return "unavailable";
  }
}

/** Debounced live HIBP monitor for password strength UIs. */
export class PwnedPasswordChecker {
  pwned = false;
  checking = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  constructor(
    private readonly onUpdate: () => void,
    private readonly debounceMs = 400
  ) {}

  /** Schedule a check after debounce. Clears pwned until a positive hit. */
  schedule(password: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.pwned = false;
    if (!password || password.length < 8) {
      this.checking = false;
      this.seq += 1;
      this.onUpdate();
      return;
    }
    this.checking = true;
    this.onUpdate();
    const seq = ++this.seq;
    this.timer = setTimeout(() => {
      void checkPwnedPassword(password).then((result) => {
        if (seq !== this.seq) return;
        this.checking = false;
        this.pwned = result === "pwned";
        this.onUpdate();
      });
    }, this.debounceMs);
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.seq += 1;
    this.pwned = false;
    this.checking = false;
  }
}
