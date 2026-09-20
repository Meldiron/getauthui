import type { AuthUITheme } from "./types.js";

type ThemeListener = (dark: boolean) => void;

/**
 * Resolves "auto" theme against the host page: an explicit `dark` or `light` class on
 * <html> wins (next-themes / shadcn convention, and what the Appwrite Console uses),
 * otherwise prefers-color-scheme decides. One observer is shared by all components.
 */
class ThemeWatcher {
  private listeners = new Set<ThemeListener>();
  private observer: MutationObserver | null = null;
  private media: MediaQueryList | null = null;

  isDark(theme: AuthUITheme = "auto"): boolean {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    if (typeof document === "undefined") return false;
    const cls = document.documentElement.classList;
    if (cls.contains("dark")) return true;
    if (cls.contains("light")) return false;
    if (document.documentElement.dataset.theme === "dark") return true;
    if (document.documentElement.dataset.theme === "light") return false;
    return (
      typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches
    );
  }

  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private notify = (): void => {
    const dark = this.isDark("auto");
    this.listeners.forEach((l) => l(dark));
  };

  private start(): void {
    if (this.observer || typeof document === "undefined") return;
    this.observer = new MutationObserver(this.notify);
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    if (typeof window !== "undefined" && window.matchMedia) {
      this.media = window.matchMedia("(prefers-color-scheme: dark)");
      this.media.addEventListener?.("change", this.notify);
    }
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.media?.removeEventListener?.("change", this.notify);
    this.media = null;
  }
}

export const themeWatcher = new ThemeWatcher();

export const radiusScale: Record<string, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.625rem",
  lg: "0.875rem",
  xl: "1.125rem",
  full: "1.5rem",
};
