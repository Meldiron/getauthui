import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { openModal } from "../modal-controller.js";
import type { AuthUIView } from "../types.js";

/**
 * A button that opens the Auth UI modal.
 *
 * <authui-button>Sign in</authui-button>
 * <authui-button view="sign-up" variant="outline">Create account</authui-button>
 */
@customElement("authui-button")
export class AuthUIButton extends AuthUIElement {
  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: inline-block;
      }
      .btn {
        width: 100%;
      }
    `,
  ];

  @property({ type: String }) view: AuthUIView = "sign-in";
  @property({ type: String }) variant:
    "primary" | "brand" | "outline" | "secondary" | "ghost" | "link" = "primary";
  @property({ type: String }) size: "sm" | "md" | "lg" = "md";

  protected render() {
    const size = this.size === "md" ? "" : `btn-${this.size}`;
    return html`<button
      class="btn btn-${this.variant} ${size}"
      @click=${() => openModal(this.view)}
      part="button"
    >
      <slot
        >${this.view === "sign-up" ? this.t("signUp") : this.view === "account" ? this.t("manageAccount") : this.t("signIn")}</slot
      >
    </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-button": AuthUIButton;
  }
}
