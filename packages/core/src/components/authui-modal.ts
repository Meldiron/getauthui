import { css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { icons } from "../icons.js";
import type { AuthUIView } from "../types.js";
import "./authui-sign-in.js";
import "./authui-account.js";

export interface AuthUIOpenDetail {
  view?: AuthUIView;
  tab?: string;
}

/**
 * Dialog host for the sign-in and account screens. Opens on `AuthUI.open()`, on
 * `<authui-button>` clicks, and automatically when a redirect needs to finish
 * (password reset link, failed OAuth attempt).
 */
@customElement("authui-modal")
export class AuthUIModal extends AuthUIElement {
  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: contents;
      }
      dialog {
        border: 1px solid var(--authui-border);
        border-radius: var(--authui-radius-lg);
        background: var(--authui-background);
        color: var(--authui-foreground);
        padding: 0;
        width: calc(100% - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
        max-width: 440px;
        max-height: calc(
          100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
        );
        box-shadow: var(--authui-shadow-lg);
        overflow: hidden;
        z-index: var(--authui-z);
      }
      dialog.wide {
        max-width: 600px;
      }
      dialog::backdrop {
        background: var(--authui-overlay);
        backdrop-filter: blur(4px);
      }
      dialog[open] {
        animation: authui-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes authui-in {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .frame {
        display: flex;
        flex-direction: column;
        max-height: calc(
          100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
        );
        min-height: 0;
        position: relative;
      }
      .chrome {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: max(8px, env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) 0
          max(8px, env(safe-area-inset-left, 0px));
        background: var(--authui-background);
      }
      .body {
        padding: 4px max(24px, env(safe-area-inset-right, 0px))
          max(28px, env(safe-area-inset-bottom, 0px)) max(24px, env(safe-area-inset-left, 0px));
        overflow-y: auto;
        flex: 1 1 auto;
        min-height: 0;
        -webkit-overflow-scrolling: touch;
      }
      .close {
        width: 32px;
        height: 32px;
        border-radius: var(--authui-radius-sm);
        opacity: 0.7;
      }
      .close:hover {
        opacity: 1;
      }
      .scroll-fade {
        pointer-events: none;
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        height: 40px;
        border-radius: 0 0 var(--authui-radius-lg) var(--authui-radius-lg);
        background: linear-gradient(to top, var(--authui-background), transparent);
        opacity: 0;
        transition: opacity 150ms;
      }
      .scroll-fade.show {
        opacity: 1;
      }
      authui-sign-in,
      authui-account {
        max-width: none;
      }
    `,
  ];

  /** Whether the dialog is open. Reflects to an attribute. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Which screen to show. */
  @property({ type: String }) view: AuthUIView = "sign-in";
  @state() private accountTab: string | undefined;
  /**
   * Close automatically after a successful sign in. Default: true.
   * Accepts the string `"false"` / `"0"` / `"off"` / `"no"` so HTML can turn it
   * off (Lit's Boolean converter treats any present attribute as true).
   */
  @property({
    attribute: "close-on-success",
    reflect: true,
    converter: {
      fromAttribute(value: string | null): boolean {
        if (value === null) return true;
        const v = value.trim().toLowerCase();
        return !(v === "false" || v === "0" || v === "off" || v === "no");
      },
      toAttribute(value: boolean): string | null {
        return value ? null : "false";
      },
    },
  })
  closeOnSuccess = true;

  @state() private handledPending: unknown = null;
  @state() private scrollCue = false;
  @query("dialog") private dialog?: HTMLDialogElement;
  @query(".body") private bodyEl?: HTMLElement;
  private bodyResizeObserver: ResizeObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("authui:open", this.onOpenEvent);
    window.addEventListener("authui:close", this.onCloseEvent);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("authui:open", this.onOpenEvent);
    window.removeEventListener("authui:close", this.onCloseEvent);
    this.bodyResizeObserver?.disconnect();
    this.bodyResizeObserver = null;
  }

  private onOpenEvent = (e: Event) => {
    const detail = (e as CustomEvent<AuthUIOpenDetail>).detail ?? {};
    this.show(detail.view, detail.tab);
  };

  private onCloseEvent = () => this.hide();

  show(view?: AuthUIView, tab?: string): void {
    if (view === "account" && this.auth.status !== "signed-in") this.view = "sign-in";
    else if (view) this.view = view;
    else if (this.auth.status === "signed-in") this.view = "account";
    else this.view = "sign-in";
    this.accountTab = this.view === "account" ? tab : undefined;
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  private syncScrollCue = (): void => {
    const el = this.bodyEl;
    if (!el) {
      this.scrollCue = false;
      return;
    }
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    const next = canScroll && !atBottom;
    if (next !== this.scrollCue) this.scrollCue = next;
  };

  private observeBody(): void {
    this.bodyResizeObserver?.disconnect();
    this.bodyResizeObserver = null;
    const el = this.bodyEl;
    if (!el || typeof ResizeObserver === "undefined") {
      this.syncScrollCue();
      return;
    }
    this.bodyResizeObserver = new ResizeObserver(() => this.syncScrollCue());
    this.bodyResizeObserver.observe(el);
    // Also watch content size changes inside the scroll body.
    if (el.firstElementChild) this.bodyResizeObserver.observe(el.firstElementChild);
    this.syncScrollCue();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("open")) {
      // Notify React / hosts when Esc, backdrop, X, or hide() closes the dialog.
      if (changed.get("open") === true && !this.open) {
        this.fire("authui-close");
      }
      if (this.dialog) {
        if (this.open && !this.dialog.open) {
          this.dialog.showModal();
          requestAnimationFrame(() => {
            this.focusPrimary();
            this.observeBody();
          });
        }
        if (!this.open && this.dialog.open) this.dialog.close();
        if (!this.open) {
          this.scrollCue = false;
          this.bodyResizeObserver?.disconnect();
          this.bodyResizeObserver = null;
        }
      }
    }
    if (changed.has("auth")) {
      const pending = this.auth.pending;
      if (pending && pending !== this.handledPending && pending.type !== "notice") {
        this.handledPending = pending;
        this.view = "sign-in";
        this.open = true;
      }
      if (pending?.type === "notice" && pending !== this.handledPending) {
        this.handledPending = pending;
        this.open = true;
      }
      if (this.open && this.view === "account" && this.auth.status !== "signed-in") {
        this.view = "sign-in";
      }
      if (this.open && this.auth.status === "signed-out" && this.view === "account") {
        this.view = "sign-in";
      }
    }
    if (this.open && (changed.has("view") || changed.has("auth") || changed.has("open"))) {
      requestAnimationFrame(() => this.observeBody());
    }
  }

  private onSuccess = () => {
    this.fire("authui-signed-in", this.auth.user);
    if (this.closeOnSuccess && !this.config?.successUrl) this.hide();
  };

  private onInnerOpen = (e: Event) => {
    const view = (e as CustomEvent<AuthUIOpenDetail>).detail?.view;
    if (view) this.view = view;
  };

  private onBackdrop = (e: MouseEvent) => {
    if (e.target === this.dialog) this.hide();
  };

  private focusPrimary(): void {
    const root = this.dialog;
    if (!root) return;
    const host = root.querySelector("authui-sign-in, authui-account") as
      (HTMLElement & { shadowRoot?: ShadowRoot }) | null;
    const sr = host?.shadowRoot;
    const target =
      (sr?.querySelector(".alert[role=alert], .alert[role=status]") as HTMLElement | null) ??
      (sr?.querySelector(
        "input:not([type=hidden]), button.choice, [role=tab]"
      ) as HTMLElement | null);
    target?.focus?.();
  }

  protected render() {
    const signedIn = this.auth.status === "signed-in";
    const account = this.view === "account" && signedIn;
    return html`
      <dialog
        class=${account ? "wide" : ""}
        aria-label=${account ? this.t("dialogAccount") : this.t("dialogSignIn")}
        @close=${() => (this.open = false)}
        @cancel=${(e: Event) => {
          e.preventDefault();
          this.hide();
        }}
        @click=${this.onBackdrop}
        @authui-open=${this.onInnerOpen}
        @authui-success=${this.onSuccess}
      >
        <div class="frame">
          <div class="chrome">
            <button
              class="btn btn-ghost btn-icon close"
              @click=${this.hide}
              aria-label=${this.t("close")}
            >
              ${icons.x}
            </button>
          </div>
          <div class="body" @scroll=${this.syncScrollCue}>
            ${
              !this.open
                ? nothing
                : account
                  ? html`<authui-account
                      embedded
                      tab=${this.accountTab || nothing}
                    ></authui-account>`
                  : html`<authui-sign-in
                      embedded
                      .view=${this.view === "account" ? "sign-in" : this.view}
                    ></authui-sign-in>`
            }
          </div>
          <div class="scroll-fade ${this.scrollCue ? "show" : ""}" aria-hidden="true"></div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-modal": AuthUIModal;
  }
}
