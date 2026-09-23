/** Persist the last successful sign-in method so the next visit can highlight it. */

import type { AuthUIMethods } from "./types.js";

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

const PENDING_OAUTH_KEY = "authui:pending-oauth";

/** Remember which OAuth provider the user clicked, until the session succeeds or fails. */
export function stashPendingOAuth(provider: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_OAUTH_KEY, provider);
  } catch {
    /* private mode / quota */
  }
}

/** Persist a previously stashed OAuth provider as the last method, then clear the stash. */
export function rememberPendingOAuth(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const provider = sessionStorage.getItem(PENDING_OAUTH_KEY);
    sessionStorage.removeItem(PENDING_OAUTH_KEY);
    if (provider) rememberLastMethod(`oauth:${provider}`);
  } catch {
    /* ignore */
  }
}

/** Drop a stashed OAuth provider without remembering it (cancel / failure). */
export function clearPendingOAuth(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_OAUTH_KEY);
  } catch {
    /* ignore */
  }
}

/** How many distinct sign-in options are configured (each OAuth provider counts). */
export function countSignInMethods(methods?: AuthUIMethods | null): number {
  const m = methods ?? {};
  let n = 0;
  if (m.emailPassword !== false) n += 1;
  if (m.magicUrl) n += 1;
  if (m.emailOtp) n += 1;
  if (m.phone) n += 1;
  if (m.anonymous) n += 1;
  n += m.oauth?.length ?? 0;
  return n;
}

/** Last-used badges only help when the user can choose among multiple methods. */
export function showLastUsedBadge(methods?: AuthUIMethods | null): boolean {
  return countSignInMethods(methods) > 1;
}
