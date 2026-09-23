import { css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Avatars, type Models } from "appwrite";
import { AuthUIElement } from "./element.js";
import { authStore, type MfaFactor } from "../store.js";
import { previewQrDataUrl } from "../preview.js";
import { describeError, ErrorTypes, isErrorType } from "../errors.js";
import { avatarInitial, icons, providerIcon } from "../icons.js";
import { providerLabel } from "../i18n.js";
import { scorePassword } from "../password-strength.js";
import {
  PHONE_COUNTRIES,
  defaultPhoneCountryIso,
  flagEmoji,
  parsePhone,
  toE164,
} from "../phone-countries.js";
import { otpInput } from "../otp-input.js";
import { alternateMfaFactors, mfaFactorHintKey } from "../mfa.js";
import { relativeTimeParts, type RelativeUnit } from "../relative-time.js";

type Tab = "profile" | "security" | "sessions" | "connections" | "activity";

interface Notice {
  tone: "success" | "error" | "info";
  message: string;
}

/**
 * Self-service account management: profile, password, MFA (authenticator app and
 * recovery codes), sessions, connected OAuth identities, security log and account deletion.
 */
@customElement("authui-account")
export class AuthUIAccount extends AuthUIElement {
  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: block;
        width: 100%;
        max-width: 560px;
        min-width: 0;
      }
      .panel {
        min-width: 0;
        overflow: hidden;
        background: var(--authui-card);
        color: var(--authui-card-foreground);
        border: 1px solid var(--authui-border);
        border-radius: var(--authui-radius-xl);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: var(--authui-shadow-lg);
      }
      .panel.embedded {
        border: 0;
        box-shadow: none;
        padding: 0;
        background: transparent;
        /* Let input focus rings paint outside the panel (modal body supplies padding). */
        overflow: visible;
      }
      .identity {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      .identity .row-title {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .identity .row-title .badge {
        display: inline-flex;
        vertical-align: middle;
        margin-inline-start: 6px;
      }
      .between > .btn {
        flex-shrink: 0;
      }
      .identity .avatar {
        width: 44px;
        height: 44px;
        font-size: 16px;
      }
      .tabs {
        width: 100%;
      }
      .section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .kv {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .device {
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: var(--authui-radius-md);
        background: var(--authui-muted);
        color: var(--authui-muted-foreground);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: visible;
        box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--authui-border) 70%, transparent);
      }
      .device svg {
        width: 18px;
        height: 18px;
      }
      .device-img {
        width: 36px;
        height: 36px;
        object-fit: contain;
        padding: 4px;
        border-radius: var(--authui-radius-md);
        display: block;
      }
      .device-badge {
        position: absolute;
        inset-inline-end: -3px;
        bottom: -3px;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: var(--authui-card);
        color: var(--authui-muted-foreground);
        box-shadow: 0 0 0 2px var(--authui-card);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .device-badge svg {
        width: 10px;
        height: 10px;
      }
      .flag {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        object-fit: cover;
        box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--authui-border) 50%, transparent);
        flex-shrink: 0;
        vertical-align: middle;
      }
      .row-sub-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .row-sub-meta .flag {
        margin-inline-end: 2px;
      }
      .session-badges {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
      }
      .session-badges .badge {
        font-size: 10px;
        padding: 0 6px;
        height: 18px;
        gap: 3px;
      }
      .session-badges .badge svg {
        width: 10px;
        height: 10px;
      }
      .session-dates {
        display: block;
        font-size: 11px;
        color: var(--authui-muted-foreground);
        margin-top: 2px;
      }
      .session-dates time,
      .log-time {
        cursor: default;
        border-bottom: 1px dotted
          color-mix(in oklab, var(--authui-muted-foreground) 50%, transparent);
      }
      .log-time {
        font-size: 12px;
        color: var(--authui-muted-foreground);
        white-space: nowrap;
      }
      .connection-dates {
        display: block;
        font-size: 11px;
        color: var(--authui-muted-foreground);
        margin-top: 2px;
      }
      .connection-dates time {
        cursor: default;
        border-bottom: 1px dotted
          color-mix(in oklab, var(--authui-muted-foreground) 50%, transparent);
      }
      .mfa-alts {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .warn {
        color: var(--authui-destructive-foreground);
      }
    `,
  ];

  /** Set by <authui-modal>; hides the card chrome. */
  @property({ type: Boolean }) embedded = false;
  @property({ type: String }) tab: Tab = "profile";

  @state() private active: Tab = "profile";
  @state() private busy = "";
  @state() private notice: Notice | null = null;
  @state() private errors: Record<string, string> = {};

  // profile
  @state() private nameInput = "";
  @state() private emailInput = "";
  @state() private emailPassword = "";
  @state() private phoneInput = "";
  @state() private phoneCountryIso = defaultPhoneCountryIso();
  @state() private phoneNational = "";
  @state() private phonePassword = "";
  @state() private phoneCode = "";
  @state() private phoneCodeSent = false;
  @state() private guestName = "";
  @state() private showEmailPassword = false;
  @state() private showPhonePassword = false;

  // security
  @state() private oldPassword = "";
  @state() private newPassword = "";
  @state() private newPasswordConfirm = "";
  @state() private showOldPassword = false;
  @state() private showNewPassword = false;
  @state() private showNewPasswordConfirm = false;
  @state() private authenticator: Models.MfaType | null = null;
  @state() private authenticatorCode = "";
  @state() private factors: Models.MfaFactors | null = null;
  @state() private recoveryCodes: string[] | null = null;
  /** User confirmed they saved view-once recovery codes (gates Done). */
  @state() private recoveryCodesSaved = false;
  @state() private stepUp: {
    retry: () => Promise<void>;
    challenge?: { id: string; factor: MfaFactor };
  } | null = null;
  @state() private stepUpCode = "";
  @state() private copied = false;

  // sessions / identities / logs
  @state() private sessions: Models.Session[] | null = null;
  /** Session ids whose browser avatar failed to load. */
  @state() private browserIconFailed: Record<string, boolean> = {};
  @state() private identities: Models.Identity[] | null = null;
  @state() private logs: Models.Log[] | null = null;
  /** null = probing, true = show Activity, false = hide. */
  @state() private logsSupported: boolean | null = null;
  private logsProbeStarted = false;
  @state() private confirmDelete = false;
  @state() private confirmRegenerate = false;
  @state() private confirmRemoveAuthenticator = false;
  @state() private confirmSignOutAll = false;
  @state() private confirmDisconnectId: string | null = null;
  @state() private verifyEmailCooldownUntil = 0;
  private verifyEmailCooldownTimer: ReturnType<typeof setInterval> | null = null;
  @state() private verifyPhoneCooldownUntil = 0;
  private verifyPhoneCooldownTimer: ReturnType<typeof setInterval> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.active = this.tab;
    this.hydrate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearVerifyEmailCooldownTimer();
    this.clearVerifyPhoneCooldownTimer();
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("tab") && changed.get("tab") !== undefined) this.active = this.tab;
    if (changed.has("auth")) this.hydrate();
    this.ensureLoaded();
  }

  /** Lazily load data for the active tab once a user is available. */
  private ensureLoaded(): void {
    if (!this.user || this.busy) return;
    if (!this.logsProbeStarted) void this.probeLogsSupport();
    if (this.active === "sessions" && this.sessions === null) void this.loadSessions();
    else if (this.active === "connections" && this.identities === null) void this.loadIdentities();
    else if (this.active === "activity" && this.logsSupported === true && this.logs === null)
      void this.loadLogs();
    else if (this.active === "activity" && this.logsSupported === false) this.active = "profile";
    else if (this.active === "security" && this.factors === null) void this.loadFactors();
  }

  private hydrate(): void {
    const user = this.auth.user;
    if (!user) return;
    if (!this.nameInput) this.nameInput = user.name ?? "";
    if (!this.emailInput) this.emailInput = user.email ?? "";
    if (!this.phoneInput) {
      const raw = user.phone ?? "";
      this.phoneInput = raw;
      if (raw) {
        const parsed = parsePhone(raw, this.phoneCountryIso);
        this.phoneCountryIso = parsed.iso;
        this.phoneNational = parsed.national;
      }
    }
  }

  private get user(): Models.User<Models.Preferences> | null {
    return this.auth.user;
  }

  private get isGuest(): boolean {
    const u = this.user;
    return !!u && !u.email && !u.phone;
  }

  private onTabsKeydown = (e: KeyboardEvent) => {
    const tabs = [...(this.renderRoot?.querySelectorAll('[role="tab"]') ?? [])] as HTMLElement[];
    if (!tabs.length) return;
    const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const id = tabs[next]!.id.replace("authui-tab-", "") as Tab;
    this.select(id);
    requestAnimationFrame(() => tabs[next]?.focus());
  };

  private select(tab: Tab): void {
    this.active = tab;
    this.notice = null;
    this.errors = {};
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("active")) {
      requestAnimationFrame(() => {
        const selected = this.renderRoot.querySelector(
          '.tab[aria-selected="true"]'
        ) as HTMLElement | null;
        if (selected && typeof selected.scrollIntoView === "function") {
          selected.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
        }
      });
    }
    // Vibes confirm chrome: Cancel is the safe default focus target.
    const confirmOpened =
      (changed.has("confirmDelete") && this.confirmDelete) ||
      (changed.has("confirmSignOutAll") && this.confirmSignOutAll) ||
      (changed.has("confirmDisconnectId") && this.confirmDisconnectId !== null) ||
      (changed.has("confirmRegenerate") && this.confirmRegenerate) ||
      (changed.has("confirmRemoveAuthenticator") && this.confirmRemoveAuthenticator);
    if (confirmOpened) {
      requestAnimationFrame(() => {
        const cancel = this.renderRoot.querySelector(
          ".card-footer [autofocus], .row-actions [autofocus], .inline [autofocus], .card-footer .btn-outline, .row-actions .btn-outline, .inline .btn-outline"
        ) as HTMLButtonElement | null;
        cancel?.focus({ preventScroll: true });
      });
    }
  }

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  private setNotice(tone: "success" | "error" | "info", message: string): void {
    this.notice = { tone, message };
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.notice = null;
      this.noticeTimer = null;
    }, 8000);
  }

  private requireValid(e: Event): boolean {
    const form = e.target as HTMLFormElement | null;
    if (form && typeof form.reportValidity === "function" && !form.reportValidity()) return false;
    return true;
  }

  private async run(key: string, action: () => Promise<void>, success?: string): Promise<void> {
    if (this.busy) return;
    this.busy = key;
    this.errors = { ...this.errors, [key]: "" };
    this.notice = null;
    try {
      await action();
      if (success) this.setNotice("success", success);
    } catch (err) {
      if (isErrorType(err, ErrorTypes.challengeRequired)) {
        this.stepUp = { retry: () => this.run(key, action, success) };
      } else {
        this.errors = {
          ...this.errors,
          [key]: describeError(
            err,
            this.strings,
            key.includes("code") ? "code" : key === "password" ? "password" : "link"
          ),
        };
      }
    } finally {
      this.busy = "";
    }
  }

  // ─────────────────────────── loaders ───────────────────────────

  private async loadSessions(): Promise<void> {
    await this.run("sessions", async () => {
      this.sessions = await authStore.listSessions();
    });
  }

  private async loadIdentities(): Promise<void> {
    await this.run("identities", async () => {
      this.identities = await authStore.listIdentities();
    });
  }

  /** Probe once so Activity is never shown on servers without /account/logs. */
  private async probeLogsSupport(): Promise<void> {
    if (this.logsProbeStarted) return;
    this.logsProbeStarted = true;
    try {
      this.logs = await authStore.listLogs();
      this.logsSupported = true;
    } catch {
      this.logsSupported = false;
      this.logs = [];
      if (this.active === "activity") this.active = "profile";
    }
  }

  private async loadLogs(): Promise<void> {
    if (this.logsSupported === false) {
      if (this.active === "activity") this.active = "profile";
      return;
    }
    this.busy = "logs";
    try {
      this.logs = await authStore.listLogs();
    } catch {
      // Route missing (Cloud 2.2.0 / some self-hosted): hide the tab and leave Activity.
      this.logsSupported = false;
      this.logs = [];
      if (this.active === "activity") this.active = "profile";
    } finally {
      this.busy = "";
    }
  }

  private factorsLoading = false;

  private async loadFactors(): Promise<void> {
    if (this.factorsLoading) return;
    this.factorsLoading = true;
    try {
      this.factors = await authStore.listMfaFactors();
    } catch {
      this.factors = {
        totp: false,
        phone: false,
        email: false,
        recoveryCode: false,
        custom: false,
      } as Models.MfaFactors;
    } finally {
      this.factorsLoading = false;
    }
  }

  // ─────────────────────────── actions ───────────────────────────

  private onUpdateName = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run("name", () => authStore.updateName(this.nameInput), this.t("nameUpdated"));
  };

  private onUpdateEmail = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(
      "email",
      async () => {
        await authStore.updateEmail(this.emailInput, this.emailPassword);
        this.emailPassword = "";
      },
      this.t("emailUpdated")
    );
  };

  private onUpdatePhone = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(
      "phone",
      async () => {
        await authStore.updatePhone(this.phoneInput, this.phonePassword);
        this.phonePassword = "";
      },
      this.t("phoneUpdated")
    );
  };

  private onConvertGuest = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(
      "guest",
      async () => {
        await authStore.convertGuest(this.emailInput, this.emailPassword, this.guestName);
        this.emailPassword = "";
      },
      this.t("accountConverted")
    );
  };

  private onSendVerification = () => {
    if (Date.now() < this.verifyEmailCooldownUntil) return;
    void this.run(
      "verify",
      async () => {
        await authStore.sendEmailVerification();
        this.startVerifyEmailCooldown();
      },
      this.t("verificationSent")
    );
  };

  private startVerifyEmailCooldown(): void {
    this.verifyEmailCooldownUntil = Date.now() + 45000;
    this.clearVerifyEmailCooldownTimer();
    this.verifyEmailCooldownTimer = setInterval(() => {
      this.requestUpdate();
      if (Date.now() >= this.verifyEmailCooldownUntil) this.clearVerifyEmailCooldownTimer();
    }, 1000);
  }

  private clearVerifyEmailCooldownTimer(): void {
    if (this.verifyEmailCooldownTimer) {
      clearInterval(this.verifyEmailCooldownTimer);
      this.verifyEmailCooldownTimer = null;
    }
  }

  private onSendPhoneVerification = () => {
    if (Date.now() < this.verifyPhoneCooldownUntil) return;
    void this.run("verify-phone", async () => {
      await authStore.sendPhoneVerification();
      this.phoneCodeSent = true;
      this.startVerifyPhoneCooldown();
    });
  };

  private startVerifyPhoneCooldown(): void {
    this.verifyPhoneCooldownUntil = Date.now() + 45000;
    this.clearVerifyPhoneCooldownTimer();
    this.verifyPhoneCooldownTimer = setInterval(() => {
      this.requestUpdate();
      if (Date.now() >= this.verifyPhoneCooldownUntil) this.clearVerifyPhoneCooldownTimer();
    }, 1000);
  }

  private clearVerifyPhoneCooldownTimer(): void {
    if (this.verifyPhoneCooldownTimer) {
      clearInterval(this.verifyPhoneCooldownTimer);
      this.verifyPhoneCooldownTimer = null;
    }
  }

  private onConfirmPhoneVerification = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(
      "verify-phone-code",
      async () => {
        await authStore.confirmPhoneVerification(this.phoneCode);
        this.phoneCode = "";
        this.phoneCodeSent = false;
        this.verifyPhoneCooldownUntil = 0;
        this.clearVerifyPhoneCooldownTimer();
      },
      this.t("phoneVerified")
    );
  };

  private onChangePassword = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    if (this.newPassword !== this.newPasswordConfirm) {
      this.errors = { ...this.errors, password: this.t("errorPasswordMismatch") };
      return;
    }
    void this.run(
      "password",
      async () => {
        await authStore.updatePassword(this.newPassword, this.oldPassword);
        this.oldPassword = this.newPassword = this.newPasswordConfirm = "";
      },
      this.t("passwordChanged")
    );
  };

  private onToggleMfa = () => {
    const next = !this.user?.mfa;
    void this.run("mfa", async () => {
      await authStore.setMfaEnabled(next);
      await this.loadFactors();
    });
  };

  private onAddAuthenticator = () => {
    void this.run("authenticator", async () => {
      this.authenticator = await authStore.addAuthenticator();
      this.authenticatorCode = "";
    });
  };

  private onVerifyAuthenticator = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    void this.run(
      "authenticator-code",
      async () => {
        await authStore.verifyAuthenticator(this.authenticatorCode);
        this.authenticator = null;
        this.authenticatorCode = "";
        await this.loadFactors();
      },
      this.t("authenticatorAdded")
    );
  };

  private onRemoveAuthenticator = () => {
    if (!this.confirmRemoveAuthenticator) {
      this.confirmRemoveAuthenticator = true;
      return;
    }
    this.confirmRemoveAuthenticator = false;
    void this.run("remove-authenticator", async () => {
      await authStore.removeAuthenticator();
      await this.loadFactors();
    });
  };

  private onRecoveryCodes = () => {
    void this.run("recovery", async () => {
      try {
        this.recoveryCodes = await authStore.createRecoveryCodes();
      } catch (err) {
        if (!isErrorType(err, ErrorTypes.recoveryCodesExist)) throw err;
        this.recoveryCodes = await authStore.getRecoveryCodes();
      }
      this.recoveryCodesSaved = false;
      await this.loadFactors();
    });
  };

  private onRegenerateRecoveryCodes = () => {
    if (!this.confirmRegenerate) {
      this.confirmRegenerate = true;
      return;
    }
    this.confirmRegenerate = false;
    void this.run("recovery", async () => {
      this.recoveryCodes = await authStore.regenerateRecoveryCodes();
      this.recoveryCodesSaved = false;
    });
  };

  private onCopyCodes = async () => {
    if (!this.recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(this.recoveryCodes.join("\n"));
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      this.setNotice("error", this.t("copyFailed"));
    }
  };

  private onDownloadCodes = () => {
    if (!this.recoveryCodes) return;
    const blob = new Blob([this.recoveryCodes.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "authui-recovery-codes.txt";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  private onPrintCodes = () => {
    if (!this.recoveryCodes) return;
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const list = this.recoveryCodes.map((c) => `<li><code>${escape(c)}</code></li>`).join("");
    const title = escape(this.t("recoveryCodes"));
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      this.setNotice("error", this.t("copyFailed"));
      return;
    }
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
        `<style>body{font-family:system-ui,sans-serif;padding:24px}ul{columns:2;gap:24px}` +
        `li{margin:0 0 8px;font-size:16px}</style></head><body>` +
        `<h1>${title}</h1><ul>${list}</ul></body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  private onDismissRecoveryCodes = () => {
    if (!this.recoveryCodesSaved) return;
    this.recoveryCodes = null;
    this.recoveryCodesSaved = false;
  };

  private onCancelPhoneVerification = () => {
    this.phoneCodeSent = false;
    this.phoneCode = "";
    this.verifyPhoneCooldownUntil = 0;
    this.clearVerifyPhoneCooldownTimer();
    this.errors = { ...this.errors, "verify-phone": "", "verify-phone-code": "" };
  };

  private onCopySecret = async () => {
    const secret = this.authenticator?.secret;
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      this.setNotice("error", this.t("copyFailed"));
    }
  };

  private onStepUpFactor = (factor: MfaFactor) => {
    void this.run("stepup", async () => {
      const c = await authStore.createMfaChallenge(factor);
      this.stepUp = { ...this.stepUp!, challenge: { id: c.$id, factor } };
      this.stepUpCode = "";
    });
  };

  private onStepUpVerify = (e: Event) => {
    e.preventDefault();
    if (!this.requireValid(e)) return;
    const s = this.stepUp;
    if (!s?.challenge) return;
    // Retry the protected action only after run() clears this.busy. Awaiting
    // s.retry() inside the stepup-code action was a no-op (run returns early when busy).
    void (async () => {
      let verified = false;
      await this.run("stepup-code", async () => {
        await authStore.completeMfaChallenge(s.challenge!.id, this.stepUpCode, { signIn: false });
        this.stepUp = null;
        this.stepUpCode = "";
        verified = true;
      });
      if (verified) await s.retry();
    })();
  };

  private onDeleteSession = (id: string) => {
    void this.run(`session-${id}`, async () => {
      const isCurrent = (this.sessions ?? []).some((s) => s.$id === id && s.current);
      if (isCurrent) {
        await authStore.signOut();
        this.sessions = [];
        return;
      }
      await authStore.signOut(id);
      this.sessions = (this.sessions ?? []).filter((s) => s.$id !== id);
    });
  };

  private onSignOutAll = () => {
    if (!this.confirmSignOutAll) {
      this.confirmSignOutAll = true;
      return;
    }
    this.confirmSignOutAll = false;
    void this.run("sessions-all", () => authStore.signOutEverywhere());
  };

  private onDeleteIdentity = (id: string) => {
    if (this.confirmDisconnectId !== id) {
      this.confirmDisconnectId = id;
      return;
    }
    this.confirmDisconnectId = null;
    void this.run(`identity-${id}`, async () => {
      await authStore.deleteIdentity(id);
      this.identities = (this.identities ?? []).filter((i) => i.$id !== id);
    });
  };

  private onDeleteAccount = () => {
    void this.run("delete", () => authStore.deleteAccount());
  };

  private bind(field: string) {
    return (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      (this as any)[field] = value;
    };
  }

  private onPhoneCountryChange = (e: Event) => {
    this.phoneCountryIso = (e.target as HTMLSelectElement).value;
    this.syncPhoneE164();
  };

  private onPhoneNationalInput = (e: Event) => {
    this.phoneNational = (e.target as HTMLInputElement).value;
    this.syncPhoneE164();
  };

  private syncPhoneE164(): void {
    this.phoneInput = toE164(this.phoneCountryIso, this.phoneNational);
  }

  // ─────────────────────────── render ───────────────────────────

  protected render() {
    if (!this.auth.configured) {
      return html`<div class="alert alert-error" role="alert">
        ${icons.alert}
        <div class="alert-body">${this.t("errorNotConfigured")}</div>
      </div>`;
    }
    if (this.auth.status === "loading")
      return html`<div class="panel ${this.embedded ? "embedded" : ""}" part="panel">
        <div class="empty"><span class="spinner"></span></div>
      </div>`;
    if (!this.user) {
      return html`<div class="panel ${this.embedded ? "embedded" : ""}">
        <authui-sign-in embedded></authui-sign-in>
      </div>`;
    }

    const tabs: { id: Tab; label: string }[] = [
      { id: "profile", label: this.t("profile") },
      { id: "security", label: this.t("security") },
      { id: "sessions", label: this.t("sessions") },
      { id: "connections", label: this.t("connections") },
      ...(this.logsSupported ? [{ id: "activity" as Tab, label: this.t("activity") }] : []),
    ];

    return html`
      <div class="panel ${this.embedded ? "embedded" : ""}" part="panel">
        ${this.renderIdentity()}
        <div class="tabs" role="tablist" @keydown=${this.onTabsKeydown}>
          ${tabs.map(
            (t) =>
              html`<button
                class="tab"
                role="tab"
                id=${`authui-tab-${t.id}`}
                aria-controls=${`authui-panel-${t.id}`}
                aria-selected=${this.active === t.id ? "true" : "false"}
                tabindex=${this.active === t.id ? "0" : "-1"}
                @click=${() => this.select(t.id)}
              >
                ${t.label}
              </button>`
          )}
        </div>
        ${
          this.notice
            ? html`<div class="alert alert-${this.notice.tone}" role="status">
                ${this.notice.tone === "success" ? icons.checkCircle : icons.info}
                <div class="alert-body">${this.notice.message}</div>
                <button
                  class="btn btn-ghost btn-icon dismiss"
                  @click=${() => {
                    this.notice = null;
                    if (this.noticeTimer) {
                      clearTimeout(this.noticeTimer);
                      this.noticeTimer = null;
                    }
                  }}
                  aria-label=${this.t("close")}
                >
                  ${icons.x}
                </button>
              </div>`
            : nothing
        }
        ${
          this.stepUp
            ? this.renderStepUp()
            : html`<div
                class="tabpanel"
                role="tabpanel"
                id=${`authui-panel-${this.active}`}
                aria-labelledby=${`authui-tab-${this.active}`}
              >
                ${this.renderTab()}
              </div>`
        }
      </div>
    `;
  }

  private renderIdentity(): TemplateResult {
    const u = this.user!;
    const label = u.name || u.email || u.phone || this.t("guestAccount");
    return html`
      <div class="between">
        <div class="identity">
          <span class="avatar">${avatarInitial(label)}</span>
          <div class="row-main">
            <span class="row-title" title=${label}>
              ${label}
              ${u.mfa ? html`<span class="badge badge-success">${icons.shieldCheck} ${this.t("mfaBadge")}</span>` : nothing}
              ${authStore.isPreview ? html`<span class="badge badge-info">${this.t("preview")}</span>` : nothing}
            </span>
            ${
              u.email && u.name
                ? html`<span class="row-sub" title=${u.email}>${u.email}</span>`
                : nothing
            }
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click=${() => authStore.signOut()}>
          ${icons.logOut} ${this.t("signOut")}
        </button>
      </div>
    `;
  }

  private renderTab(): TemplateResult {
    switch (this.active) {
      case "security":
        return this.renderSecurity();
      case "sessions":
        return this.renderSessions();
      case "connections":
        return this.renderConnections();
      case "activity":
        return this.renderActivity();
      default:
        return this.renderProfile();
    }
  }

  private error(key: string): TemplateResult | typeof nothing {
    const msg = this.errors[key];
    return msg
      ? html`<div class="alert alert-error" role="alert">
          ${icons.alert}
          <div class="alert-body">${msg}</div>
        </div>`
      : nothing;
  }

  private spinner(key: string): TemplateResult | typeof nothing {
    return this.busy === key ? html`<span class="spinner" aria-hidden="true"></span>` : nothing;
  }

  private card(
    title: string,
    description: string | undefined,
    body: TemplateResult | typeof nothing,
    footer?: TemplateResult,
    danger = false
  ): TemplateResult {
    return html`<section class="card ${danger ? "card-danger" : ""}">
      <div class="card-header">
        <h3 class="card-title">${title}</h3>
        ${description ? html`<p class="card-description">${description}</p>` : nothing}
      </div>
      ${body !== nothing ? html`<div class="card-body">${body}</div>` : nothing}
      ${footer ? html`<div class="card-footer">${footer}</div>` : nothing}
    </section>`;
  }

  /** Vibes-style confirm footer: Cancel first (autofocus), destructive only on confirm. */
  private confirmFooter(
    onCancel: () => void,
    onConfirm: () => void,
    confirmLabel: string,
    busyKey?: string
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="btn btn-outline btn-sm"
        autofocus
        ?disabled=${!!this.busy}
        @click=${onCancel}
      >
        ${this.t("cancel")}
      </button>
      <button
        type="button"
        class="btn btn-destructive btn-sm"
        ?disabled=${!!this.busy}
        @click=${onConfirm}
      >
        ${busyKey ? this.spinner(busyKey) : nothing} ${confirmLabel}
      </button>
    `;
  }

  private emptyState(icon: TemplateResult, title: string, description: string): TemplateResult {
    return html`<div class="empty empty-well">
      <div class="empty-icon" aria-hidden="true">${icon}</div>
      <p class="empty-title">${title}</p>
      <p class="empty-desc">${description}</p>
    </div>`;
  }

  private verifiedBadge(ok: boolean): TemplateResult {
    return ok
      ? html`<span class="badge badge-success">${icons.check} ${this.t("verified")}</span>`
      : html`<span class="badge badge-warning">${this.t("unverified")}</span>`;
  }

  // ── Profile ──

  private renderProfile(): TemplateResult {
    const u = this.user!;
    if (this.isGuest) {
      return html`<div class="section">
        ${this.card(
          this.t("guestAccount"),
          this.t("guestAccountDescription"),
          html`<form class="form" id="guest-form" @submit=${this.onConvertGuest} novalidate>
            <div class="field">
              <label class="label" for="guest-name">${this.t("name")}</label>
              <input
                class="input"
                id="guest-name"
                .value=${this.guestName}
                @input=${this.bind("guestName")}
                autocomplete="name"
              />
            </div>
            <div class="field">
              <label class="label" for="guest-email">${this.t("email")}</label>
              <input
                class="input"
                id="guest-email"
                type="email"
                required
                .value=${this.emailInput}
                @input=${this.bind("emailInput")}
                autocomplete="email"
              />
            </div>
            <div class="field">
              <label class="label" for="guest-password">${this.t("password")}</label>
              <input
                class="input"
                id="guest-password"
                type="password"
                required
                minlength="8"
                .value=${this.emailPassword}
                @input=${this.bind("emailPassword")}
                autocomplete="new-password"
              />
              ${
                this.emailPassword
                  ? (() => {
                      const strength = scorePassword(this.emailPassword);
                      return html`<div class="strength" aria-live="polite">
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
                      </div>`;
                    })()
                  : html`<p class="hint">${this.t("passwordHint")}</p>`
              }
            </div>
            ${this.error("guest")}
          </form>`,
          html`<button
            class="btn btn-primary btn-sm"
            type="submit"
            form="guest-form"
            ?disabled=${!!this.busy}
          >
            ${this.spinner("guest")} ${this.t("createAccount")}
          </button>`
        )}
      </div>`;
    }
    return html`<div class="section">
      ${this.card(
        this.t("name"),
        undefined,
        html`<form class="form" id="name-form" @submit=${this.onUpdateName} novalidate>
          <div class="field">
            <label class="label" for="acc-name">${this.t("name")}</label>
            <input
              class="input"
              id="acc-name"
              .value=${this.nameInput}
              @input=${this.bind("nameInput")}
              autocomplete="name"
              required
            />
          </div>
          ${this.error("name")}
        </form>`,
        html`<button
          class="btn btn-primary btn-sm"
          type="submit"
          form="name-form"
          ?disabled=${!!this.busy || !this.nameInput.trim() || this.nameInput === u.name}
        >
          ${this.spinner("name")} ${this.t("update")}
        </button>`
      )}
      ${this.card(
        this.t("email"),
        undefined,
        html`<form class="form" id="email-form" @submit=${this.onUpdateEmail} novalidate>
          <div class="field">
            <label class="label" for="acc-email"
              >${this.t("email")}
              ${u.email ? this.verifiedBadge(u.emailVerification) : nothing}</label
            >
            <input
              class="input"
              id="acc-email"
              type="email"
              .value=${this.emailInput}
              @input=${this.bind("emailInput")}
              autocomplete="email"
              required
            />
          </div>
          ${
            this.emailInput !== u.email
              ? html`<div class="field">
                  <label class="label" for="acc-email-password"
                    >${u.passwordUpdate ? this.t("currentPassword") : this.t("createPassword")}</label
                  >
                  <div class="input-wrap">
                    <input
                      class="input"
                      id="acc-email-password"
                      type=${this.showEmailPassword ? "text" : "password"}
                      .value=${this.emailPassword}
                      @input=${this.bind("emailPassword")}
                      autocomplete=${u.passwordUpdate ? "current-password" : "new-password"}
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      @click=${() => (this.showEmailPassword = !this.showEmailPassword)}
                      aria-label=${
                        this.showEmailPassword ? this.t("hidePassword") : this.t("showPassword")
                      }
                    >
                      ${this.showEmailPassword ? icons.eyeOff : icons.eye}
                    </button>
                  </div>
                  ${
                    u.passwordUpdate
                      ? nothing
                      : html`<p class="hint">${this.t("createPasswordHint")}</p>`
                  }
                </div>`
              : nothing
          }
          ${this.error("email")} ${this.error("verify")}
        </form>`,
        html`
          ${
            u.email && !u.emailVerification
              ? html`<button
                  class="btn btn-outline btn-sm"
                  type="button"
                  @click=${this.onSendVerification}
                  ?disabled=${!!this.busy || Date.now() < this.verifyEmailCooldownUntil}
                >
                  ${this.spinner("verify")}
                  ${
                    Date.now() < this.verifyEmailCooldownUntil
                      ? this.t("verificationResendIn", {
                          seconds: Math.max(
                            1,
                            Math.ceil((this.verifyEmailCooldownUntil - Date.now()) / 1000)
                          ),
                        })
                      : this.t("verifyEmail")
                  }
                </button>`
              : nothing
          }
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            form="email-form"
            ?disabled=${!!this.busy || !this.emailInput.trim() || this.emailInput === u.email}
          >
            ${this.spinner("email")} ${this.t("update")}
          </button>
        `
      )}
      ${this.card(
        this.t("phone"),
        undefined,
        html`<form class="form" id="phone-form" @submit=${this.onUpdatePhone} novalidate>
          <div class="field">
            <label class="label" for="acc-phone"
              >${this.t("phone")}
              ${u.phone ? this.verifiedBadge(u.phoneVerification) : nothing}</label
            >
            <div class="phone-row">
              <label class="sr-only" for="acc-phone-country">${this.t("phoneCountry")}</label>
              <select
                class="input phone-country"
                id="acc-phone-country"
                aria-label=${this.t("phoneCountry")}
                .value=${this.phoneCountryIso}
                @change=${this.onPhoneCountryChange}
              >
                ${PHONE_COUNTRIES.map(
                  (c) =>
                    html`<option value=${c.iso} ?selected=${c.iso === this.phoneCountryIso}>
                      ${flagEmoji(c.iso)} ${c.dial} ${c.name}
                    </option>`
                )}
              </select>
              <input
                class="input phone-national"
                id="acc-phone"
                type="tel"
                placeholder=${this.t("phoneNationalPlaceholder")}
                .value=${this.phoneNational}
                @input=${this.onPhoneNationalInput}
                autocomplete="tel-national"
                inputmode="tel"
              />
            </div>
          </div>
          ${
            this.phoneInput !== u.phone
              ? html`<div class="field">
                  <label class="label" for="acc-phone-password"
                    >${u.passwordUpdate ? this.t("currentPassword") : this.t("createPassword")}</label
                  >
                  <div class="input-wrap">
                    <input
                      class="input"
                      id="acc-phone-password"
                      type=${this.showPhonePassword ? "text" : "password"}
                      .value=${this.phonePassword}
                      @input=${this.bind("phonePassword")}
                      autocomplete=${u.passwordUpdate ? "current-password" : "new-password"}
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      @click=${() => (this.showPhonePassword = !this.showPhonePassword)}
                      aria-label=${
                        this.showPhonePassword ? this.t("hidePassword") : this.t("showPassword")
                      }
                    >
                      ${this.showPhonePassword ? icons.eyeOff : icons.eye}
                    </button>
                  </div>
                  ${
                    u.passwordUpdate
                      ? nothing
                      : html`<p class="hint">${this.t("createPasswordHint")}</p>`
                  }
                </div>`
              : nothing
          }
          ${
            this.phoneCodeSent
              ? html`<div class="field">
                  <label class="label" for="acc-phone-code">${this.t("code")}</label>

                  ${otpInput({
                    id: "acc-phone-code",

                    value: this.phoneCode,

                    disabled: !!this.busy,

                    onChange: (v) => {
                      this.phoneCode = v;
                    },
                  })}
                </div>`
              : nothing
          }
          ${this.error("phone")} ${this.error("verify-phone")} ${this.error("verify-phone-code")}
        </form>`,
        html`
          ${
            u.phone && !u.phoneVerification && !this.phoneCodeSent
              ? html`<button
                  class="btn btn-outline btn-sm"
                  type="button"
                  @click=${this.onSendPhoneVerification}
                  ?disabled=${!!this.busy}
                >
                  ${this.spinner("verify-phone")} ${this.t("sendCode")}
                </button>`
              : nothing
          }
          ${
            this.phoneCodeSent
              ? html`<button
                    class="btn btn-outline btn-sm"
                    type="button"
                    @click=${this.onSendPhoneVerification}
                    ?disabled=${!!this.busy || Date.now() < this.verifyPhoneCooldownUntil}
                  >
                    ${this.spinner("verify-phone")}
                    ${
                      Date.now() < this.verifyPhoneCooldownUntil
                        ? this.t("verificationResendIn", {
                            seconds: Math.max(
                              1,
                              Math.ceil((this.verifyPhoneCooldownUntil - Date.now()) / 1000)
                            ),
                          })
                        : this.t("resendCode")
                    }
                  </button>
                  <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    @click=${this.onConfirmPhoneVerification}
                    ?disabled=${!!this.busy}
                  >
                    ${this.spinner("verify-phone-code")} ${this.t("verifyCode")}
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    @click=${this.onCancelPhoneVerification}
                    ?disabled=${!!this.busy}
                  >
                    ${this.t("useDifferentPhone")}
                  </button>`
              : nothing
          }
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            form="phone-form"
            ?disabled=${!!this.busy || !this.phoneInput.trim() || this.phoneInput === u.phone}
          >
            ${this.spinner("phone")} ${this.t("update")}
          </button>
        `
      )}
      ${this.renderDanger()}
    </div>`;
  }

  private renderDanger(): TemplateResult {
    return this.card(
      this.t("deleteAccount"),
      this.t("deleteAccountDescription"),
      this.confirmDelete
        ? this.error("delete")
        : html`${this.error("delete")}
            <button class="btn btn-outline btn-sm warn" @click=${() => (this.confirmDelete = true)}>
              ${icons.userX} ${this.t("deleteAccount")}
            </button>`,
      this.confirmDelete
        ? this.confirmFooter(
            () => {
              this.confirmDelete = false;
            },
            () => void this.onDeleteAccount(),
            this.t("deleteAccountConfirm"),
            "delete"
          )
        : undefined,
      true
    );
  }

  // ── Security ──

  private renderSecurity(): TemplateResult {
    const u = this.user!;
    const mfaAllowed = this.config?.mfa !== false;
    return html`<div class="section">
      ${
        !this.isGuest
          ? this.card(
              this.t("changePassword"),
              undefined,
              html`<form
                class="form"
                id="password-form"
                @submit=${this.onChangePassword}
                novalidate
              >
                ${
                  u.passwordUpdate
                    ? html`<div class="field">
                        <label class="label" for="acc-old-password"
                          >${this.t("currentPassword")}</label
                        >
                        <div class="input-wrap">
                          <input
                            class="input"
                            id="acc-old-password"
                            type=${this.showOldPassword ? "text" : "password"}
                            .value=${this.oldPassword}
                            @input=${this.bind("oldPassword")}
                            autocomplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            class="btn btn-ghost btn-icon"
                            @click=${() => (this.showOldPassword = !this.showOldPassword)}
                            aria-label=${
                              this.showOldPassword ? this.t("hidePassword") : this.t("showPassword")
                            }
                          >
                            ${this.showOldPassword ? icons.eyeOff : icons.eye}
                          </button>
                        </div>
                      </div>`
                    : nothing
                }
                <div class="field">
                  <label class="label" for="acc-new-password">${this.t("newPassword")}</label>
                  <div class="input-wrap">
                    <input
                      class="input"
                      id="acc-new-password"
                      type=${this.showNewPassword ? "text" : "password"}
                      required
                      minlength="8"
                      .value=${this.newPassword}
                      @input=${this.bind("newPassword")}
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      @click=${() => (this.showNewPassword = !this.showNewPassword)}
                      aria-label=${
                        this.showNewPassword ? this.t("hidePassword") : this.t("showPassword")
                      }
                    >
                      ${this.showNewPassword ? icons.eyeOff : icons.eye}
                    </button>
                  </div>
                  ${
                    this.newPassword
                      ? (() => {
                          const strength = scorePassword(this.newPassword);
                          return html`<div class="strength" aria-live="polite">
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
                          </div>`;
                        })()
                      : html`<p class="hint">${this.t("passwordHint")}</p>`
                  }
                </div>
                <div class="field">
                  <label class="label" for="acc-new-password-confirm"
                    >${this.t("confirmPassword")}</label
                  >
                  <div class="input-wrap">
                    <input
                      class="input"
                      id="acc-new-password-confirm"
                      type=${this.showNewPasswordConfirm ? "text" : "password"}
                      required
                      minlength="8"
                      .value=${this.newPasswordConfirm}
                      @input=${this.bind("newPasswordConfirm")}
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      @click=${() => (this.showNewPasswordConfirm = !this.showNewPasswordConfirm)}
                      aria-label=${
                        this.showNewPasswordConfirm
                          ? this.t("hidePassword")
                          : this.t("showPassword")
                      }
                    >
                      ${this.showNewPasswordConfirm ? icons.eyeOff : icons.eye}
                    </button>
                  </div>
                </div>
                ${this.error("password")}
              </form>`,
              html`<button
                class="btn btn-primary btn-sm"
                type="submit"
                form="password-form"
                ?disabled=${!!this.busy || !this.newPassword}
              >
                ${this.spinner("password")} ${this.t("update")}
              </button>`
            )
          : nothing
      }
      ${mfaAllowed ? this.renderMfaCard() : nothing}
      ${mfaAllowed ? this.renderRecoveryCard() : nothing}
    </div>`;
  }

  private renderMfaCard(): TemplateResult {
    const u = this.user!;
    const hasTotp = this.factors?.totp ?? false;
    const qrUrl = !this.authenticator
      ? ""
      : authStore.isPreview
        ? previewQrDataUrl(this.authenticator.uri)
        : new Avatars(authStore.getClient()!).getQR(this.authenticator.uri, 400, 1).toString();
    return this.card(
      this.t("twoFactor"),
      this.t("twoFactorDescription"),
      html`<div class="kv">
        <div class="toggle-row">
          <div class="row-main">
            <span class="row-title">${this.t("twoFactor")}</span>
            <span class="row-sub">${u.mfa ? this.t("enabled") : this.t("disabled")}</span>
          </div>
          <button
            class="switch"
            role="switch"
            aria-checked=${u.mfa ? "true" : "false"}
            @click=${this.onToggleMfa}
            ?disabled=${!!this.busy}
            aria-label=${this.t("twoFactor")}
          ></button>
        </div>
        ${
          u.mfa && !(this.factors?.totp || u.emailVerification || u.phoneVerification)
            ? html`<div class="alert alert-warning" role="status">
                ${icons.alert}
                <div class="alert-body">
                  ${this.t("mfaNoFactorWarning")}
                  ${
                    !this.factors?.totp
                      ? html`<div class="links">
                          <button
                            type="button"
                            class="btn btn-link"
                            @click=${this.onAddAuthenticator}
                            ?disabled=${!!this.busy || !!this.authenticator}
                          >
                            ${this.t("authenticatorAdd")}
                          </button>
                        </div>`
                      : nothing
                  }
                </div>
              </div>`
            : nothing
        }
        ${this.error("mfa")}
        <div class="separator"></div>
        <div class="toggle-row">
          <div class="row-main">
            <span class="row-title"
              >${icons.smartphone} ${this.t("authenticatorApp")}
              ${hasTotp ? this.verifiedBadge(true) : nothing}</span
            >
          </div>
          ${
            hasTotp
              ? this.confirmRemoveAuthenticator
                ? html`<div class="inline">
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      autofocus
                      ?disabled=${!!this.busy}
                      @click=${() => (this.confirmRemoveAuthenticator = false)}
                    >
                      ${this.t("cancel")}
                    </button>
                    <button
                      type="button"
                      class="btn btn-destructive btn-sm"
                      @click=${this.onRemoveAuthenticator}
                      ?disabled=${!!this.busy}
                    >
                      ${this.spinner("remove-authenticator")} ${this.t("remove")}
                    </button>
                  </div>`
                : html`<button
                    class="btn btn-outline btn-sm"
                    @click=${this.onRemoveAuthenticator}
                    ?disabled=${!!this.busy}
                  >
                    ${this.spinner("remove-authenticator")} ${this.t("remove")}
                  </button>`
              : this.authenticator
                ? nothing
                : html`<button
                    class="btn btn-outline btn-sm"
                    @click=${this.onAddAuthenticator}
                    ?disabled=${!!this.busy}
                  >
                    ${this.spinner("authenticator")} ${this.t("authenticatorAdd")}
                  </button>`
          }
        </div>
        ${this.error("authenticator")} ${this.error("remove-authenticator")}
        ${
          this.authenticator
            ? html`<form class="form" @submit=${this.onVerifyAuthenticator} novalidate>
                <p class="hint">${this.t("authenticatorScan")}</p>
                <img class="qr" src=${qrUrl} alt=${this.t("qrCodeAlt")} />
                <p class="hint center">${this.t("authenticatorManual")}</p>
                <div class="inline">
                  <span class="code"
                    >${this.authenticator.secret.match(/.{1,4}/g)?.join(" ") ?? this.authenticator.secret}</span
                  >
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    @click=${() => void this.onCopySecret()}
                  >
                    ${this.copied ? icons.check : icons.copy}
                    ${this.copied ? this.t("copied") : this.t("authenticatorCopyKey")}
                  </button>
                </div>
                <div class="field">
                  <label class="label" for="acc-totp">${this.t("code")}</label>

                  ${otpInput({
                    id: "acc-totp",

                    value: this.authenticatorCode,

                    disabled: !!this.busy,

                    onChange: (v) => {
                      this.authenticatorCode = v;
                    },
                  })}
                </div>
                ${this.error("authenticator-code")}
                <div class="inline">
                  <button class="btn btn-primary btn-sm" type="submit" ?disabled=${!!this.busy}>
                    ${this.spinner("authenticator-code")} ${this.t("authenticatorVerify")}
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    @click=${() => (this.authenticator = null)}
                  >
                    ${this.t("cancel")}
                  </button>
                </div>
              </form>`
            : nothing
        }
      </div>`
    );
  }

  private renderRecoveryCard(): TemplateResult {
    const has = this.factors?.recoveryCode ?? false;
    return this.card(
      this.t("recoveryCodes"),
      this.t("recoveryCodesDescription") + " " + this.t("recoveryCodesOnceHint"),
      html`<div class="kv">
        ${
          this.recoveryCodes
            ? html`<div class="alert alert-warning">
                  ${icons.alert}
                  <div class="alert-body">${this.t("recoveryCodesWarning")}</div>
                </div>
                <div class="codes">
                  ${this.recoveryCodes.map((c) => html`<span class="code">${c}</span>`)}
                </div>
                <div class="inline">
                  <button class="btn btn-outline btn-sm" type="button" @click=${this.onCopyCodes}>
                    ${this.copied ? icons.check : icons.copy}
                    ${this.copied ? this.t("copied") : this.t("copy")}
                  </button>
                  <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    @click=${this.onDownloadCodes}
                  >
                    ${icons.download} ${this.t("download")}
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" @click=${this.onPrintCodes}>
                    ${icons.printer} ${this.t("print")}
                  </button>
                </div>
                <label class="legal-accept">
                  <input
                    type="checkbox"
                    .checked=${this.recoveryCodesSaved}
                    @change=${(e: Event) => {
                      this.recoveryCodesSaved = (e.target as HTMLInputElement).checked;
                    }}
                  />
                  <span>${this.t("recoveryCodesSavedConfirm")}</span>
                </label>
                <div class="inline">
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    ?disabled=${!this.recoveryCodesSaved}
                    @click=${this.onDismissRecoveryCodes}
                  >
                    ${this.t("done")}
                  </button>
                </div>`
            : html`<div class="inline">
                <button
                  class="btn btn-outline btn-sm"
                  @click=${this.onRecoveryCodes}
                  ?disabled=${!!this.busy}
                >
                  ${this.spinner("recovery")} ${icons.key}
                  ${has ? this.t("viewRecoveryCodes") : this.t("generateRecoveryCodes")}
                </button>
                ${
                  has
                    ? this.confirmRegenerate
                      ? html`<div class="inline">
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            autofocus
                            ?disabled=${!!this.busy}
                            @click=${() => (this.confirmRegenerate = false)}
                          >
                            ${this.t("cancel")}
                          </button>
                          <button
                            type="button"
                            class="btn btn-destructive btn-sm"
                            @click=${this.onRegenerateRecoveryCodes}
                            ?disabled=${!!this.busy}
                          >
                            ${this.spinner("recovery")} ${icons.refresh}
                            ${this.t("regenerateRecoveryCodes")}
                          </button>
                        </div>`
                      : html`<button
                          class="btn btn-ghost btn-sm"
                          @click=${this.onRegenerateRecoveryCodes}
                          ?disabled=${!!this.busy}
                        >
                          ${icons.refresh} ${this.t("regenerateRecoveryCodes")}
                        </button>`
                    : nothing
                }
              </div>`
        }
        ${this.error("recovery")}
      </div>`
    );
  }

  /** Inline MFA challenge shown when Appwrite demands a recent factor for a protected action. */
  private renderStepUp(): TemplateResult {
    const s = this.stepUp!;
    const f = this.factors;
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
        available: f?.totp ?? true,
      },
      {
        factor: "email",
        icon: icons.mail,
        label: this.t("mfaUseEmail"),
        available: f?.email ?? true,
      },
      {
        factor: "phone",
        icon: icons.phone,
        label: this.t("mfaUsePhone"),
        available: f?.phone ?? true,
      },
      {
        factor: "recoverycode",
        icon: icons.key,
        label: this.t("mfaUseRecoveryCode"),
        available: f?.recoveryCode ?? true,
      },
    ];
    return this.card(
      this.t("mfaTitle"),
      this.t("errorChallengeRequired"),
      html`<div class="kv">
        ${
          !s.challenge
            ? html`<div class="stack-sm">
                ${choices
                  .filter((c) => c.available)
                  .map(
                    (c) =>
                      html`<button
                        type="button"
                        class="choice"
                        @click=${() => this.onStepUpFactor(c.factor)}
                        ?disabled=${!!this.busy}
                      >
                        ${c.icon}<span class="choice-title">${c.label}</span>
                      </button>`
                  )}
              </div>`
            : html`<form class="form" @submit=${this.onStepUpVerify} novalidate>
                  <div class="field">
                    <label class="label" for="acc-stepup"
                      >${s.challenge.factor === "recoverycode" ? this.t("recoveryCode") : this.t("code")}</label
                    >
                    <p class="hint">${this.t(mfaFactorHintKey(s.challenge.factor))}</p>
                    ${
                      s.challenge.factor === "recoverycode"
                        ? html`<input
                            class="input mono"
                            id="acc-stepup"
                            inputmode="text"
                            maxlength="64"
                            autocomplete="one-time-code"
                            required
                            .value=${this.stepUpCode}
                            @input=${this.bind("stepUpCode")}
                          />`
                        : otpInput({
                            id: "acc-stepup",
                            value: this.stepUpCode,
                            disabled: !!this.busy,
                            onChange: (v) => {
                              this.stepUpCode = v;
                            },
                          })
                    }
                  </div>
                  <button class="btn btn-primary btn-sm" type="submit" ?disabled=${!!this.busy}>
                    ${this.spinner("stepup-code")} ${this.t("verifyCode")}
                  </button>
                </form>
                ${this.renderStepUpAlternates(s.challenge.factor)}`
        }
        ${this.error("stepup")} ${this.error("stepup-code")}
      </div>`,
      html`<button class="btn btn-ghost btn-sm" @click=${() => (this.stepUp = null)}>
        ${this.t("cancel")}
      </button>`
    );
  }

  private renderStepUpAlternates(current: MfaFactor): TemplateResult | typeof nothing {
    const factors = this.factors;
    if (!factors) return nothing;
    const alts = alternateMfaFactors(factors, current);
    if (alts.length === 0) return nothing;
    const labels: Record<MfaFactor, string> = {
      totp: this.t("mfaUseAuthenticator"),
      email: this.t("mfaUseEmail"),
      phone: this.t("mfaUsePhone"),
      recoverycode: this.t("mfaUseRecoveryCodeInstead"),
    };
    const iconsFor: Record<MfaFactor, TemplateResult> = {
      totp: icons.smartphone,
      email: icons.mail,
      phone: icons.phone,
      recoverycode: icons.key,
    };
    return html`
      <div class="separator-text">${this.t("or")}</div>
      <div class="mfa-alts">
        ${alts.map(
          (factor) =>
            html`<button
              type="button"
              class="btn btn-outline btn-sm"
              @click=${() => this.onStepUpFactor(factor)}
              ?disabled=${!!this.busy}
            >
              ${iconsFor[factor]}<span>${labels[factor]}</span>
            </button>`
        )}
      </div>
    `;
  }

  // ── Sessions ──

  /** Relative primary label with absolute detail for title tooltips (Vibes DateTooltip). */
  private formatRelativeLabel(
    iso: string | undefined
  ): { label: string; absolute: string; iso: string } | null {
    const parts = relativeTimeParts(iso);
    if (!parts) return null;
    if (parts.justNow) {
      return { label: this.t("relativeJustNow"), absolute: parts.absolute, iso: parts.iso };
    }
    const unitKey = (
      {
        minute: parts.count === 1 ? "relativeUnitMinute" : "relativeUnitMinutes",
        hour: parts.count === 1 ? "relativeUnitHour" : "relativeUnitHours",
        day: parts.count === 1 ? "relativeUnitDay" : "relativeUnitDays",
        week: parts.count === 1 ? "relativeUnitWeek" : "relativeUnitWeeks",
        month: parts.count === 1 ? "relativeUnitMonth" : "relativeUnitMonths",
        year: parts.count === 1 ? "relativeUnitYear" : "relativeUnitYears",
      } as Record<
        RelativeUnit,
        | "relativeUnitMinute"
        | "relativeUnitMinutes"
        | "relativeUnitHour"
        | "relativeUnitHours"
        | "relativeUnitDay"
        | "relativeUnitDays"
        | "relativeUnitWeek"
        | "relativeUnitWeeks"
        | "relativeUnitMonth"
        | "relativeUnitMonths"
        | "relativeUnitYear"
        | "relativeUnitYears"
      >
    )[parts.unit];
    const unit = this.t(unitKey);
    const label = parts.isFuture
      ? this.t("relativeFuture", { count: parts.count, unit })
      : this.t("relativePast", { count: parts.count, unit });
    return { label, absolute: parts.absolute, iso: parts.iso };
  }

  private browserIconUrl(s: Models.Session): string | null {
    const code = (s.clientCode || "").trim();
    if (!code || code === "-") return null;
    const client = authStore.getClient();
    if (!client) return null;
    try {
      const url = new Avatars(client).getBrowser(code as never, 64, 64);
      return typeof url === "string" ? url : String(url);
    } catch {
      return null;
    }
  }

  private flagUrl(s: Models.Session): string | null {
    const code = (s.countryCode || "").trim().toLowerCase();
    if (!code || code === "--") return null;
    const client = authStore.getClient();
    if (!client) return null;
    try {
      const url = new Avatars(client).getFlag(code as never, 32, 32);
      return typeof url === "string" ? url : String(url);
    } catch {
      return null;
    }
  }

  private deviceKindIcon(s: Models.Session): TemplateResult {
    const device = (s.deviceName || "").toLowerCase();
    const os = (s.osName || s.osCode || "").toLowerCase();
    if (/phone|tablet|mobile/.test(device) || /ios|android|ipados/.test(os))
      return icons.smartphone;
    if (/desktop|browser/.test(device) || /mac|windows|linux|chrome os/.test(os))
      return icons.monitor;
    return icons.globe;
  }

  private deviceIcon(s: Models.Session): TemplateResult {
    const url = this.browserIconUrl(s);
    const failed = !!this.browserIconFailed[s.$id];
    const kind = this.deviceKindIcon(s);
    if (!url || failed) {
      return html`<span class="device">${kind}</span>`;
    }
    return html`<span class="device">
      <img
        class="device-img"
        src=${url}
        alt=""
        @error=${() => {
          this.browserIconFailed = { ...this.browserIconFailed, [s.$id]: true };
        }}
      />
      <span class="device-badge" aria-hidden="true">${kind}</span>
    </span>`;
  }

  private renderSessions(): TemplateResult {
    const list = this.sessions;
    return html`<div class="section">
      ${this.card(
        this.t("sessions"),
        undefined,
        html`${this.error("sessions")}
        ${
          list === null
            ? html`<div class="empty"><span class="spinner"></span></div>`
            : list.length === 0
              ? this.emptyState(
                  icons.monitor,
                  this.t("noSessions"),
                  this.t("noSessionsDescription")
                )
              : list.map((s) => {
                  const flag = this.flagUrl(s);
                  const hasMfa = Array.isArray(s.factors) && s.factors.length > 0;
                  const provider = (s.provider || "").trim();
                  const showProvider =
                    !!provider && provider !== "email" && provider !== "anonymous";
                  const createdRel = this.formatRelativeLabel(s.$createdAt);
                  const expiresRel = this.formatRelativeLabel(s.expire);
                  const location = s.countryName || s.countryCode || "";
                  return html`<div class="row">
                    <div class="inline">
                      ${this.deviceIcon(s)}
                      <div class="row-main">
                        <span class="row-title">
                          ${s.clientName || provider || this.t("sessions")}
                          ${s.clientVersion ? html`<span class="muted small">${s.clientVersion}</span>` : nothing}
                          <span class="session-badges">
                            ${s.current ? html`<span class="badge badge-info">${this.t("currentSession")}</span>` : nothing}
                            ${
                              hasMfa
                                ? html`<span
                                    class="badge badge-info"
                                    title=${this.t("sessionMfaFactors", { factors: s.factors.join(", ") })}
                                    >${icons.shield} ${this.t("mfaBadge")}</span
                                  >`
                                : nothing
                            }
                            ${
                              showProvider
                                ? html`<span class="badge badge-outline"
                                    >${providerIcon(provider)} ${providerLabel(provider)}</span
                                  >`
                                : nothing
                            }
                          </span>
                        </span>
                        <span class="row-sub row-sub-meta">
                          ${s.osName ? html`<span>${s.osName}</span>` : nothing}
                          ${
                            location
                              ? html`<span
                                  >${flag ? html`<img class="flag" src=${flag} alt="" />` : nothing}${location}</span
                                >`
                              : nothing
                          }
                          ${s.ip ? html`<span>${s.ip}</span>` : nothing}
                        </span>
                        ${
                          createdRel || expiresRel
                            ? html`<span class="session-dates"
                                >${
                                  createdRel
                                    ? html`<time
                                        datetime=${createdRel.iso}
                                        title=${createdRel.absolute}
                                        >${this.t("sessionCreated", { date: createdRel.label })}</time
                                      >`
                                    : nothing
                                }${createdRel && expiresRel ? " · " : ""}${
                                  expiresRel
                                    ? html`<time
                                        datetime=${expiresRel.iso}
                                        title=${expiresRel.absolute}
                                        >${this.t("sessionExpires", { date: expiresRel.label })}</time
                                      >`
                                    : nothing
                                }</span
                              >`
                            : nothing
                        }
                      </div>
                    </div>
                    <div class="row-actions">
                      ${this.busy === `session-${s.$id}` ? html`<span class="spinner"></span>` : nothing}
                      <button
                        class="btn btn-ghost btn-sm"
                        @click=${() => this.onDeleteSession(s.$id)}
                        ?disabled=${!!this.busy}
                        aria-label=${this.t("signOutSession")}
                      >
                        ${icons.logOut}
                      </button>
                    </div>
                  </div>`;
                })
        }`
      )}
      ${this.card(
        this.t("signOutAllSessions"),
        this.t("signOutAllSessionsDescription"),
        this.confirmSignOutAll
          ? this.error("sessions-all")
          : html`${this.error("sessions-all")}
              <button
                class="btn btn-outline btn-sm warn"
                @click=${this.onSignOutAll}
                ?disabled=${!!this.busy}
              >
                ${this.spinner("sessions-all")} ${icons.logOut} ${this.t("signOutAllSessions")}
              </button>`,
        this.confirmSignOutAll
          ? this.confirmFooter(
              () => {
                this.confirmSignOutAll = false;
              },
              () => void this.onSignOutAll(),
              this.t("signOutAllSessions"),
              "sessions-all"
            )
          : undefined,
        true
      )}
    </div>`;
  }

  // ── Connections ──

  private renderIdentityDates(i: Models.Identity): TemplateResult | typeof nothing {
    const createdRel = this.formatRelativeLabel(i.$createdAt);
    const expiryRaw = (i.providerAccessTokenExpiry || "").trim();
    const expiresRel = expiryRaw ? this.formatRelativeLabel(expiryRaw) : null;
    if (!createdRel && !expiresRel && !expiryRaw) return nothing;
    return html`<span class="connection-dates"
      >${
        createdRel
          ? html`<time datetime=${createdRel.iso} title=${createdRel.absolute}
              >${this.t("identityCreated", { date: createdRel.label })}</time
            >`
          : nothing
      }${createdRel ? " · " : ""}${
        expiresRel
          ? html`<time datetime=${expiresRel.iso} title=${expiresRel.absolute}
              >${this.t("identityExpires", { date: expiresRel.label })}</time
            >`
          : html`<span>${this.t("identityExpiresNone")}</span>`
      }</span
    >`;
  }

  private renderConnections(): TemplateResult {
    const list = this.identities;
    const providers = this.config?.methods?.oauth ?? [];
    return html`<div class="section">
      ${this.card(
        this.t("connections"),
        undefined,
        html`${this.error("identities")}
        ${
          list === null
            ? html`<div class="empty"><span class="spinner"></span></div>`
            : list.length === 0
              ? this.emptyState(
                  icons.link,
                  this.t("noConnections"),
                  this.t("noConnectionsDescription")
                )
              : list.map(
                  (i) =>
                    html`<div class="row">
                      <div class="inline">
                        <span class="device">${providerIcon(i.provider)}</span>
                        <div class="row-main">
                          <span class="row-title">${providerLabel(i.provider)}</span>
                          <span class="row-sub">${i.providerEmail || i.providerUid}</span>
                          ${this.renderIdentityDates(i)}
                        </div>
                      </div>
                      <div class="row-actions">
                        ${
                          this.confirmDisconnectId === i.$id
                            ? html`<div class="inline">
                                <button
                                  type="button"
                                  class="btn btn-outline btn-sm"
                                  autofocus
                                  ?disabled=${!!this.busy}
                                  @click=${() => (this.confirmDisconnectId = null)}
                                >
                                  ${this.t("cancel")}
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-destructive btn-sm"
                                  @click=${() => this.onDeleteIdentity(i.$id)}
                                  ?disabled=${!!this.busy}
                                >
                                  ${
                                    this.busy === `identity-${i.$id}`
                                      ? html`<span class="spinner"></span>`
                                      : nothing
                                  }
                                  ${this.t("disconnect")}
                                </button>
                              </div>`
                            : html`<button
                                class="btn btn-ghost btn-sm"
                                @click=${() => this.onDeleteIdentity(i.$id)}
                                ?disabled=${!!this.busy}
                              >
                                ${
                                  this.busy === `identity-${i.$id}`
                                    ? html`<span class="spinner"></span>`
                                    : nothing
                                }
                                ${this.t("disconnect")}
                              </button>`
                        }
                      </div>
                    </div>`
                )
        }`,
        providers.length > 0
          ? html`${providers
              .filter((p) => !(list ?? []).some((i) => i.provider === p))
              .map(
                (p) =>
                  html`<button
                    class="btn btn-outline btn-sm"
                    @click=${() =>
                      void this.run(`connect-${p}`, () => authStore.signInWithOAuth(p))}
                    ?disabled=${!!this.busy}
                  >
                    ${this.spinner(`connect-${p}`)} ${providerIcon(p)}
                    ${this.t("connectProvider", { provider: providerLabel(p) })}
                  </button>`
              )}`
          : undefined
      )}
    </div>`;
  }

  // ── Activity ──

  private renderActivity(): TemplateResult {
    const list = this.logs;
    return html`<div class="section">
      ${this.card(
        this.t("activity"),
        undefined,
        html`${
          list === null
            ? html`<div class="empty"><span class="spinner"></span></div>`
            : list.length === 0
              ? this.emptyState(
                  icons.activity,
                  this.t("noActivity"),
                  this.t("noActivityDescription")
                )
              : list.map(
                  (l) =>
                    html`<div class="row">
                      <div class="row-main">
                        <span class="row-title">${l.event}</span>
                        <span class="row-sub"
                          >${[l.clientName, l.osName, l.countryName || l.countryCode, l.ip].filter(Boolean).join(" · ")}</span
                        >
                      </div>
                      ${(() => {
                        const rel = this.formatRelativeLabel(l.time);
                        return rel
                          ? html`<time class="log-time" datetime=${rel.iso} title=${rel.absolute}
                              >${rel.label}</time
                            >`
                          : html`<span class="log-time">${l.time}</span>`;
                      })()}
                    </div>`
                )
        }`
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-account": AuthUIAccount;
  }
}
