import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { authStore } from "../store.js";
import { openModal } from "../modal-controller.js";
import { icons } from "../icons.js";

/**
 * Avatar with a menu: shows a sign-in button while signed out, and the user's
 * avatar with "Manage account" and "Sign out" while signed in.
 */
@customElement("authui-user-button")
export class AuthUIUserButton extends AuthUIElement {
  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      .trigger {
        border: 1px solid transparent;
        background: transparent;
        padding: 2px;
        border-radius: 999px;
        cursor: pointer;
        display: inline-flex;
        transition: border-color 150ms;
      }
      .trigger:hover,
      .trigger[aria-expanded="true"] {
        border-color: var(--authui-border);
      }
      .trigger:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
      }
      .menu {
        position: absolute;
        top: calc(100% + 6px);
        inset-inline-end: 0;
        min-width: 220px;
        max-width: min(320px, 90vw);
        background: var(--authui-popover);
        color: var(--authui-popover-foreground);
        border: 1px solid var(--authui-border);
        border-radius: var(--authui-radius-md);
        box-shadow: var(--authui-shadow-lg);
        padding: 4px;
        z-index: var(--authui-z);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .menu-header {
        min-width: 0;
        overflow: hidden;
        padding: 8px 10px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-bottom: 1px solid var(--authui-border);
        margin-bottom: 4px;
      }
      .menu .row-title,
      .menu .row-sub {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: var(--authui-radius-sm);
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 14px;
        cursor: pointer;
        text-align: start;
        width: 100%;
      }
      .menu-item:hover,
      .menu-item:focus-visible {
        background: var(--authui-accent);
        outline: none;
      }
      .menu-item svg {
        width: 16px;
        height: 16px;
        color: var(--authui-muted-foreground);
      }
      .avatar {
        width: 32px;
        height: 32px;
        font-size: 13px;
      }
    `,
  ];

  /** Avatar image URL; falls back to initials. */
  @property({ type: String }) src = "";

  @state() private menuOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick, true);
    document.addEventListener("keydown", this.onKeydown);
    this.addEventListener("keydown", this.onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this.onDocumentClick, true);
    document.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("keydown", this.onKeydown);
  }

  private onDocumentClick = (e: Event) => {
    if (!e.composedPath().includes(this)) this.menuOpen = false;
  };

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.menuOpen = false;
  };

  protected render() {
    const { status, user } = this.auth;
    if (status === "loading")
      return html`<span class="avatar"><span class="spinner"></span></span>`;
    if (status !== "signed-in" || !user) {
      return html`<button class="btn btn-primary btn-sm" @click=${() => openModal("sign-in")}>
        <slot>${this.t("signIn")}</slot>
      </button>`;
    }
    const label = user.name || user.email || user.phone || this.t("guestAccount");
    return html`
      <button
        class="trigger"
        aria-haspopup="menu"
        aria-expanded=${this.menuOpen ? "true" : "false"}
        @click=${() => (this.menuOpen = !this.menuOpen)}
        aria-label=${label}
      >
        <span class="avatar"
          >${this.src ? html`<img src=${this.src} alt="" />` : (label[0] ?? "?")}</span
        >
      </button>
      ${
        this.menuOpen
          ? html`<div class="menu" role="menu">
              <div class="menu-header">
                <span class="row-title" title=${label}>${label}</span>
                ${
                  user.email && user.name
                    ? html`<span class="row-sub" title=${user.email}>${user.email}</span>`
                    : nothing
                }
              </div>
              <button
                class="menu-item"
                role="menuitem"
                @click=${() => {
                  this.menuOpen = false;
                  openModal("account");
                }}
              >
                ${icons.settings} ${this.t("manageAccount")}
              </button>
              <button
                class="menu-item"
                role="menuitem"
                @click=${() => {
                  this.menuOpen = false;
                  void authStore.signOut();
                }}
              >
                ${icons.logOut} ${this.t("signOut")}
              </button>
            </div>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-user-button": AuthUIUserButton;
  }
}
