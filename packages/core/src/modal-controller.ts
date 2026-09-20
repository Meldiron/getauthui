import type { AuthUIView } from "./types.js";

/**
 * Open the modal from anywhere. If no <authui-modal> exists yet, one is appended to <body>.
 */
export function openModal(view?: AuthUIView): void {
  if (typeof document === "undefined") return;
  if (!document.querySelector("authui-modal")) {
    document.body.appendChild(document.createElement("authui-modal"));
  }
  // Let a freshly created modal upgrade before it receives the event.
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("authui:open", { detail: { view } }));
  });
}

export function closeModal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("authui:close"));
}
