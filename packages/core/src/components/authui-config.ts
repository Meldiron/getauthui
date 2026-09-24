import { customElement, property } from "lit/decorators.js";
import { LitElement, css } from "lit";
import { authStore } from "../store.js";
import type {
  AuthUIConfig,
  AuthUIMethods,
  AuthUIRadius,
  AuthUITheme,
  OAuthProviderName,
} from "../types.js";

/**
 * Declarative configuration. Drop it anywhere in the page:
 *
 * <authui-config endpoint="https://cloud.appwrite.io/v1" project="YOUR_PROJECT_ID"
 *   methods="email-password magic-url anonymous oauth:google oauth:github"></authui-config>
 */
@customElement("authui-config")
export class AuthUIConfigElement extends LitElement {
  static styles = css`
    :host {
      display: none;
    }
  `;

  @property({ type: String }) endpoint = "";
  @property({ type: String }) project = "";
  @property({ type: String, attribute: "redirect-url" }) redirectUrl = "";
  @property({ type: String, attribute: "success-url" }) successUrl = "";
  /** Space separated list, e.g. "email-password magic-url email-otp phone anonymous oauth:google". */
  @property({ type: String }) methods = "email-password";
  @property({ type: String, attribute: "sign-up" }) signUp = "true";
  @property({ type: String, attribute: "require-name" }) requireName = "true";
  @property({ type: String }) mfa = "true";
  @property({ type: String, attribute: "security-phrase" }) securityPhrase = "true";
  @property({ type: String }) name = "";
  @property({ type: String }) logo = "";
  @property({ type: String }) theme = "auto";
  @property({ type: String }) radius = "";
  @property({ type: String }) primary = "";
  @property({ type: String, attribute: "primary-foreground" }) primaryForeground = "";
  @property({ type: String, attribute: "terms-url" }) termsUrl = "";
  @property({ type: String, attribute: "privacy-url" }) privacyUrl = "";
  /** When "true", sign-up requires accepting terms/privacy before submit or OAuth. */
  @property({ type: String, attribute: "require-acceptance" }) requireAcceptance = "";
  /** OAuth button layout: stack | accordion | icon | horizontal. */
  @property({ type: String, attribute: "oauth-layout" }) oauthLayout = "";
  @property({ type: String }) preview = "";
  /** Built-in locale pack: en (default), cs, de, fr. */
  @property({ type: String }) locale = "";
  /** When "true", auto-prompt Google One Tap on signed-out sign-in/sign-up. */
  @property({ type: String, attribute: "one-tap" }) oneTap = "";
  /** Google OAuth Web client ID for One Tap (required when one-tap is on). */
  @property({ type: String, attribute: "google-client-id" }) googleClientId = "";
  /** When "true", sign-in uses email → Continue → password. */
  @property({ type: String, attribute: "identifier-first" }) identifierFirst = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.configure();
  }

  protected updated(): void {
    this.configure();
  }

  private configure(): void {
    if (!this.endpoint || !this.project) {
      // Defer one microtask so attributes set in the same turn can land first
      // (e.g. frameworks that assign properties right after createElement).
      queueMicrotask(() => {
        if (!this.endpoint || !this.project) authStore.notifyConfigIncomplete();
      });
      return;
    }
    const config = this.toConfig();
    const current = authStore.getConfig();
    if (current && JSON.stringify(current) === JSON.stringify(config)) return;
    authStore.configure(config);
  }

  toConfig(): AuthUIConfig {
    const methods: AuthUIMethods = { oauth: [] };
    const tokens = this.methods.split(/[\s,]+/).filter(Boolean);
    for (const token of tokens) {
      if (token.startsWith("oauth:")) methods.oauth!.push(token.slice(6) as OAuthProviderName);
      else if (token === "email-password") methods.emailPassword = true;
      else if (token === "magic-url") methods.magicUrl = true;
      else if (token === "email-otp") methods.emailOtp = true;
      else if (token === "phone") methods.phone = true;
      else if (token === "anonymous" || token === "guest") methods.anonymous = true;
    }
    // When methods is set, only enable email+password if it was listed. Empty attr keeps the default on.
    methods.emailPassword = tokens.length > 0 ? tokens.includes("email-password") : true;
    if (this.oauthLayout) {
      methods.oauthLayout = this.oauthLayout as AuthUIMethods["oauthLayout"];
    }

    return {
      endpoint: this.endpoint,
      project: this.project,
      redirectUrl: this.redirectUrl || undefined,
      successUrl: this.successUrl || undefined,
      methods,
      signUp: this.signUp !== "false",
      requireName: this.requireName !== "false",
      mfa: this.mfa !== "false",
      securityPhrase: this.securityPhrase !== "false",
      branding: {
        name: this.name || undefined,
        logo: this.logo || undefined,
        theme: (this.theme || "auto") as AuthUITheme,
        radius: (this.radius || undefined) as AuthUIRadius | undefined,
        primary: this.primary || undefined,
        primaryForeground: this.primaryForeground || undefined,
      },
      legal: {
        termsUrl: this.termsUrl || undefined,
        privacyUrl: this.privacyUrl || undefined,
        requireAcceptance:
          this.requireAcceptance !== "" && this.requireAcceptance !== "false" ? true : undefined,
      },
      preview: this.preview === "" || this.preview === "false" ? undefined : true,
      locale: this.locale.trim() || undefined,
      oneTap: this.oneTap !== "" && this.oneTap !== "false" ? true : undefined,
      googleClientId: this.googleClientId.trim() || undefined,
      identifierFirst:
        this.identifierFirst !== "" && this.identifierFirst !== "false" ? true : undefined,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-config": AuthUIConfigElement;
  }
}
