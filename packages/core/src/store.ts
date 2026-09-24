import { Account, Client, ID, Teams, type Models } from "appwrite";
import * as AppwriteSdk from "appwrite";

/**
 * Appwrite renamed several Account methods in 1.8 (e.g. createMfaAuthenticator became
 * createMFAAuthenticator, createVerification became createEmailVerification). Both spellings
 * exist in current SDKs and only the old ones in older SDKs, so call whichever is available.
 */
function call<T>(target: object, names: string[], args: unknown[]): Promise<T> {
  for (const name of names) {
    const fn = (target as Record<string, unknown>)[name];
    if (typeof fn === "function")
      return (fn as (...a: unknown[]) => Promise<T>).apply(target, args);
  }
  return Promise.reject(
    new Error(`Appwrite SDK is missing ${names[0]}(). Update the appwrite package.`)
  );
}

export type MfaFactor = "totp" | "email" | "phone" | "recoverycode";
import { defaultStrings } from "./i18n.js";
import { mergeStrings } from "./locales/index.js";
import { PreviewAccount } from "./preview.js";
import { describeError, ErrorTypes, isConfigError, isErrorType, toAuthUIError } from "./errors.js";
import { getStoredActiveTeamId, setStoredActiveTeamId } from "./active-team.js";
import { clearPendingOAuth, rememberLastMethod, rememberPendingOAuth } from "./last-method.js";
import type {
  AuthUIApp,
  AuthUILog,
  AuthUIConfig,
  AuthUIEventMap,
  AuthUIEventName,
  AuthUIPendingAction,
  AuthUIState,
  AuthUIStrings,
  OAuthProviderName,
} from "./types.js";

/** Query parameter that tells the widget which redirect flow is completing. */
const MARKER = "authui";
/** Params Appwrite appends to redirect URLs; removed after handling. */
const APPWRITE_PARAMS = ["userId", "secret", "expire", "project", "error", MARKER];

type Listener<K extends AuthUIEventName> = (detail: AuthUIEventMap[K]) => void;

const initialState = (): AuthUIState => ({
  status: "loading",
  user: null,
  mfaFactors: null,
  pending: null,
  configured: false,
  configError: null,
});

/**
 * Single source of truth for the widget. Wraps the Appwrite Account service,
 * tracks the signed-in user and broadcasts changes on `window` as `authui:change`.
 */
export class AuthStore {
  private client: Client | null = null;
  private account: Account | null = null;
  private config: AuthUIConfig | null = null;
  private state: AuthUIState = initialState();
  private listeners = new Map<AuthUIEventName, Set<Listener<any>>>();
  private refreshPromise: Promise<void> | null = null;

  // ───────────────────────────── configuration ─────────────────────────────

  /** Configure the Appwrite client. Safe to call more than once; the last call wins. */
  configure(config: AuthUIConfig): void {
    const endpoint = config.endpoint.trim().replace(/\/+$/, "");
    if (endpoint && !endpoint.endsWith("/v1")) {
      console.warn(
        `[authui] endpoint should end with /v1 (got "${config.endpoint}"). Without it Appwrite returns HTML 404 pages.`
      );
    }
    this.config = config;
    this.client = new Client().setEndpoint(config.endpoint).setProject(config.project);
    this.preview = config.preview ? new PreviewAccount() : null;
    this.account = this.preview ? (this.preview as unknown as Account) : new Account(this.client);
    this.teams = null;
    this.appCache.clear();
    this.activeTeamId = getStoredActiveTeamId(config.project);
    this.setState({ configured: true, status: "loading", configError: null });
    if (this.preview) {
      void this.refresh();
    } else if (typeof window !== "undefined") {
      void this.handleRedirect().then(() => this.refresh());
    }
  }

