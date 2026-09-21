import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authStore } from "../store.js";
import type { AuthUIStatus } from "../types.js";

/**
 * In-module FOUC guard. Prefer constructable stylesheets so strict CSP
 * `style-src 'self'` does not block the rule. Fall back to a <style> tag
 * for older browsers (Safari < 16.4). Pages that load the CDN as a deferred
 * module should still put CRITICAL_FOUC_CSS in <head> so content stays
 * hidden before this file executes.
 */
export const FOUC_CSS = "authui-show:not([ready]){display:none}";

/** Extra critical CSS for the page <head>, covering undefined custom elements. */
export const CRITICAL_FOUC_CSS =
  "authui-show:not([ready]){display:none}" +
  "authui-button:not(:defined),authui-user-button:not(:defined){visibility:hidden}";

let foucInstalled = false;

function installFoucGuard(): void {
  if (typeof document === "undefined" || foucInstalled) return;
  foucInstalled = true;

  try {
    if (typeof CSSStyleSheet !== "undefined" && "adoptedStyleSheets" in Document.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(FOUC_CSS);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      return;
    }
  } catch {
    /* fall through to <style> tag */
  }

  if (!document.getElementById("authui-fouc")) {
    const style = document.createElement("style");
    style.id = "authui-fouc";
    style.textContent = FOUC_CSS;
    document.head.appendChild(style);
  }
}

installFoucGuard();

const STATUSES: AuthUIStatus[] = ["loading", "signed-out", "signed-in", "mfa-required"];

/** Parse a comma or space separated status list, ignoring unknown values. */
function parseList(value: string | null | undefined): AuthUIStatus[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s): s is AuthUIStatus => (STATUSES as string[]).includes(s));
}

/**
 * Renders its children only while the auth status matches.
 *
 * <authui-show when="signed-in">…</authui-show>
 * <authui-show when="signed-out">…</authui-show>
 * <authui-show unless="signed-in">…</authui-show>
 * <authui-show when="signed-out, mfa-required">…</authui-show>
 *
 * Values: `signed-in`, `signed-out`, `mfa-required`, `loading`. Both attributes
 * accept a comma separated list. Children stay hidden while the initial status
 * is `loading` unless `when="loading"` asks for it.
 */
@customElement("authui-show")
export class AuthUIShow extends LitElement {
  /** Show children when the status is one of these. */
  @property({ type: String }) when = "";
  /** Hide children when the status is one of these. */
  @property({ type: String }) unless = "";

  @state() private status: AuthUIStatus = authStore.getState().status;
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.status = authStore.getState().status;
    this.unsubscribe = authStore.on("change", (s) => (this.status = s.status));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Whether the current status satisfies `when` and `unless`. */
  get visible(): boolean {
    const when = parseList(this.when);
    const unless = parseList(this.unless);
    if (this.status === "loading" && !when.includes("loading")) return false;
    if (when.length > 0 && !when.includes(this.status)) return false;
    if (unless.includes(this.status)) return false;
    return true;
  }

  protected updated(): void {
    if (this.status !== "loading" || parseList(this.when).includes("loading")) {
      this.setAttribute("ready", "");
      this.style.display = "contents";
    }
  }

  protected render() {
    return this.visible ? html`<slot></slot>` : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-show": AuthUIShow;
  }
}
