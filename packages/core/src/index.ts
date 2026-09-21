// Components (side effect: registers the custom elements)
export { AuthUIElement } from "./components/element.js";
export { AuthUIConfigElement } from "./components/authui-config.js";
export { AuthUIShow, CRITICAL_FOUC_CSS, FOUC_CSS } from "./components/authui-show.js";
export { AuthUISignIn } from "./components/authui-sign-in.js";
export { AuthUIAccount } from "./components/authui-account.js";
export { AuthUIModal } from "./components/authui-modal.js";
export { AuthUIButton } from "./components/authui-button.js";
export { AuthUIUserButton } from "./components/authui-user-button.js";

// Imperative API
export { authStore, AuthStore } from "./store.js";
export { openModal, closeModal } from "./modal-controller.js";
export { describeError, ErrorTypes, isConfigError, toAuthUIError } from "./errors.js";
export { scorePassword } from "./password-strength.js";
export {
  getLastMethod,
  rememberLastMethod,
  clearLastMethod,
  stashPendingOAuth,
  rememberPendingOAuth,
  clearPendingOAuth,
} from "./last-method.js";
export { getStoredActiveTeamId, setStoredActiveTeamId } from "./active-team.js";
export type { PasswordStrength, PasswordStrengthLevel } from "./password-strength.js";
export { PreviewAccount } from "./preview.js";
export { defaultStrings, providerLabel } from "./i18n.js";

/**
 * The Appwrite Web SDK Auth UI is built on, re-exported so script-tag users can reach
 * Storage, Databases, Query, ID, Permission and Role without loading the SDK twice:
 * `const { Storage, ID } = appwrite;`
 */
export * as appwrite from "appwrite";

// Types
export * from "./types.js";

import { authStore } from "./store.js";
import { openModal, closeModal } from "./modal-controller.js";
import type { AuthUIConfig, AuthUIEventMap, AuthUIEventName, AuthUIView } from "./types.js";

/** Configure Auth UI. Call once, as early as possible. */
export function init(config: AuthUIConfig) {
  authStore.configure(config);
  return AuthUI;
}

/** Open the modal on a given screen. Creates <authui-modal> if the page has none. */
export function open(view?: AuthUIView): void {
  openModal(view);
}

export function close(): void {
  closeModal();
}

export function signOut(): Promise<void> {
  return authStore.signOut();
}

export function getUser() {
  return authStore.user;
}

export function getState() {
  return authStore.getState();
}

export function getClient() {
  return authStore.getClient();
}

/** The Appwrite Account service Auth UI uses. Handy for `getPrefs()` and `updatePrefs()`. */
export function getAccount() {
  return authStore.getAccount();
}

/** Preview mode only: sign the sample user in without a form. */
export function previewSignIn() {
  return authStore.previewSignIn();
}

export function on<K extends AuthUIEventName>(
  event: K,
  listener: (detail: AuthUIEventMap[K]) => void
) {
  return authStore.on(event, listener);
}

/** Convenience namespace: `AuthUI.init({...}); AuthUI.open();` */
export const AuthUI = {
  init,
  open,
  close,
  signOut,
  getUser,
  getState,
  getClient,
  getAccount,
  on,
  previewSignIn,
  store: authStore,
};
