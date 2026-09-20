import { LitElement } from "lit";
import { state } from "lit/decorators.js";
import { authStore } from "../store.js";
import { format } from "../i18n.js";
import { themeWatcher, radiusScale } from "../theme.js";
import { tokens } from "../styles/tokens.js";
import { base } from "../styles/base.js";
import type { AuthUIState, AuthUIStrings } from "../types.js";

/**
 * Base class for every Auth UI element: subscribes to the store, resolves theme
 * and branding onto the host, and exposes `t()` for strings.
 */
export class AuthUIElement extends LitElement {
  static styles = [tokens, base];

  @state() protected auth: AuthUIState = authStore.getState();

  private unsubscribeStore: (() => void) | null = null;
  private unsubscribeTheme: (() => void) | null = null;

  /**
   * Keyboard events fired inside the component stop at the host element, so page-level
   * shortcuts (a game listening for WASD on `document`, a docs site toggling the theme on
   * "d") never see keystrokes meant for our inputs. The default action is untouched, so
   * typing, Enter to submit and Escape to close the dialog keep working.
   */
  private static readonly KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;
  private stopKeys = (e: Event) => e.stopPropagation();

  connectedCallback(): void {
    super.connectedCallback();
    for (const type of AuthUIElement.KEY_EVENTS) this.addEventListener(type, this.stopKeys);
    this.auth = authStore.getState();
    this.unsubscribeStore = authStore.on("change", (s) => {
      this.auth = s;
      this.applyBranding();
    });
    this.unsubscribeTheme = themeWatcher.subscribe(() => this.applyBranding());
    this.applyBranding();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const type of AuthUIElement.KEY_EVENTS) this.removeEventListener(type, this.stopKeys);
    this.unsubscribeStore?.();
    this.unsubscribeTheme?.();
    this.unsubscribeStore = null;
    this.unsubscribeTheme = null;
  }

  protected get strings(): AuthUIStrings {
    return authStore.getStrings();
  }

  /** Translate a string key with optional `{placeholders}`. */
  protected t(key: keyof AuthUIStrings, values?: Record<string, string | number>): string {
    return format(this.strings[key], values);
  }

  protected get config() {
    return authStore.getConfig();
  }

  protected get productName(): string {
    return this.config?.branding?.name ?? "";
  }

  /** Push theme and branding from config onto the host element. */
  protected applyBranding(): void {
    const branding = this.config?.branding;
    const dark = themeWatcher.isDark(branding?.theme ?? "auto");
    this.setAttribute("data-theme", dark ? "dark" : "light");
    if (branding?.primary) {
      this.style.setProperty("--authui-primary", branding.primary);
      this.style.setProperty(
        "--authui-primary-foreground",
        branding.primaryForeground ?? "#ffffff"
      );
    }
    if (branding?.radius && radiusScale[branding.radius]) {
      this.style.setProperty("--authui-radius", radiusScale[branding.radius]);
    }
  }

  /** Emit a composed custom event from this element. */
  protected fire<T>(name: string, detail?: T): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}