  /**
   * Called by <authui-config> when it is on the page but missing endpoint or project.
   * Moves status off "loading" so the UI can show a developer-facing message.
   */
  notifyConfigIncomplete(): void {
    if (this.config) return;
    const message = this.getStrings().errorConfigIncomplete;
    console.warn(`[authui] ${message}`);
    // configError alone drives the sticky banner; do not also push a pending
    // notice with the same text (that stacked a dismissible alert on top).
    this.setState({
      status: "signed-out",
      user: null,
      mfaFactors: null,
      configured: false,
      configError: message,
    });
  }

  private preview: PreviewAccount | null = null;

  get isConfigured(): boolean {
    return this.config !== null;
  }

  /** True when running against the in-memory preview account. */
  get isPreview(): boolean {
    return this.preview !== null;
  }

  /** Preview only: sign the sample user in without any form. */
  async previewSignIn(): Promise<void> {
    if (!this.preview) return;
    this.preview.signInDirectly();
    await this.refresh();
  }

  getConfig(): AuthUIConfig | null {
    return this.config;
  }

  /** The configured Appwrite client, for apps that want to reuse it. */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * The Account service Auth UI talks to. Reuse it for prefs, JWTs or anything else
   * on the signed-in account. In preview mode this is the in-memory stand-in.
   */
  getAccount(): Account | null {
    return this.account;
  }

  private teams: Teams | null = null;
  private activeTeamId: string | null = null;
  /** In-flight / resolved Apps.get lookups keyed by appId. */
  private appCache = new Map<string, Promise<AuthUIApp>>();

  /** List teams the signed-in user belongs to. Empty in preview or when signed out. */
  async listTeams(): Promise<Models.Team<Models.Preferences>[]> {
    if (this.preview || !this.client || this.state.status !== "signed-in") return [];
    this.teams ??= new Teams(this.client);
    try {
      const res = await this.teams.list();
      return res.teams ?? [];
    } catch (err) {
      this.fail(err);
    }
  }

  getActiveTeamId(): string | null {
    if (this.activeTeamId) return this.activeTeamId;
    const project = this.config?.project;
    if (!project) return null;
    this.activeTeamId = getStoredActiveTeamId(project);
    return this.activeTeamId;
  }

  /**
   * Remember the active team locally and emit `active-team`.
   * Does not call Appwrite; membership is already required to appear in listTeams().
   */
  setActiveTeam(team: { $id: string; name: string } | null): void {
    const project = this.config?.project;
    if (project) setStoredActiveTeamId(project, team?.$id ?? null);
    this.activeTeamId = team?.$id ?? null;
    this.emit("active-team", { teamId: this.activeTeamId, team });
  }

  getStrings(): AuthUIStrings {
    return mergeStrings(defaultStrings, this.config?.locale, this.config?.strings);
  }

  getState(): AuthUIState {
    return { ...this.state };
  }

  get user(): Models.User<Models.Preferences> | null {
    return this.state.user;
  }

  // ─────────────────────────────── events ───────────────────────────────

  on<K extends AuthUIEventName>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  private emit<K extends AuthUIEventName>(event: K, detail: AuthUIEventMap[K]): void {
    this.listeners.get(event)?.forEach((l) => {
      try {
        l(detail);
      } catch (err) {
        console.error("[authui] listener failed", err);
      }
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(`authui:${event}`, { detail }));
    }
  }

  private setState(patch: Partial<AuthUIState>): void {
    this.state = { ...this.state, ...patch };
    this.emit("change", this.getState());
  }

  private fail(err: unknown): never {
    const e = toAuthUIError(err);
    this.emit("error", e);
    throw err;
  }

  private acct(): Account {
    if (!this.account) throw new Error(this.getStrings().errorNotConfigured);
    return this.account;
  }

  /** True when the server has no matching route (older Cloud / self-hosted). */
  private isMissingRoute(err: unknown): boolean {
    const e = toAuthUIError(err);
    if (e.type === ErrorTypes.routeNotFound) return true;
    if (e.code === 404) return true;
    return false;
  }

  private accountClient(): Client {
    const acct = this.acct() as Account & { client?: Client };
    const client = acct.client ?? this.client;
    if (!client) throw new Error(this.getStrings().errorNotConfigured);
    return client;
  }

