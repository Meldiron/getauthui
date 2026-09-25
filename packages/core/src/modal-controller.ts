import type { AuthUIView } from "./types.js";

export interface AuthUIOpenDetail {
  view?: AuthUIView;
  /** Optional account tab when opening the account view. */
  tab?: string;
}

/**
 * Open the modal from anywhere. If no <authui-modal> exists yet, one is appended to <body>.
 */
export function openModal(view?: AuthUIView, tab?: string): void {
  if (typeof document === "undefined") return;
  if (!document.querySelector("authui-modal")) {
    document.body.appendChild(document.createElement("authui-modal"));
  }
  // Let a freshly created modal upgrade before it receives the event.
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("authui:open", { detail: { view, tab } }));
  });
}

export function closeModal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("authui:close"));
}
