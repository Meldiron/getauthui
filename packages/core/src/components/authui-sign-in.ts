import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { Models } from "appwrite";
import { AuthUIElement } from "./element.js";
import { signInStyles } from "./sign-in.styles.js";
import { authStore, type MfaFactor } from "../store.js";
import { describeError, ErrorTypes, isErrorType } from "../errors.js";
import { avatarInitial, icons, providerIcon } from "../icons.js";
import { providerLabel } from "../i18n.js";
import type { AuthUIView, OAuthProviderName } from "../types.js";
import { openModal } from "../modal-controller.js";
import { scorePassword } from "../password-strength.js";
import {
  getLastMethod,
  rememberLastMethod,
  rememberPendingOAuth,
  stashPendingOAuth,
} from "../last-method.js";

type Step = Exclude<AuthUIView, "account">;

interface PendingToken {
  userId: string;
  kind: "email-otp" | "phone" | "magic-url";
  target: string;
  phrase?: string;
}

/**
 * The complete sign-in experience: OAuth, email + password, sign up, passwordless
 * (magic URL, email OTP, SMS), guest sessions, password recovery and MFA challenges.
 * Works standalone in the page or inside <authui-modal>.
 */
@customElement("authui-sign-in")
export class AuthUISignIn extends AuthUIElement {
  static styles = [...AuthUIElement.styles, signInStyles];

  /** Initial screen. */
  @property({ type: String }) view: Step = "sign-in";
  /** Set by <authui-modal>; hides the card chrome. */
  @property({ type: Boolean }) embedded = false;

  @state() private step: Step = "sign-in";
  @state() private busy = false;
  @state() private error = "";
  @state() private notice: { tone: "success" | "info" | "error"; message: string } | null = null;
  @state() private showPassword = false;
  /** Expanded OAuth provider in the accordion row (3+ providers). */
  @state() private expandedOAuth: OAuthProviderName | null = null;
  @state() private token: PendingToken | null = null;
  private focusOnStep = false;
  @state() private resendCooldownUntil = 0;

  @state() private challenge: { id: string; factor: MfaFactor } | null = null;
  @state() private recovery: { userId: string; secret: string } | null = null;

  @query("form input:not([type=hidden])") private firstInput?: HTMLInputElement;