  /**
   * Prefer an Account SDK method when present; otherwise hit the REST path the
   * same way the Appwrite SDK would (for routes not yet in the pinned SDK).
   */
  private async accountMethodOrRest<T>(opts: {
    names: string[];
    args: unknown[];
    method: string;
    path: string;
    payload: Record<string, unknown>;
  }): Promise<T> {
    const acct = this.acct();
    for (const name of opts.names) {
      const fn = (acct as unknown as Record<string, unknown>)[name];
      if (typeof fn === "function") {
        return (fn as (...a: unknown[]) => Promise<T>).apply(acct, opts.args);
      }
    }
    const client = this.accountClient();
    const endpoint = String(client.config.endpoint).replace(/\/+$/, "");
    const uri = new URL(endpoint + opts.path);
    const apiHeaders: Record<string, string> = {
      "X-Appwrite-Project": String(client.config.project ?? ""),
      "content-type": "application/json",
      accept: "application/json",
    };
    return client.call(opts.method, uri, apiHeaders, opts.payload) as Promise<T>;
  }

  // ─────────────────────────── session lifecycle ───────────────────────────

  /** Re-fetch the current user and derive status. */
  refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      if (!this.account) {
        this.setState({ status: "signed-out", user: null, mfaFactors: null });
        return;
      }
      const wasSignedIn = this.state.status === "signed-in";
      try {
        const user = await this.account.get();
        this.setState({ status: "signed-in", user, mfaFactors: null, configError: null });
        if (!wasSignedIn) this.emit("signed-in", user);
      } catch (err) {
        if (isErrorType(err, ErrorTypes.moreFactorsRequired)) {
          let factors: Models.MfaFactors | null = null;
          try {
            factors = await call<Models.MfaFactors>(
              this.account,
              ["listMFAFactors", "listMfaFactors"],
              []
            );
          } catch {
            /* factors stay unknown; UI offers all */
          }
          this.setState({ status: "mfa-required", user: null, mfaFactors: factors });
        } else if (isErrorType(err, ErrorTypes.userBlocked)) {
          await this.purgeLocalSession();
          this.setState({
            status: "signed-out",
            user: null,
            mfaFactors: null,
            pending: {
              type: "notice",
              tone: "error",
              message: this.getStrings().errorUserBlocked,
            },
          });
          if (wasSignedIn) this.emit("signed-out", undefined);
        } else if (!wasSignedIn && isConfigError(err)) {
          const message = describeError(err, this.getStrings());
          const hint = message || this.getStrings().errorConfig;
          console.warn(
            `[authui] ${hint} (endpoint=${this.config?.endpoint ?? "?"}, project=${this.config?.project ?? "?"})`
          );
          const e = toAuthUIError(err);
          this.emit("error", { message: hint, type: e.type, code: e.code });
          // Single source of truth: sticky configError banner only (no duplicate notice).
          this.setState({
            status: "signed-out",
            user: null,
            mfaFactors: null,
            configError: hint,
          });
        } else {
          this.setState({ status: "signed-out", user: null, mfaFactors: null, configError: null });
          if (wasSignedIn) this.emit("signed-out", undefined);
        }
      }
    })().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async afterSignIn(): Promise<void> {
    await this.refresh();
    if (this.state.status !== "signed-in" && this.state.status !== "mfa-required") {
      const pending = this.state.pending;
      if (pending?.type === "notice" && pending.tone === "error") {
        throw Object.assign(new Error(pending.message), {
          type: ErrorTypes.userBlocked,
          code: 401,
        });
      }
    }
    const url = this.config?.successUrl;
    if (url && this.state.status === "signed-in" && typeof window !== "undefined") {
      window.location.assign(url);
    }
  }

  /**
   * Drop a poisoned Appwrite session (e.g. after user_blocked). Deletes the
   * current session when possible and clears the SDK fallback without reading it.
   */
  private async purgeLocalSession(): Promise<void> {
    try {
      await this.account?.deleteSession("current");
    } catch {
      /* session may already be unusable */
    }
    try {
      this.client?.setSession("");
    } catch {
      /* older SDKs */
    }
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem("cookieFallback");
      } catch {
        /* private mode */
      }
    }
    // Rebuild the client so any in-memory fallback cookies cannot poison later calls.
    if (this.config && !this.preview) {
      this.client = new Client().setEndpoint(this.config.endpoint).setProject(this.config.project);
      this.account = new Account(this.client);
    }
  }

  // ─────────────────────────────── sign in ───────────────────────────────

  async signInWithEmailPassword(email: string, password: string): Promise<void> {
    try {
      await this.acct().createEmailPasswordSession(email.trim(), password);
    } catch (err) {
      this.fail(err);
    }
    await this.afterSignIn();
  }

  async signUp(email: string, password: string, name?: string): Promise<void> {
    try {
      await this.acct().create(ID.unique(), email.trim(), password, name?.trim() || undefined);
      await this.acct().createEmailPasswordSession(email.trim(), password);
    } catch (err) {
      this.fail(err);
    }
    await this.afterSignIn();
  }

  async signInAnonymously(): Promise<void> {
    try {
      await this.acct().createAnonymousSession();
    } catch (err) {
      this.fail(err);
    }
    await this.afterSignIn();
  }

  /**
   * Redirects the browser to the provider; the returned promise only resolves in
   * preview mode, where the sign in completes in place.
   */
  async signInWithOAuth(provider: OAuthProviderName): Promise<void> {
    const scopes = this.config?.oauthScopes?.[provider];
    let result: unknown;
    try {
      result = this.acct().createOAuth2Token(
        provider as any,
        this.redirectUrl("oauth"),
        this.redirectUrl("oauth-failed"),
        scopes
      );
    } catch (err) {
      this.fail(err);
    }
    if (result && typeof (result as Promise<unknown>).then === "function") {
      try {
        await result;
      } catch (err) {
        this.fail(err);
      }
      await this.afterSignIn();
    }
  }

  async sendMagicUrl(email: string): Promise<Models.Token> {
    try {
      return await this.acct().createMagicURLToken(
        ID.unique(),
        email.trim(),
        this.redirectUrl("magic-url"),
        this.config?.securityPhrase ?? true
      );
    } catch (err) {
      return this.fail(err);
    }
  }

  async sendEmailOtp(email: string): Promise<Models.Token> {
    try {
      return await this.acct().createEmailToken(
        ID.unique(),
        email.trim(),
        this.config?.securityPhrase ?? true
      );
    } catch (err) {
      return this.fail(err);
    }
  }

  async sendPhoneOtp(phone: string): Promise<Models.Token> {
    try {
      return await this.acct().createPhoneToken(ID.unique(), phone.replace(/[\s()-]/g, ""));
    } catch (err) {
      return this.fail(err);
    }
  }

  /** Redeem any token secret (email OTP, SMS OTP, magic URL, OAuth token). */
  async signInWithToken(userId: string, secret: string): Promise<void> {
    try {
      await this.acct().createSession(userId, secret.trim());
    } catch (err) {
      this.fail(err);
    }
    await this.afterSignIn();
  }

  /**
   * Create a session from a native OIDC ID token (Capacitor / WebView / One Tap bridges).
   * Not shown as a sign-in button; call from your native bridge after the provider returns a JWT.
   * Soft-detects missing routes on older Appwrite.
   */
  async createIdTokenSession(params: {
    provider: string;
    idToken: string;
    nonce?: string;
    accessToken?: string;
    accessTokenExpiry?: number;
    name?: string;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
      provider: params.provider,
      idToken: params.idToken,
    };
    if (params.nonce) payload.nonce = params.nonce;
    if (params.accessToken) payload.accessToken = params.accessToken;
    if (params.accessTokenExpiry != null && params.accessTokenExpiry > 0) {
      payload.accessTokenExpiry = params.accessTokenExpiry;
    }
    if (params.name?.trim()) payload.name = params.name.trim();
    try {
      await this.accountMethodOrRest({
        names: ["createIdTokenSession"],
        args: [params],
        method: "post",
        path: "/account/sessions/id-token",
        payload,
      });
    } catch (err) {
      this.fail(err);
    }
    rememberLastMethod(`oauth:${params.provider}`);
    await this.afterSignIn();
  }

  // ─────────────────────────────── MFA ───────────────────────────────

  async createMfaChallenge(factor: MfaFactor): Promise<Models.MfaChallenge> {
    try {
      return await call<Models.MfaChallenge>(
        this.acct(),
        ["createMFAChallenge", "createMfaChallenge"],
        [factor]
      );
    } catch (err) {
      return this.fail(err);
    }
  }

  /** Verify a challenge. Completes a pending sign in, or acts as a step-up for protected actions. */
  async completeMfaChallenge(
    challengeId: string,
    otp: string,
    opts: { signIn?: boolean } = {}
  ): Promise<void> {
    try {
      await call<Models.Session>(
        this.acct(),
        ["updateMFAChallenge", "updateMfaChallenge"],
        [challengeId, otp.trim()]
      );
    } catch (err) {
      this.fail(err);
    }
    if (opts.signIn ?? true) await this.afterSignIn();
  }

  async listMfaFactors(): Promise<Models.MfaFactors> {
    try {
      return await call<Models.MfaFactors>(this.acct(), ["listMFAFactors", "listMfaFactors"], []);
    } catch (err) {
      return this.fail(err);
    }
  }

  async setMfaEnabled(enabled: boolean): Promise<void> {
    try {
      await this.acct().updateMFA(enabled);
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async addAuthenticator(): Promise<Models.MfaType> {
    try {
      return await call<Models.MfaType>(
        this.acct(),
        ["createMFAAuthenticator", "createMfaAuthenticator"],
        ["totp"]
      );
    } catch (err) {
      return this.fail(err);
    }
  }

  async verifyAuthenticator(otp: string): Promise<void> {
    try {
      await call(
        this.acct(),
        ["updateMFAAuthenticator", "updateMfaAuthenticator"],
        ["totp", otp.trim()]
      );
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  /** Requires a recent MFA challenge (server rejects with user_challenge_required otherwise). */
  async removeAuthenticator(): Promise<void> {
    try {
      await call(this.acct(), ["deleteMFAAuthenticator", "deleteMfaAuthenticator"], ["totp"]);
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async createRecoveryCodes(): Promise<string[]> {
    try {
      const res = await call<Models.MfaRecoveryCodes>(
        this.acct(),
        ["createMFARecoveryCodes", "createMfaRecoveryCodes"],
        []
      );
      return res.recoveryCodes;
    } catch (err) {
      return this.fail(err);
    }
  }

  /** Requires a recent MFA challenge. */
  async regenerateRecoveryCodes(): Promise<string[]> {
    try {
      const res = await call<Models.MfaRecoveryCodes>(
        this.acct(),
        ["updateMFARecoveryCodes", "updateMfaRecoveryCodes"],
        []
      );
      return res.recoveryCodes;
    } catch (err) {
      return this.fail(err);
    }
  }

  /** Requires a recent MFA challenge. */
  async getRecoveryCodes(): Promise<string[]> {
    try {
      const res = await call<Models.MfaRecoveryCodes>(
        this.acct(),
        ["getMFARecoveryCodes", "getMfaRecoveryCodes"],
        []
      );
      return res.recoveryCodes;
    } catch (err) {
      return this.fail(err);
    }
  }

  // ───────────────────────── password recovery ─────────────────────────

  /**
   * Prefer in-panel recovery OTP when the server supports it; otherwise email a
   * reset link. Soft-detects missing OTP routes so older Appwrite keeps working.
   */
  async sendPasswordRecovery(
    email: string
  ): Promise<{ mode: "otp"; token: Models.Token } | { mode: "link" }> {
    const trimmed = email.trim();
    const phrase = this.config?.securityPhrase ?? true;
    try {
      const token = await this.accountMethodOrRest<Models.Token>({
        names: ["createRecoveryOTP"],
        args: [trimmed, phrase],
        method: "post",
        path: "/account/recovery/otp",
        payload: { email: trimmed, phrase },
      });
      return { mode: "otp", token };
    } catch (err) {
      if (!this.isMissingRoute(err)) this.fail(err);
    }
    try {
      await this.acct().createRecovery(trimmed, this.redirectUrl("recovery"));
      return { mode: "link" };
    } catch (err) {
      this.fail(err);
    }
  }

  async completePasswordRecovery(
    userId: string,
    secret: string,
    password: string,
    opts: { otp?: boolean } = {}
  ): Promise<void> {
    try {
      if (opts.otp) {
        await this.accountMethodOrRest({
          names: ["updateRecoveryOTP"],
          args: [userId, secret.trim(), password],
          method: "put",
          path: "/account/recovery/otp",
          payload: { userId, secret: secret.trim(), password },
        });
      } else {
        await this.acct().updateRecovery(userId, secret, password);
      }
    } catch (err) {
      this.fail(err);
    }
    this.setState({ pending: null });
  }

  // ───────────────────────────── sign out ─────────────────────────────

  async signOut(sessionId = "current"): Promise<void> {
    try {
      await this.acct().deleteSession(sessionId);
    } catch (err) {
      this.fail(err);
    }
    if (sessionId === "current") {
      this.setState({ status: "signed-out", user: null, mfaFactors: null });
      this.emit("signed-out", undefined);
      return;
    }
    // Deleting by id still ends the local session when that id was the current device.
    try {
      await this.acct().get();
    } catch {
      this.setState({ status: "signed-out", user: null, mfaFactors: null });
      this.emit("signed-out", undefined);
    }
  }

  async signOutEverywhere(): Promise<void> {
    try {
      await this.acct().deleteSessions();
    } catch (err) {
      this.fail(err);
    }
    this.setState({ status: "signed-out", user: null, mfaFactors: null });
    this.emit("signed-out", undefined);
  }

  // ────────────────────────── account management ──────────────────────────

  async listSessions(): Promise<Models.Session[]> {
    try {
      return (await this.acct().listSessions()).sessions;
    } catch (err) {
      return this.fail(err);
    }
  }

  async listIdentities(): Promise<Models.Identity[]> {
    try {
      return (await this.acct().listIdentities()).identities;
    } catch (err) {
      return this.fail(err);
    }
  }

  async deleteIdentity(identityId: string): Promise<void> {
    try {
      await this.acct().deleteIdentity(identityId);
    } catch (err) {
      this.fail(err);
    }
  }

  async listLogs(): Promise<AuthUILog[]> {
    try {
      // Removed from appwrite@28; soft-detect for older SDKs / preview.
      const acct = this.acct() as Account & {
        listLogs?: () => Promise<{ logs: AuthUILog[] }>;
      };
      if (typeof acct.listLogs !== "function") {
        throw Object.assign(new Error("general_route_not_found"), {
          type: "general_route_not_found",
          code: 404,
        });
      }
      return (await acct.listLogs()).logs;
    } catch (err) {
      return this.fail(err);
    }
  }

  async updateName(name: string): Promise<void> {
    try {
      await this.acct().updateName(name.trim());
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async updateEmail(email: string, password: string): Promise<void> {
    try {
      await this.acct().updateEmail(email.trim(), password);
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async updatePhone(phone: string, password: string): Promise<void> {
    try {
      await this.acct().updatePhone(phone.replace(/[\s()-]/g, ""), password);
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async updatePassword(password: string, oldPassword?: string): Promise<void> {
    try {
      await this.acct().updatePassword(password, oldPassword || undefined);
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  /** Turn an anonymous session into a full account. */
  async convertGuest(email: string, password: string, name?: string): Promise<void> {
    try {
      await this.acct().updateEmail(email.trim(), password);
      if (name?.trim()) await this.acct().updateName(name.trim());
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  /**
   * Prefer in-panel email verification OTP when supported; otherwise email a
   * verification link. Soft-detects missing OTP routes.
   */
  async sendEmailVerification(): Promise<{ mode: "otp"; token: Models.Token } | { mode: "link" }> {
    const phrase = this.config?.securityPhrase ?? true;
    try {
      const token = await this.accountMethodOrRest<Models.Token>({
        names: ["createEmailVerificationOTP"],
        args: [phrase],
        method: "post",
        path: "/account/verifications/email/otp",
        payload: { phrase },
      });
      return { mode: "otp", token };
    } catch (err) {
      if (!this.isMissingRoute(err)) this.fail(err);
    }
    try {
      await call(
        this.acct(),
        ["createEmailVerification", "createVerification"],
        [this.redirectUrl("verify-email")]
      );
      return { mode: "link" };
    } catch (err) {
      this.fail(err);
    }
  }

  async confirmEmailVerification(otp: string): Promise<void> {
    const userId = this.state.user?.$id;
    if (!userId) return;
    try {
      await this.accountMethodOrRest({
        names: ["updateEmailVerificationOTP"],
        args: [userId, otp.trim()],
        method: "put",
        path: "/account/verifications/email/otp",
        payload: { userId, secret: otp.trim() },
      });
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async sendPhoneVerification(): Promise<void> {
    try {
      await this.acct().createPhoneVerification();
    } catch (err) {
      this.fail(err);
    }
  }

  async confirmPhoneVerification(otp: string): Promise<void> {
    const userId = this.state.user?.$id;
    if (!userId) return;
    try {
      await this.acct().updatePhoneVerification(userId, otp.trim());
    } catch (err) {
      this.fail(err);
    }
    await this.refresh();
  }

  async listConsents(): Promise<Models.Oauth2Consent[]> {
    try {
      return (await this.acct().listConsents()).consents;
    } catch (err) {
      return this.fail(err);
    }
  }

  async deleteConsent(consentId: string): Promise<void> {
    try {
      await this.acct().deleteConsent(consentId);
    } catch (err) {
      this.fail(err);
    }
  }

  /**
   * Fetch OAuth2 app branding (name, logoUri, tagline) for authorized-apps rows.
   * Soft-detects an Apps SDK service when the host's appwrite package exports it;
   * otherwise GET /apps/{appId} via Client.call (Apps may be absent in older SDKs).
   * Does not emit a global error on failure; callers soft-fail per appId.
   */
  async getApp(appId: string): Promise<AuthUIApp> {
    const trimmed = appId.trim();
    if (!trimmed) throw new Error(this.getStrings().errorNotConfigured);

    const cached = this.appCache.get(trimmed);
    if (cached) return cached;

    const pending = this.fetchApp(trimmed);
    this.appCache.set(trimmed, pending);
    pending.catch(() => {
      // Allow a later retry after a transient failure.
      if (this.appCache.get(trimmed) === pending) this.appCache.delete(trimmed);
    });
    return pending;
  }

  private async fetchApp(appId: string): Promise<AuthUIApp> {
    if (this.preview) {
      return this.preview.getApp(appId);
    }
    const client = this.accountClient();

    // Soft-detect Apps when the installed SDK exports it.
    const AppsCtor = Reflect.get(AppwriteSdk, "Apps") as
      (new (c: Client) => { get(p: { appId: string }): Promise<AuthUIApp> }) | undefined;
    if (typeof AppsCtor === "function") {
      const apps = new AppsCtor(client);
      if (typeof apps.get === "function") {
        const app = await apps.get({ appId });
        return {
          $id: app.$id,
          name: app.name,
          logoUri: app.logoUri || undefined,
          tagline: app.tagline || undefined,
        };
      }
    }

    const endpoint = String(client.config.endpoint).replace(/\/+$/, "");
    const uri = new URL(`${endpoint}/apps/${encodeURIComponent(appId)}`);
    const apiHeaders: Record<string, string> = {
      "X-Appwrite-Project": String(client.config.project ?? ""),
      accept: "application/json",
    };
    const app = (await client.call("get", uri, apiHeaders, {})) as AuthUIApp;
    return {
      $id: app.$id,
      name: app.name,
      logoUri: app.logoUri || undefined,
      tagline: app.tagline || undefined,
    };
  }

  /** Blocks the account and ends the session. Appwrite keeps the record so an admin can restore it. */
  async deleteAccount(): Promise<void> {
    try {
      await this.acct().updateStatus();
    } catch (err) {
      this.fail(err);
    }
    this.setState({ status: "signed-out", user: null, mfaFactors: null });
    this.emit("signed-out", undefined);
  }

  // ───────────────────────────── redirects ─────────────────────────────

  /** Build the URL Appwrite should send the user back to for a given flow. */
  redirectUrl(action: string): string {
    const base =
      this.config?.redirectUrl ??
      (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
    const url = new URL(base, typeof window !== "undefined" ? window.location.href : undefined);
    for (const p of APPWRITE_PARAMS) url.searchParams.delete(p);
    url.searchParams.set(MARKER, action);
    return url.toString();
  }

  setPending(pending: AuthUIPendingAction | null): void {
    this.setState({ pending });
  }

  /**
   * Finish a flow that arrived through the URL. Called automatically by `configure()`.
   * Returns true when a redirect was handled.
   */
  async handleRedirect(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const action = params.get(MARKER);
    if (!action) return false;

    const userId = params.get("userId") ?? "";
    const secret = params.get("secret") ?? "";
    this.cleanUrl();

    const incomplete = () => {
      this.setState({
        pending: {
          type: "notice",
          message: this.getStrings().errorInvalidToken,
          tone: "error",
        },
      });
    };

    try {
      switch (action) {
        case "oauth":
        case "magic-url":
          if (userId && secret) {
            await this.acct().createSession(userId, secret);
            if (action === "oauth") rememberPendingOAuth();
            else rememberLastMethod("magic-url");
          } else {
            if (action === "oauth") clearPendingOAuth();
            incomplete();
          }
          break;
        case "oauth-failed":
          clearPendingOAuth();
          // Sticky notice pending (same survival path as magic-url / verify-email errors).
          this.setState({
            pending: {
              type: "notice",
              tone: "error",
              message: this.getStrings().errorOAuth,
            },
          });
          break;
        case "recovery":
          if (userId && secret)
            this.setState({ pending: { type: "reset-password", userId, secret } });
          else incomplete();
          break;
        case "verify-email":
          if (userId && secret) {
            await call(
              this.acct(),
              ["updateEmailVerification", "updateVerification"],
              [userId, secret]
            );
            this.setState({
              pending: {
                type: "notice",
                message: this.getStrings().emailVerified,
                tone: "success",
              },
            });
          } else incomplete();
          break;
      }
    } catch (err) {
      const e = toAuthUIError(err);
      const message = describeError(err, this.getStrings(), "link");
      this.emit("error", e);
      this.setState({ pending: { type: "notice", message, tone: "error" } });
    }
    return true;
  }

  private cleanUrl(): void {
    const url = new URL(window.location.href);
    for (const p of APPWRITE_PARAMS) url.searchParams.delete(p);
    window.history.replaceState(window.history.state, "", url.toString());
  }

  /** Test helper. */
  reset(): void {
    this.client = null;
    this.account = null;
    this.teams = null;
    this.appCache.clear();
    this.activeTeamId = null;
    this.preview = null;
    this.config = null;
    this.state = initialState();
    this.listeners.clear();
  }
}

export const authStore = new AuthStore();
