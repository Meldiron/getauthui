/** Persist the last successful sign-in method so the next visit can highlight it. */

const STORAGE_KEY = "authui:last-method";

export type LastMethodKey =
  "email-password" | "magic-url" | "email-otp" | "phone" | "anonymous" | `oauth:${string}`;

export function rememberLastMethod(method: string): void {
  if (typeof localStorage === "undefined") return;
  if (!method || method === "mfa" || method === "sign-up") {
    // Sign-up is still email+password for the next visit; MFA is a challenge, not a method.
    if (method === "sign-up") method = "email-password";
    else return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, method);
  } catch {
    /* private mode / quota */
  }
}

export function getLastMethod(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Test helper. */
export function clearLastMethod(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
