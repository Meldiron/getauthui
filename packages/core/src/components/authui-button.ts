import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { openModal } from "../modal-controller.js";
import { icons } from "../icons.js";
import type { AuthUIView } from "../types.js";

/**
 * A button that opens the Auth UI modal.
 *
 * <authui-button>Sign in</authui-button>
 * <authui-button view="sign-up" variant="outline">Create account</authui-button>
 *
 * When the store has a sticky `configError` (wrong project, missing /v1, incomplete
 * config), a compact alert renders above the trigger so guestbook / launcher chrome
 * surfaces the problem without opening the modal.
 */
@customElement("authui-button")
export class AuthUIButton extends AuthUIElement {
  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: inline-block;
      }
      :host([data-config-error]) {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        max-width: min(100%, 360px);
      }
      .btn {
        width: 100%;
      }
      .config-error {
        box-sizing: border-box;
      }
    `,
  ];

  @property({ type: String }) view: AuthUIView = "sign-in";
  @property({ type: String }) variant:
    "primary" | "brand" | "outline" | "secondary" | "ghost" | "link" = "primary";
  @property({ type: String }) size: "sm" | "md" | "lg" = "md";

  protected updated(): void {
    if (this.auth.configError) this.setAttribute("data-config-error", "");
    else this.removeAttribute("data-config-error");
  }

  protected render() {
    const size = this.size === "md" ? "" : `btn-${this.size}`;
    const label =
      this.view === "sign-up"
        ? this.t("signUp")
        : this.view === "account"
          ? this.t("manageAccount")
          : this.t("signIn");
    return html`
      ${
        this.auth.configError
          ? html`<div class="alert alert-error config-error" role="alert">
              ${icons.alert}
              <div class="alert-body">${this.auth.configError}</div>
            </div>`
          : nothing
      }
      <button
        class="btn btn-${this.variant} ${size}"
        @click=${() => openModal(this.view)}
        part="button"
      >
        <slot>${label}</slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-button": AuthUIButton;
  }
}