  private email = "";
  @state() private password = "";
  @state() private passwordConfirm = "";
  private name = "";
  private phone = "";
  private code = "";
  /** Sign-up legal checkbox when legal.requireAcceptance is set. */
  @state() private legalAccepted = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.step = this.view;
    this.syncFromStore();
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("view") && changed.get("view") !== undefined) this.go(this.view);
    if (changed.has("auth")) this.syncFromStore();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("step") && (this.focusOnStep || this.embedded)) {
      this.focusOnStep = false;
      requestAnimationFrame(() => this.firstInput?.focus());
    }
  }

  /** React to store transitions: MFA pending, redirect results, sign in. */
  private syncFromStore(): void {
    const { status, pending } = this.auth;
    if (status === "mfa-required" && this.step !== "mfa") {
      this.go("mfa");
    }
    const holdingRecovery =
      this.step === "reset-password" ||
      pending?.type === "reset-password" ||
      this.recovery !== null;
    if ((status === "signed-in" || status === "signed-out") && !holdingRecovery) {
      const stuck =
        this.step === "mfa" ||
        this.step === "phone" ||
        this.step === "email-otp" ||
        this.step === "magic-url" ||
        this.step === "forgot-password" ||
        this.token !== null ||
        this.challenge !== null;
      if (stuck || status === "signed-out") {
        this.token = null;
        this.challenge = null;
        this.code = "";
        this.password = "";
        this.notice = null;
        this.go(this.view === "sign-up" ? "sign-up" : "sign-in");
      }
    }
    if (pending?.type === "reset-password" && this.step !== "reset-password") {
      this.recovery = { userId: pending.userId, secret: pending.secret };
      this.go("reset-password");
    }
    if (pending?.type === "oauth-failed") {
      // Legacy pending shape: treat like a sticky error notice (store now emits notice).
      this.notice = { tone: "error", message: this.t("errorOAuth") };
      // Do not clear pending here; clearing triggered a signed-out sync that wiped the notice.
    }
    if (pending?.type === "notice" && !this.notice) {
      this.notice = {
        tone: pending.tone === "error" ? "error" : pending.tone,
        message: pending.message,
      };
      // Leave pending so other surfaces (modal) can also show it until dismissed.
    }
  }

  /** Navigate between screens and reset transient state. */
  private dismissNotice(): void {
    this.notice = null;
    if (this.auth.pending?.type === "notice") authStore.setPending(null);
  }

  go(step: Step): void {
    if (step === "sign-up" && this.config?.signUp === false) step = "sign-in";
    this.focusOnStep = true;
    this.step = step;
    this.error = "";
    this.notice = null;
    // Do not clear pending notices here — redirect notices stay until dismissNotice().
    this.busy = false;
    this.showPassword = false;
    this.password = "";
    this.passwordConfirm = "";
    this.legalAccepted = false;
    if (step !== "mfa") this.challenge = null;
    if (step !== "email-otp" && step !== "phone" && step !== "magic-url") this.token = null;
    this.fire("authui-view", { view: step });
  }

  // ───────────────────────────── actions ─────────────────────────────

  private async run(action: () => Promise<void>, context: "link" | "code" = "link"): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      await action();
    } catch (err) {
      this.error = describeError(err, this.strings, context);
    } finally {
      this.busy = false;
    }
  }

  /** Honour native constraint validation before calling Appwrite. */
  private requireValid(e: Event): boolean {
    const form = e.target as HTMLFormElement | null;
    if (form && typeof form.reportValidity === "function" && !form.reportValidity()) return false;
    return true;
  }

  private onSignIn = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(async () => {
      await authStore.signInWithEmailPassword(this.email, this.password);
      this.password = "";
      rememberLastMethod("email-password");
      this.fire("authui-success", { method: "email-password" });
    });
  };

  private onSignUp = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    if (!this.ensureLegalAccepted()) return;
    void this.run(async () => {
      await authStore.signUp(this.email, this.password, this.name);
      this.password = "";
      rememberLastMethod("email-password");
      this.fire("authui-success", { method: "sign-up" });
    });
  };

  private onGuest = () => {
    void this.run(async () => {
      await authStore.signInAnonymously();
      rememberLastMethod("anonymous");
      this.fire("authui-success", { method: "anonymous" });
    });
  };

  private onOAuth = (provider: OAuthProviderName) => {
    if (this.step === "sign-up" && !this.ensureLegalAccepted()) return;
    void this.run(async () => {
      // Stash the provider; only persist Last used after a successful session
      // (preview completes in place; real OAuth remembers on redirect return).
      stashPendingOAuth(provider);
      await authStore.signInWithOAuth(provider);
      if (authStore.isPreview) {
        rememberPendingOAuth();
        this.fire("authui-success", { method: "oauth" });
        return;
      }
      // The browser navigates away; keep the spinner visible until it does.
      await new Promise((r) => setTimeout(r, 4000));
    });
  };

  private onForgot = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(async () => {
      await authStore.sendPasswordRecovery(this.email);
      this.notice = { tone: "success", message: this.t("resetLinkSent", { email: this.email }) };
    });
  };

  private onReset = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    if (this.password !== this.passwordConfirm) {
      this.error = this.t("errorPasswordMismatch");
      return;
    }
    const recovery = this.recovery;
    if (!recovery) return;
    void this.run(async () => {
      await authStore.completePasswordRecovery(recovery.userId, recovery.secret, this.password);
      this.password = "";
      this.passwordConfirm = "";
      this.recovery = null;
      if (this.auth.pending?.type === "reset-password") authStore.setPending(null);
      this.go("sign-in");
      // go() clears notice; re-set after so the success message survives on sign-in.
      this.notice = { tone: "success", message: this.t("passwordUpdated") };
    });
  };

  private onMagicUrl = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(async () => {
      const token = await authStore.sendMagicUrl(this.email);
      this.token = {
        userId: token.userId,
        kind: "magic-url",
        target: this.email,
        phrase: token.phrase,
      };
    });
  };

  private onEmailOtp = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(async () => {
      const token = await authStore.sendEmailOtp(this.email);
      this.token = {
        userId: token.userId,
        kind: "email-otp",
        target: this.email,
        phrase: token.phrase,
      };
      this.code = "";
    });
  };

  private onPhoneOtp = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(async () => {
      const token = await authStore.sendPhoneOtp(this.phone);
      this.token = { userId: token.userId, kind: "phone", target: this.phone };
      this.code = "";
    });
  };

  private onVerifyCode = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    const token = this.token;
    if (!token) return;
    void this.run(async () => {
      await authStore.signInWithToken(token.userId, this.code);
      this.code = "";
      this.token = null;
      rememberLastMethod(token.kind);
      this.fire("authui-success", { method: token.kind });
    }, "code");
  };

  private onChooseFactor = (factor: MfaFactor) => {
    void this.run(async () => {
      const challenge = await authStore.createMfaChallenge(factor);
      this.challenge = { id: challenge.$id, factor };
      this.code = "";
    });
  };

  private onVerifyFactor = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    const challenge = this.challenge;
    if (!challenge) return;
    void this.run(async () => {
      await authStore.completeMfaChallenge(challenge.id, this.code);
      this.code = "";
      this.challenge = null;
      this.go("sign-in");
      this.fire("authui-success", { method: "mfa" });
    }, "code");
  };

  private onCancelMfa = () => {
    void this.run(async () => {
      try {
        await authStore.signOut();
      } catch (err) {
        if (!isErrorType(err, ErrorTypes.sessionNotFound)) throw err;
      }
      this.go("sign-in");
    });
  };

  private onSignOut = () => {
    void this.run(() => authStore.signOut());
  };

  private bind(field: "email" | "password" | "passwordConfirm" | "name" | "phone" | "code") {
    return (e: Event) => {
      this[field] = (e.target as HTMLInputElement).value;
    };
  }

  // ───────────────────────────── render ─────────────────────────────

  protected render() {
    const content = this.renderStep();
    return html`
      <div class="panel ${this.embedded ? "embedded" : ""}" part="panel">
        ${this.renderHeader()}
        ${
          this.notice
            ? html`<div class="alert alert-${this.notice.tone}" role="status">
                ${this.notice.tone === "success" ? icons.checkCircle : this.notice.tone === "error" ? icons.alert : icons.info}
                <div class="alert-body">${this.notice.message}</div>
                <button
                  class="btn btn-ghost btn-icon dismiss"
                  @click=${() => this.dismissNotice()}
                  aria-label=${this.t("close")}
                >
                  ${icons.x}
                </button>
              </div>`
            : nothing
        }
        ${content}
      </div>
    `;
  }

  private renderHeader(): TemplateResult {
    const logo = this.config?.branding?.logo;
    const name = this.productName;
    let title = "";
    let description = "";
    if (this.auth.status === "signed-in") {
      title = this.t("signedInAs");
    } else {
      switch (this.step) {
        case "sign-in":
          title = name ? this.t("signInTitle", { name }) : this.t("welcomeBack");
          break;
        case "sign-up":
          title = name ? this.t("signUpTitle", { name }) : this.t("createAccount");
          break;
        case "forgot-password":
        case "reset-password":
          title = this.t("resetPassword");
          break;
        case "magic-url":
        case "email-otp":
          title = this.t("continueWithEmail");
          break;
        case "phone":
          title = this.t("continueWithPhone");
          break;
        case "mfa":
          title = this.t("mfaTitle");
          description = this.t("mfaDescription");
          break;
      }
    }
    return html`
      <div class="header">
        ${
          logo
            ? html`<img
                class="logo"
                src=${logo}
                alt=""
                @error=${(e: Event) => {
                  (e.target as HTMLImageElement).hidden = true;
                }}
              />`
            : nothing
        }
        ${authStore.isPreview ? html`<span class="badge badge-info preview">${this.t("preview")}</span>` : nothing}
        <h2 class="title" id="authui-title">${title}</h2>
        ${description ? html`<p class="description">${description}</p>` : nothing}
      </div>
    `;
  }

  private renderError(): TemplateResult | typeof nothing {
    return this.error
      ? html`<div class="alert alert-error" role="alert">
          ${icons.alert}
          <div class="alert-body">${this.error}</div>
        </div>`
      : nothing;
  }

  private submitButton(label: string, variant = "btn-primary"): TemplateResult {
    return html`<button class="btn ${variant} btn-block" type="submit" ?disabled=${this.busy}>
      ${this.busy ? html`<span class="spinner" aria-hidden="true"></span>` : nothing} ${label}
    </button>`;
  }

  private passwordField(opts: {
    label: string;
    autocomplete: string;
    id: string;
    field: "password" | "passwordConfirm";
    hint?: string;
    forgot?: boolean;
    /** Show the live strength meter (sign-up / reset only). */
    meter?: boolean;
  }): TemplateResult {
    const value = this[opts.field];
    const strength = opts.meter ? scorePassword(value) : null;
    return html`
      <div class="field">
        <div class="field-header">
          <label class="label" for=${opts.id}>${opts.label}</label>
          ${
            opts.forgot
              ? html`<button
                  type="button"
                  class="btn btn-link small"
                  @click=${() => this.go("forgot-password")}
                >
                  ${this.t("forgotPassword")}
                </button>`
              : nothing
          }
        </div>
        <div class="input-wrap">
          <input
            class="input"
            id=${opts.id}
            type=${this.showPassword ? "text" : "password"}
            autocomplete=${opts.autocomplete}
            required
            minlength="8"
            .value=${value}
            @input=${this.bind(opts.field)}
          />
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            @click=${() => (this.showPassword = !this.showPassword)}
            aria-label=${this.showPassword ? this.t("hidePassword") : this.t("showPassword")}
          >
            ${this.showPassword ? icons.eyeOff : icons.eye}
          </button>
        </div>
        ${
          strength && value
            ? html`<div class="strength" aria-live="polite">
                <div
                  class="strength-meter"
                  data-level=${String(strength.level)}
                  role="meter"
                  aria-label=${this.t("passwordStrengthLabel")}
                  aria-valuemin="0"
                  aria-valuemax="4"
                  aria-valuenow=${String(strength.level)}
                  aria-valuetext=${this.t(strength.labelKey)}
                >
                  <span></span><span></span><span></span><span></span>
                </div>
                <p class="strength-label">${this.t(strength.labelKey)}</p>
              </div>`
            : opts.hint
              ? html`<p class="hint">${opts.hint}</p>`
              : nothing
        }
      </div>
    `;
  }

  private emailField(autocomplete = "email"): TemplateResult {
    return html`
      <div class="field">
        <label class="label" for="authui-email">${this.t("email")}</label>
        <input
          class="input"
          id="authui-email"
          type="email"
          autocomplete=${autocomplete}
          required
          inputmode="email"
          .value=${this.email}
          @input=${this.bind("email")}
        />
      </div>
    `;
  }

  private codeField(): TemplateResult {
    return html`
      <div class="field">
        <label class="label" for="authui-code">${this.t("code")}</label>
        <input
          class="input input-otp"
          id="authui-code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          pattern="[0-9]*"
          required
          .value=${this.code}
          @input=${this.bind("code")}
        />
      </div>
    `;
  }

  /** True when sign-up must show/enforce the legal checkbox. */
  private needsLegalAcceptance(): boolean {
    const legal = this.config?.legal;
    if (!legal?.requireAcceptance) return false;
    return !!(legal.termsUrl || legal.privacyUrl);
  }

  /** Block sign-up / OAuth when the required legal checkbox is unchecked. */
  private ensureLegalAccepted(): boolean {
    if (!this.needsLegalAcceptance() || this.legalAccepted) return true;
    this.error = this.t("errorLegalRequired");
    return false;
  }

  private legalLinks(): TemplateResult | typeof nothing {
    const legal = this.config?.legal;
    if (!legal?.termsUrl && !legal?.privacyUrl) return nothing;
    return html`${
      legal.termsUrl
        ? html`<a href=${legal.termsUrl} target="_blank" rel="noopener">${this.t("terms")}</a>`
        : nothing
    }${legal.termsUrl && legal.privacyUrl ? html` ${this.t("and")} ` : nothing}${
      legal.privacyUrl
        ? html`<a href=${legal.privacyUrl} target="_blank" rel="noopener">${this.t("privacy")}</a>`
        : nothing
    }`;
  }

  private legal(): TemplateResult | typeof nothing {
    const legal = this.config?.legal;
    if (!legal?.termsUrl && !legal?.privacyUrl) return nothing;
    // On sign-up with requireAcceptance the checkbox replaces the passive footer.
    if (this.step === "sign-up" && this.needsLegalAcceptance()) return nothing;
    return html`<p class="legal">${this.t("agreeTo")} ${this.legalLinks()}.</p>`;
  }

  /** Required acceptance checkbox on sign-up when legal.requireAcceptance is set. */
  private legalAcceptField(): TemplateResult | typeof nothing {
    if (!this.needsLegalAcceptance()) return nothing;
    return html`<label class="legal-accept">
      <input
        type="checkbox"
        .checked=${this.legalAccepted}
        @change=${(e: Event) => {
          this.legalAccepted = (e.target as HTMLInputElement).checked;
          if (this.legalAccepted && this.error === this.t("errorLegalRequired")) this.error = "";
        }}
      />
      <span>${this.t("acceptLegal")} ${this.legalLinks()}.</span>
    </label>`;
  }

  private backLink(step: Step = "sign-in"): TemplateResult {
    return html`<div class="links">
      <button type="button" class="btn btn-link" @click=${() => this.go(step)}>
        ${icons.arrowLeft} ${this.t("back")}
      </button>
    </div>`;
  }

  private renderStep(): TemplateResult {
    if (this.auth.configError) {
      return html`<div class="alert alert-error" role="alert">
        ${icons.alert}
        <div class="alert-body">${this.auth.configError}</div>
      </div>`;
    }
    if (!this.auth.configured) {
      return html`<div class="alert alert-error" role="alert">
        ${icons.alert}
        <div class="alert-body">${this.t("errorNotConfigured")}</div>
      </div>`;
    }
    if (this.auth.status === "loading") {
      return html`<div class="empty"><span class="spinner"></span></div>`;
    }
    if (this.auth.status === "signed-in" && this.step !== "mfa") return this.renderSignedIn();

    switch (this.step) {
      case "sign-up":
        return this.config?.signUp === false ? this.renderSignIn() : this.renderSignUp();
      case "forgot-password":
        return this.renderForgot();
      case "reset-password":
        return this.renderReset();
      case "magic-url":
        return this.renderMagicUrl();
      case "email-otp":
        return this.renderEmailOtp();
      case "phone":
        return this.renderPhone();
      case "mfa":
        return this.renderMfa();
      default:
        return this.renderSignIn();
    }
  }

  private renderSignedIn(): TemplateResult {
    const user = this.auth.user!;
    const label = user.name || user.email || user.phone || this.t("guestAccount");
    return html`
      <div class="stack">
        <div class="row">
          <div class="inline">
            <span class="avatar">${avatarInitial(label)}</span>
            <div class="row-main">
              <span class="row-title" title=${label}>${label}</span>
              ${
                user.email && user.name
                  ? html`<span class="row-sub" title=${user.email}>${user.email}</span>`
                  : nothing
              }
            </div>
          </div>
        </div>
        ${this.renderError()}
        <div class="stack-sm">
          ${
            this.config?.successUrl
              ? html`<a class="btn btn-primary btn-block" href=${this.config.successUrl}
                  >${this.t("continue")}</a
                >`
              : nothing
          }
          <button
            class="btn btn-outline btn-block"
            @click=${() => {
              if (this.embedded) this.fire("authui-open", { view: "account" });
              else openModal("account");
            }}
          >
            ${icons.settings} ${this.t("manageAccount")}
          </button>
          <button class="btn btn-ghost btn-block" @click=${this.onSignOut} ?disabled=${this.busy}>
            ${icons.logOut} ${this.t("signOut")}
          </button>
        </div>
      </div>
    `;
  }

  private renderProviders(): TemplateResult | typeof nothing {
    const providers = [...(this.config?.methods?.oauth ?? [])];
    if (providers.length === 0) return nothing;
    const last = getLastMethod();
    const lastOAuth = providers.find((p) => last === `oauth:${p}`) ?? null;

    // Resolve layout: explicit config wins; otherwise stack for 1–2, accordion for 3+.
    const raw = this.config?.methods?.oauthLayout;
    const layout =
      raw === "horizontal" || raw === "icon"
        ? "icon"
        : raw === "stack" || raw === "accordion"
          ? raw
          : providers.length <= 2
            ? "stack"
            : "accordion";

    if (layout === "icon") {
      return html`
        <div class="providers icon">
          ${providers.map((p) => {
            const isLast = last === `oauth:${p}`;
            const label = this.t("continueWith", { provider: providerLabel(p) });
            return html`<button
              type="button"
              class="btn btn-outline ${isLast ? "last-used" : ""}"
              @click=${() => this.onOAuth(p)}
              ?disabled=${this.busy}
              aria-label=${isLast ? `${label}. ${this.t("lastUsed")}` : label}
              title=${label}
            >
              ${providerIcon(p)}
              ${
                isLast
                  ? html`<span class="oauth-last-used-dot" aria-hidden="true"></span>`
                  : nothing
              }
            </button>`;
          })}
        </div>
      `;
    }

    if (layout === "stack") {
      const ordered = [...providers].sort((a, b) => {
        const aLast = last === `oauth:${a}` ? 0 : 1;
        const bLast = last === `oauth:${b}` ? 0 : 1;
        return aLast - bLast;
      });
      return html`
        <div class="providers">
          ${ordered.map((p) => {
            const isLast = last === `oauth:${p}`;
            const label = this.t("continueWith", { provider: providerLabel(p) });
            return html`<button
              type="button"
              class="btn btn-outline ${isLast ? "last-used" : ""}"
              @click=${() => this.onOAuth(p)}
              ?disabled=${this.busy}
              aria-label=${isLast ? `${label}. ${this.t("lastUsed")}` : label}
            >
              ${providerIcon(p)}
              <span>${label}</span>
              ${isLast ? html`<span class="last-used-badge">${this.t("lastUsed")}</span>` : nothing}
            </button>`;
          })}
        </div>
      `;
    }

    // accordion (default for 3+)
    const expanded =
      this.expandedOAuth && providers.includes(this.expandedOAuth)
        ? this.expandedOAuth
        : (lastOAuth ?? providers[0]!);
    return html`
      <div
        class="providers accordion"
        @mouseleave=${() => {
          this.expandedOAuth = lastOAuth ?? providers[0]!;
        }}
      >
        ${providers.map((p) => {
          const isLast = last === `oauth:${p}`;
          const isExpanded = expanded === p;
          const label = this.t("continueWith", { provider: providerLabel(p) });
          return html`<div
            class="provider-slot ${isExpanded ? "is-expanded" : ""}"
            @mouseenter=${() => {
              this.expandedOAuth = p;
            }}
          >
            <button
              type="button"
              class="btn btn-outline"
              @click=${() => this.onOAuth(p)}
              @focus=${() => {
                this.expandedOAuth = p;
              }}
              ?disabled=${this.busy}
              aria-label=${isLast ? `${label}. ${this.t("lastUsed")}` : label}
            >
              ${providerIcon(p)}
              <span class="provider-label"
                ><span><span class="provider-label-text">${label}</span></span></span
              >
              ${
                isLast
                  ? html`<span class="oauth-last-used" data-last-used=${p} aria-hidden="true">
                      <span class="oauth-last-used-dot"></span>
                      <span class="oauth-last-used-pill">${this.t("lastUsed")}</span>
                    </span>`
                  : nothing
              }
            </button>
          </div>`;
        })}
      </div>
    `;
  }

  private renderSignIn(): TemplateResult {
    const m = this.config?.methods ?? {};
    const emailPassword = m.emailPassword !== false;
    const hasProviders = (m.oauth?.length ?? 0) > 0;
    const passwordless = [
      m.magicUrl
        ? { step: "magic-url" as Step, icon: icons.link, label: this.t("sendMagicLink") }
        : null,
      m.emailOtp
        ? { step: "email-otp" as Step, icon: icons.mail, label: this.t("continueWithEmail") }
        : null,
      m.phone
        ? { step: "phone" as Step, icon: icons.smartphone, label: this.t("continueWithPhone") }
        : null,
    ].filter(Boolean) as { step: Step; icon: TemplateResult; label: string }[];

    return html`
      <div class="stack">
        ${this.renderProviders()}
        ${
          hasProviders && (emailPassword || passwordless.length > 0)
            ? html`<div class="separator-text">${this.t("or")}</div>`
            : nothing
        }
        ${
          emailPassword
            ? html`<form
                class="form ${getLastMethod() === "email-password" ? "last-used-form" : ""}"
                @submit=${this.onSignIn}
                novalidate
              >
                ${
                  getLastMethod() === "email-password"
                    ? html`<p class="hint">
                        <span class="last-used-badge">${this.t("lastUsed")}</span>
                      </p>`
                    : nothing
                }
                ${this.emailField()}
                ${this.passwordField({ label: this.t("password"), autocomplete: "current-password", id: "authui-password", field: "password", forgot: true })}
                ${this.renderError()} ${this.submitButton(this.t("signIn"))}
              </form>`
            : this.renderError()
        }
        ${
          passwordless.length > 0
            ? html`<div class="stack-sm">
                ${passwordless.map((p) => {
                  const isLast = getLastMethod() === p.step;
                  return html`<button
                    type="button"
                    class="btn btn-secondary btn-block ${isLast ? "last-used" : ""}"
                    @click=${() => this.go(p.step)}
                  >
                    ${p.icon} ${p.label}
                    ${isLast ? html`<span class="last-used-badge">${this.t("lastUsed")}</span>` : nothing}
                  </button>`;
                })}
              </div>`
            : nothing
        }
        ${
          m.anonymous
            ? html`<button
                type="button"
                class="btn btn-ghost btn-block ${getLastMethod() === "anonymous" ? "last-used" : ""}"
                @click=${this.onGuest}
                ?disabled=${this.busy}
              >
                ${icons.ghost} ${this.t("continueAsGuest")}
                ${
                  getLastMethod() === "anonymous"
                    ? html`<span class="last-used-badge">${this.t("lastUsed")}</span>`
                    : nothing
                }
              </button>`
            : nothing
        }
        ${
          emailPassword && this.config?.signUp !== false
            ? html`<div class="links">
                <span>${this.t("noAccount")}</span>
                <button type="button" class="btn btn-link" @click=${() => this.go("sign-up")}>
                  ${this.t("signUp")}
                </button>
              </div>`
            : nothing
        }
        ${this.legal()}
      </div>
    `;
  }

  private renderSignUp(): TemplateResult {
    return html`
      <div class="stack">
        ${this.renderProviders()}
        ${(this.config?.methods?.oauth?.length ?? 0) > 0 ? html`<div class="separator-text">${this.t("or")}</div>` : nothing}
        <form class="form" @submit=${this.onSignUp} novalidate>
          ${
            this.config?.requireName !== false
              ? html`<div class="field">
                  <label class="label" for="authui-name">${this.t("name")}</label>
                  <input
                    class="input"
                    id="authui-name"
                    type="text"
                    autocomplete="name"
                    required
                    .value=${this.name}
                    @input=${this.bind("name")}
                  />
                </div>`
              : nothing
          }
          ${this.emailField()}
          ${this.passwordField({ label: this.t("password"), autocomplete: "new-password", id: "authui-password", field: "password", hint: this.t("passwordHint"), meter: true })}
          ${this.legalAcceptField()} ${this.renderError()}
          ${this.submitButton(this.t("createAccount"))}
        </form>
        <div class="links">
          <span>${this.t("haveAccount")}</span>
          <button type="button" class="btn btn-link" @click=${() => this.go("sign-in")}>
            ${this.t("signIn")}
          </button>
        </div>
        ${this.legal()}
      </div>
    `;
  }

  private renderForgot(): TemplateResult {
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onForgot} novalidate>
          ${this.emailField()} ${this.renderError()} ${this.submitButton(this.t("sendResetLink"))}
        </form>
        ${this.backLink()}
      </div>
    `;
  }

  private renderReset(): TemplateResult {
    if (!this.recovery) {
      return html`<div class="stack">
        <div class="alert alert-error" role="alert">
          ${icons.alert}
          <div class="alert-body">${this.t("errorInvalidToken")}</div>
        </div>
        <div class="links">
          <button
            type="button"
            class="btn btn-link"
            @click=${() => {
              this.go("forgot-password");
            }}
          >
            ${this.t("requestNewLink")}
          </button>
        </div>
      </div>`;
    }
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onReset} novalidate>
          ${this.passwordField({ label: this.t("newPassword"), autocomplete: "new-password", id: "authui-password", field: "password", hint: this.t("passwordHint"), meter: true })}
          ${this.passwordField({ label: this.t("confirmPassword"), autocomplete: "new-password", id: "authui-password-confirm", field: "passwordConfirm" })}
          ${this.renderError()} ${this.submitButton(this.t("resetPassword"))}
        </form>
        <div class="links">
          <button
            type="button"
            class="btn btn-link"
            @click=${() => {
              this.step = "sign-in";
              this.error = "";
              this.notice = null;
              this.focusOnStep = true;
              this.fire("authui-view", { view: "sign-in" });
            }}
          >
            ${icons.arrowLeft} ${this.t("back")}
          </button>
        </div>
      </div>
    `;
  }

  private phraseBox(phrase?: string): TemplateResult | typeof nothing {
    if (!phrase) return nothing;
    return html`<div class="alert alert-info">
      ${icons.shield}
      <div class="alert-title">
        ${this.t("securityPhrase")}: <span class="code">${phrase}</span>
      </div>
      <div class="alert-body">${this.t("securityPhraseHint")}</div>
    </div>`;
  }

  private renderMagicUrl(): TemplateResult {
    if (this.token) {
      return html`<div class="stack">
        <div class="alert alert-success" role="status">
          ${icons.mail}
          <div class="alert-body">${this.t("magicLinkSent", { email: this.token.target })}</div>
        </div>
        ${this.phraseBox(this.token.phrase)} ${this.backLink()}
      </div>`;
    }
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onMagicUrl} novalidate>
          ${this.emailField()} ${this.renderError()} ${this.submitButton(this.t("sendMagicLink"))}
        </form>
        ${this.backLink()} ${this.legal()}
      </div>
    `;
  }

  private async onResendCode(): Promise<void> {
    const token = this.token;
    if (!token || Date.now() < this.resendCooldownUntil) return;
    this.error = "";
    await this.run(async () => {
      if (token.kind === "phone") {
        const next = await authStore.sendPhoneOtp(token.target);
        this.token = { userId: next.userId, kind: "phone", target: token.target };
      } else {
        const next = await authStore.sendEmailOtp(token.target);
        this.token = {
          userId: next.userId,
          kind: "email-otp",
          target: token.target,
          phrase: next.phrase,
        };
      }
      this.resendCooldownUntil = Date.now() + 30000;
      window.setTimeout(() => this.requestUpdate(), 30000);
    });
  }

  private renderCodeEntry(): TemplateResult {
    const isPhone = this.token?.kind === "phone";
    const cooling = Date.now() < this.resendCooldownUntil;
    return html`
      <div class="alert alert-info" role="status">
        ${isPhone ? icons.smartphone : icons.mail}
        <div class="alert-body">${this.t("codeSent", { target: this.token!.target })}</div>
      </div>
      ${this.phraseBox(this.token!.phrase)}
      <form class="form" @submit=${this.onVerifyCode} novalidate>
        ${this.codeField()} ${this.renderError()} ${this.submitButton(this.t("verifyCode"))}
      </form>
      <div class="links">
        <button
          type="button"
          class="btn btn-link"
          ?disabled=${cooling || this.busy}
          @click=${() => void this.onResendCode()}
        >
          ${this.t("resendCode")}
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          class="btn btn-link"
          @click=${() => {
            this.token = null;
            this.error = "";
          }}
        >
          ${isPhone ? this.t("useDifferentPhone") : this.t("useDifferentEmail")}
        </button>
      </div>
    `;
  }

  private renderEmailOtp(): TemplateResult {
    if (this.token) return html`<div class="stack">${this.renderCodeEntry()}</div>`;
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onEmailOtp} novalidate>
          ${this.emailField()} ${this.renderError()} ${this.submitButton(this.t("sendCode"))}
        </form>
        ${this.backLink()} ${this.legal()}
      </div>
    `;
  }

  private renderPhone(): TemplateResult {
    if (this.token) return html`<div class="stack">${this.renderCodeEntry()}</div>`;
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onPhoneOtp} novalidate>
          <div class="field">
            <label class="label" for="authui-phone">${this.t("phone")}</label>
            <input
              class="input"
              id="authui-phone"
              type="tel"
              autocomplete="tel"
              placeholder="+1 555 000 0000"
              required
              .value=${this.phone}
              @input=${this.bind("phone")}
            />
          </div>
          ${this.renderError()} ${this.submitButton(this.t("sendCode"))}
        </form>
        ${this.backLink()} ${this.legal()}
      </div>
    `;
  }

  private renderMfa(): TemplateResult {
    const factors: Models.MfaFactors | null = this.auth.mfaFactors;
    if (!this.challenge) {
      const choices: {
        factor: MfaFactor;
        icon: TemplateResult;
        label: string;
        available: boolean;
      }[] = [
        {
          factor: "totp",
          icon: icons.smartphone,
          label: this.t("mfaUseAuthenticator"),
          available: factors?.totp ?? true,
        },
        {
          factor: "email",
          icon: icons.mail,
          label: this.t("mfaUseEmail"),
          available: factors?.email ?? true,
        },
        {
          factor: "phone",
          icon: icons.phone,
          label: this.t("mfaUsePhone"),
          available: factors?.phone ?? true,
        },
        {
          factor: "recoverycode",
          icon: icons.key,
          label: this.t("mfaUseRecoveryCode"),
          available: factors?.recoveryCode ?? true,
        },
      ];
      return html`
        <div class="stack">
          <div class="stack-sm">
            ${choices
              .filter((c) => c.available)
              .map(
                (c) =>
                  html`<button
                    type="button"
                    class="choice"
                    @click=${() => this.onChooseFactor(c.factor)}
                    ?disabled=${this.busy}
                  >
                    ${c.icon}<span class="choice-title">${c.label}</span>
                  </button>`
              )}
          </div>
          ${this.renderError()}
          <div class="links">
            <button type="button" class="btn btn-link" @click=${this.onCancelMfa}>
              ${this.t("cancel")}
            </button>
          </div>
        </div>
      `;
    }
    const isRecovery = this.challenge.factor === "recoverycode";
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onVerifyFactor} novalidate>
          ${
            isRecovery
              ? html`<div class="field">
                  <label class="label" for="authui-code">${this.t("recoveryCode")}</label>
                  <input
                    class="input mono"
                    id="authui-code"
                    type="text"
                    autocomplete="off"
                    required
                    .value=${this.code}
                    @input=${this.bind("code")}
                  />
                </div>`
              : this.codeField()
          }
          ${this.renderError()} ${this.submitButton(this.t("verifyCode"))}
        </form>
        <div class="links">
          <button type="button" class="btn btn-link" @click=${() => (this.challenge = null)}>
            ${icons.arrowLeft} ${this.t("back")}
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" class="btn btn-link" @click=${this.onCancelMfa}>
            ${this.t("cancel")}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-sign-in": AuthUISignIn;
  }
}
