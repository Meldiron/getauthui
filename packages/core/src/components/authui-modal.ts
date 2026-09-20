import { css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { icons } from "../icons.js";
import type { AuthUIView } from "../types.js";
import "./authui-sign-in.js";
import "./authui-account.js";

export interface AuthUIOpenDetail {
  view?: AuthUIView;
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
        width: calc(100% - 2rem);
        max-width: 440px;
        max-height: calc(100dvh - 2rem);
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
      .body {
        padding: 24px;
        max-height: calc(100dvh - 2rem);
        overflow-y: auto;
      }
      .close {
        position: absolute;
        top: 12px;
        inset-inline-end: 12px;
        width: 32px;
        height: 32px;
        border-radius: var(--authui-radius-sm);
        opacity: 0.7;
      }
      .close:hover {
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
  /** Close automatically after a successful sign in. Default: true. */
  @property({ type: Boolean, attribute: "close-on-success" }) closeOnSuccess = true;

  @state() private handledPending: unknown = null;
  @query("dialog") private dialog?: HTMLDialogElement;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("authui:open", this.onOpenEvent);
    window.addEventListener("authui:close", this.onCloseEvent);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("authui:open", this.onOpenEvent);
    window.removeEventListener("authui:close", this.onCloseEvent);
  }

  private onOpenEvent = (e: Event) => {
    const detail = (e as CustomEvent<AuthUIOpenDetail>).detail ?? {};
    this.show(detail.view);
  };

  private onCloseEvent = () => this.hide();

  show(view?: AuthUIView): void {
    if (view === "account" && this.auth.status !== "signed-in") this.view = "sign-in";
    else if (view) this.view = view;
    else if (this.auth.status === "signed-in") this.view = "account";
    else this.view = "sign-in";
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("open") && this.dialog) {
      if (this.open && !this.dialog.open) {
        this.dialog.showModal();
        requestAnimationFrame(() => this.focusPrimary());
      }
      if (!this.open && this.dialog.open) this.dialog.close();
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
        <div class="body">
          <button
            class="btn btn-ghost btn-icon close"
            @click=${this.hide}
            aria-label=${this.t("close")}
          >
            ${icons.x}
          </button>
          ${
            !this.open
              ? nothing
              : account
                ? html`<authui-account embedded></authui-account>`
                : html`<authui-sign-in
                    embedded
                    .view=${this.view === "account" ? "sign-in" : this.view}
                  ></authui-sign-in>`
          }
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
