import { authStore } from "./store.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Minimal GIS surface used by Auth UI One Tap. */
interface GoogleIdConfig {
  client_id: string;
  callback: (response: { credential?: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: string;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  /** Raw nonce; GIS puts it (or a hash) on the ID token claim. */
  nonce?: string;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  prompt: (
    listener?: (notification: {
      isNotDisplayed: () => boolean;
      isSkippedMoment: () => boolean;
      isDismissedMoment: () => boolean;
      getNotDisplayedReason?: () => string;
      getSkippedReason?: () => string;
      getDismissedReason?: () => string;
    }) => void
  ) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<GoogleAccountsId | null> | null = null;
let promptedForClientId: string | null = null;

/** 32 cryptographically random bytes as lowercase hex (64 chars). */
export function generateOneTapNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Load the Google Identity Services client once. Soft-fails to null. */
export function loadGoogleIdentityServices(): Promise<GoogleAccountsId | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const prior = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const finish = () => {
      const id = window.google?.accounts?.id ?? null;
      resolve(id);
    };
    if (prior) {
      if (window.google?.accounts?.id) {
        finish();
        return;
      }
      prior.addEventListener("load", finish, { once: true });
      prior.addEventListener("error", () => resolve(null), { once: true });
      // Already failed or still loading; give a short grace period.
      setTimeout(finish, 2000);
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface OneTapOptions {
  /** Google OAuth 2.0 Web client ID (from Google Cloud, not Appwrite). */
  clientId: string;
  /** Called after a session is created successfully. */
  onSuccess?: () => void;
  /** Soft-fail logger; defaults to console.warn. */
  onSoftFail?: (reason: string) => void;
}

/**
 * Initialize GIS and show the One Tap prompt once per client id / page session.
 * Never throws into the UI: missing GIS, dismissals and FedCM cool-downs soft-fail.
 * Generates a per-prompt nonce for GIS and Appwrite `createIdTokenSession`, then discards it.
 */
export async function promptGoogleOneTap(options: OneTapOptions): Promise<void> {
  const clientId = options.clientId.trim();
  if (!clientId) {
    options.onSoftFail?.("one-tap: missing googleClientId");
    return;
  }
  if (promptedForClientId === clientId) return;
  promptedForClientId = clientId;

  const soft = (reason: string) => {
    options.onSoftFail?.(reason);
  };

  let googleId: GoogleAccountsId | null = null;
  try {
    googleId = await loadGoogleIdentityServices();
  } catch {
    soft("one-tap: failed to load Google Identity Services");
    return;
  }
  if (!googleId) {
    soft("one-tap: Google Identity Services unavailable");
    return;
  }

  // Per-prompt nonce: GIS embeds it on the JWT; Appwrite requires the same value when
  // the token carries a nonce claim (otherwise "Nonce required").
  let nonce: string | null = generateOneTapNonce();

  try {
    googleId.initialize({
      client_id: clientId,
      nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: (response) => {
        const idToken = response.credential?.trim();
        const sessionNonce = nonce;
        nonce = null;
        if (!idToken) {
          soft("one-tap: empty credential");
          return;
        }
        void (async () => {
          try {
            await authStore.createIdTokenSession({
              provider: "google",
              idToken,
              ...(sessionNonce ? { nonce: sessionNonce } : {}),
            });
            options.onSuccess?.();
          } catch {
            // createIdTokenSession already emits error / fail; keep email/OAuth usable.
            soft("one-tap: createIdTokenSession failed");
          }
        })();
      },
    });

    googleId.prompt((notification) => {
      try {
        if (notification.isNotDisplayed()) {
          soft(`one-tap: not displayed (${notification.getNotDisplayedReason?.() ?? "unknown"})`);
        } else if (notification.isSkippedMoment()) {
          soft(`one-tap: skipped (${notification.getSkippedReason?.() ?? "unknown"})`);
        } else if (notification.isDismissedMoment()) {
          soft(`one-tap: dismissed (${notification.getDismissedReason?.() ?? "unknown"})`);
        }
      } catch {
        /* ignore notification probe errors */
      }
    });
  } catch (err) {
    nonce = null;
    soft(`one-tap: prompt error (${err instanceof Error ? err.message : "unknown"})`);
  }
}

/** Test helper: reset the once-per-session guard. */
export function resetOneTapPromptState(): void {
  promptedForClientId = null;
  scriptPromise = null;
}
