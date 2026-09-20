import { html, nothing, type TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { Models } from "appwrite";
import { AuthUIElement } from "./element.js";
import { signInStyles } from "./sign-in.styles.js";
import { authStore, type MfaFactor } from "../store.js";
import { describeError, ErrorTypes, isErrorType } from "../errors.js";
import { icons, providerIcon } from "../icons.js";
import { providerLabel } from "../i18n.js";
import type { AuthUIView, OAuthProviderName } from "../types.js";

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
  @state() private token: PendingToken | null = null;
  @state() private challenge: { id: string; factor: MfaFactor } | null = null;
  @state() private recovery: { userId: string; secret: string } | null = null;

  @query("form input:not([type=hidden])") private firstInput?: HTMLInputElement;

  private email = "";
  private password = "";
  private passwordConfirm = "";
  private name = "";
  private phone = "";
  private code = "";

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
    if (changed.has("step")) {
      requestAnimationFrame(() => this.firstInput?.focus());
    }
  }

  /** React to store transitions: MFA pending, redirect results, sign in. */
  private syncFromStore(): void {
    const { status, pending } = this.auth;
    if (status === "mfa-required" && this.step !== "mfa") {
      this.go("mfa");
    }
    if (status === "signed-in" || status === "signed-out") {
      const stuck =
        this.step === "mfa" ||
        this.step === "phone" ||
        this.step === "email-otp" ||
        this.step === "magic-url" ||
        this.step === "forgot-password" ||
        this.step === "reset-password" ||
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
      this.notice = { tone: "error", message: this.t("errorOAuth") };
      authStore.setPending(null);
    }
    if (pending?.type === "notice") {
      this.notice = {
        tone: pending.tone === "error" ? "error" : pending.tone,
        message: pending.message,
      };
      authStore.setPending(null);
    }
  }

  /** Navigate between screens and reset transient state. */
  go(step: Step): void {
    this.step = step;
    this.error = "";
    this.busy = false;
    this.showPassword = false;
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

  private onSignIn = (e: Event) => {
    e.preventDefault();
    void this.run(async () => {
      await authStore.signInWithEmailPassword(this.email, this.password);
      this.password = "";
      this.fire("authui-success", { method: "email-password" });
    });
  };

  private onSignUp = (e: Event) => {
    e.preventDefault();
    void this.run(async () => {
      await authStore.signUp(this.email, this.password, this.name);
      this.password = "";
      this.fire("authui-success", { method: "sign-up" });
    });
  };

  private onGuest = () => {
    void this.run(async () => {
      await authStore.signInAnonymously();
      this.fire("authui-success", { method: "anonymous" });
    });
  };

  private onOAuth = (provider: OAuthProviderName) => {
    void this.run(async () => {
      await authStore.signInWithOAuth(provider);
      if (authStore.isPreview) {
        this.fire("authui-success", { method: "oauth" });
        return;
      }
      // The browser navigates away; keep the spinner visible until it does.
      await new Promise((r) => setTimeout(r, 4000));
    });
  };

  private onForgot = (e: Event) => {
    e.preventDefault();
    void this.run(async () => {
      await authStore.sendPasswordRecovery(this.email);
      this.notice = { tone: "success", message: this.t("resetLinkSent", { email: this.email }) };
    });
  };

  private onReset = (e: Event) => {
    e.preventDefault();
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
      this.notice = { tone: "success", message: this.t("passwordUpdated") };
      this.go("sign-in");
    });
  };

  private onMagicUrl = (e: Event) => {
    e.preventDefault();
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
    void this.run(async () => {
      const token = await authStore.sendPhoneOtp(this.phone);
      this.token = { userId: token.userId, kind: "phone", target: this.phone };
      this.code = "";
    });
  };

  private onVerifyCode = (e: Event) => {
    e.preventDefault();
    const token = this.token;
    if (!token) return;
    void this.run(async () => {
      await authStore.signInWithToken(token.userId, this.code);
      this.code = "";
      this.token = null;
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
                  @click=${() => (this.notice = null)}
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
    switch (this.step) {
      case "sign-in":
        title =
          this.auth.status === "signed-in"
            ? this.t("signedInAs")
            : name
              ? this.t("signInTitle", { name })
              : this.t("welcomeBack");
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
    return html`
      <header class="header">
        ${logo ? html`<img class="logo" src=${logo} alt=${name || "Logo"} />` : nothing}
        ${authStore.isPreview ? html`<span class="badge badge-info preview">${this.t("preview")}</span>` : nothing}
        <h2 class="title" id="authui-title">${title}</h2>
        ${description ? html`<p class="description">${description}</p>` : nothing}
      </header>
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
  }): TemplateResult {
    return html`
      <div class="field">
        <label class="label" for=${opts.id}>
          ${opts.label}
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
        </label>
        <div class="input-wrap">
          <input
            class="input"
            id=${opts.id}
            type=${this.showPassword ? "text" : "password"}
            autocomplete=${opts.autocomplete}
            required
            minlength="8"
            .value=${this[opts.field]}
            @input=${this.bind(opts.field)}
          />
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            @click=${() => (this.showPassword = !this.showPassword)}
            aria-label=${this.showPassword ? "Hide password" : "Show password"}
            tabindex="-1"
          >
            ${this.showPassword ? icons.eyeOff : icons.eye}
          </button>
        </div>
        ${opts.hint ? html`<p class="hint">${opts.hint}</p>` : nothing}
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
          required
          .value=${this.code}
          @input=${this.bind("code")}
        />
      </div>
    `;
  }

  private legal(): TemplateResult | typeof nothing {
    const legal = this.config?.legal;
    if (!legal?.termsUrl && !legal?.privacyUrl) return nothing;
    return html`<p class="legal">
      ${this.t("agreeTo")}
      ${legal.termsUrl ? html`<a href=${legal.termsUrl} target="_blank" rel="noopener">${this.t("terms")}</a>` : nothing}
      ${legal.termsUrl && legal.privacyUrl ? html` ${this.t("and")} ` : nothing}
      ${legal.privacyUrl ? html`<a href=${legal.privacyUrl} target="_blank" rel="noopener">${this.t("privacy")}</a>` : nothing}.
    </p>`;
  }

  private backLink(step: Step = "sign-in"): TemplateResult {
    return html`<div class="links">
      <button type="button" class="btn btn-link" @click=${() => this.go(step)}>
        ${icons.arrowLeft} ${this.t("back")}
      </button>
    </div>`;
  }

  private renderStep(): TemplateResult {
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
        return this.renderSignUp();
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
            <span class="avatar">${label[0] ?? "?"}</span>
            <div class="row-main">
              <span class="row-title">${label}</span>
              ${user.email && user.name ? html`<span class="row-sub">${user.email}</span>` : nothing}
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
            @click=${() => this.fire("authui-open", { view: "account" })}
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
    const providers = this.config?.methods?.oauth ?? [];
    if (providers.length === 0) return nothing;
    const compact = providers.length > 2;
    return html`
      <div class="providers ${compact ? "two" : ""}">
        ${providers.map(
          (p) =>
            html`<button
              type="button"
              class="btn btn-outline"
              @click=${() => this.onOAuth(p)}
              ?disabled=${this.busy}
              aria-label=${this.t("continueWith", { provider: providerLabel(p) })}
            >
              ${providerIcon(p)}
              <span
                >${compact ? providerLabel(p) : this.t("continueWith", { provider: providerLabel(p) })}</span
              >
            </button>`
        )}
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
            ? html`<form class="form" @submit=${this.onSignIn} novalidate>
                ${this.emailField()}
                ${this.passwordField({ label: this.t("password"), autocomplete: "current-password", id: "authui-password", field: "password", forgot: true })}
                ${this.renderError()} ${this.submitButton(this.t("signIn"))}
              </form>`
            : this.renderError()
        }
        ${
          passwordless.length > 0
            ? html`<div class="stack-sm">
                ${passwordless.map(
                  (p) =>
                    html`<button
                      type="button"
                      class="btn btn-secondary btn-block"
                      @click=${() => this.go(p.step)}
                    >
                      ${p.icon} ${p.label}
                    </button>`
                )}
              </div>`
            : nothing
        }
        ${
          m.anonymous
            ? html`<button
                type="button"
                class="btn btn-ghost btn-block"
                @click=${this.onGuest}
                ?disabled=${this.busy}
              >
                ${icons.ghost} ${this.t("continueAsGuest")}
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
          ${this.passwordField({ label: this.t("password"), autocomplete: "new-password", id: "authui-password", field: "password", hint: this.t("passwordHint") })}
          ${this.renderError()} ${this.submitButton(this.t("createAccount"))}
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
        ${this.backLink()}
      </div>`;
    }
    return html`
      <div class="stack">
        <form class="form" @submit=${this.onReset} novalidate>
          ${this.passwordField({ label: this.t("newPassword"), autocomplete: "new-password", id: "authui-password", field: "password", hint: this.t("passwordHint") })}
          ${this.passwordField({ label: this.t("confirmPassword"), autocomplete: "new-password", id: "authui-password-confirm", field: "passwordConfirm" })}
          ${this.renderError()} ${this.submitButton(this.t("resetPassword"))}
        </form>
        ${this.backLink()}
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
        ${this.backLink()}
      </div>
    `;
  }

  private renderCodeEntry(): TemplateResult {
    return html`
      <div class="alert alert-info" role="status">
        ${icons.mail}
        <div class="alert-body">${this.t("codeSent", { target: this.token!.target })}</div>
      </div>
      ${this.phraseBox(this.token!.phrase)}
      <form class="form" @submit=${this.onVerifyCode} novalidate>
        ${this.codeField()} ${this.renderError()} ${this.submitButton(this.t("verifyCode"))}
      </form>
      <div class="links">
        <button type="button" class="btn btn-link" @click=${() => (this.token = null)}>
          ${this.t("sendCode")}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" class="btn btn-link" @click=${() => this.go("sign-in")}>
          ${this.t("back")}
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
        ${this.backLink()}
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
        ${this.backLink()}
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
