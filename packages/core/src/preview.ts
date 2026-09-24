import type { Models } from "appwrite";

/**
 * In-memory stand-in for the Appwrite Account service used when `preview: true`.
 * Accepts any email, password or code, never touches the network, and seeds
 * realistic sessions, identities and logs so every screen can be explored.
 */

const err = (type: string, message: string, code = 401) =>
  Object.assign(new Error(message), { type, code });

const now = () => new Date().toISOString();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const WORDS = [
  "amber",
  "brave",
  "calm",
  "delta",
  "ember",
  "fable",
  "glide",
  "harbor",
  "ivory",
  "juniper",
  "kite",
  "lumen",
];
const phrase = () =>
  `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${WORDS[Math.floor(Math.random() * WORDS.length)]}`;
const id = () => Math.random().toString(36).slice(2, 12);
const code = () =>
  Array.from({ length: 2 }, () => Math.random().toString(36).slice(2, 7)).join("-");

interface PreviewUserSeed {
  name: string;
  email: string;
  phone: string;
}

const DEFAULT_SEED: PreviewUserSeed = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+15550100",
};

export class PreviewAccount {
  user: (Models.User<Models.Preferences> & Record<string, unknown>) | null = null;
  /** True after a primary sign in while the account has MFA and a usable factor. */
  mfaPending = false;
  /** Account-level setting; survives sign out like it would on the server. */
  mfaEnabled = false;
  totpEnrolled = false;
  recoveryCodes: string[] = [];
  /** Time of the last completed challenge; protected actions need one within 30 minutes. */
  lastChallenge = 0;
  sessions: Models.Session[] = [];
  identities: Models.Identity[] = [];
  logs: Models.Log[] = [];
  /** Tokens waiting to be redeemed by userId. */
  private tokens = new Map<string, { email?: string; phone?: string }>();
  private pendingAuthenticator: { secret: string; uri: string } | null = null;

  constructor(private seed: PreviewUserSeed = DEFAULT_SEED) {}

  // ───────────────────────── helpers ─────────────────────────

  private makeUser(partial: Partial<PreviewUserSeed> & { anonymous?: boolean } = {}) {
    const anonymous = partial.anonymous ?? false;
    this.user = {
      $id: "preview-user",
      $createdAt: ago(60 * 24 * 30),
      $updatedAt: now(),
      name: anonymous ? "" : (partial.name ?? this.seed.name),
      registration: ago(60 * 24 * 30),
      status: true,
      labels: [],
      passwordUpdate: anonymous ? "" : ago(60 * 24 * 7),
      email: anonymous ? "" : (partial.email ?? this.seed.email),
      phone: anonymous ? "" : (partial.phone ?? this.seed.phone),
      emailVerification: !anonymous,
      phoneVerification: false,
      mfa: this.mfaEnabled,
      prefs: {},
      targets: [],
      accessedAt: now(),
    } as unknown as Models.User<Models.Preferences> & Record<string, unknown>;
    this.seedActivity(anonymous ? "anonymous" : "email");
    return this.user;
  }

  private seedActivity(provider: string) {
    if (this.sessions.length > 0) return;
    const base = {
      $createdAt: now(),
      $updatedAt: now(),
      userId: "preview-user",
      expire: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      providerUid: "",
      providerAccessToken: "",
      providerAccessTokenExpiry: "",
      providerRefreshToken: "",
      clientType: "browser",
      clientCode: "CH",
      clientEngine: "Blink",
      clientEngineVersion: "128",
      deviceName: "desktop",
      deviceBrand: "",
      deviceModel: "",
      factors: ["password"],
      secret: "",
      mfaUpdatedAt: "",
    };
    this.sessions = [
      {
        ...base,
        $id: "current",
        provider,
        ip: "203.0.113.24",
        osCode: "MAC",
        osName: "macOS",
        osVersion: "15",
        clientName: "Chrome",
        clientVersion: "128",
        countryCode: "de",
        countryName: "Germany",
        current: true,
      },
      {
        ...base,
        $id: id(),
        $createdAt: ago(60 * 5),
        provider,
        ip: "198.51.100.7",
        osCode: "IOS",
        osName: "iOS",
        osVersion: "18",
        clientName: "Safari",
        clientVersion: "18",
        clientType: "browser",
        deviceName: "smartphone",
        countryCode: "de",
        countryName: "Germany",
        current: false,
      },
      {
        ...base,
        $id: id(),
        $createdAt: ago(60 * 24 * 3),
        provider: "oauth2",
        ip: "192.0.2.90",
        osCode: "WIN",
        osName: "Windows",
        osVersion: "11",
        clientName: "Firefox",
        clientVersion: "130",
        countryCode: "us",
        countryName: "United States",
        current: false,
      },
    ] as Models.Session[];
    this.identities = [
      {
        $id: "identity-github",
        $createdAt: ago(60 * 24 * 20),
        $updatedAt: ago(60 * 24 * 20),
        userId: "preview-user",
        provider: "github",
        providerUid: "8675309",
        providerEmail: this.seed.email,
        providerAccessToken: "",
        providerAccessTokenExpiry: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        providerRefreshToken: "",
      } as Models.Identity,
    ];
    this.logs = [
      {
        event: "session.create",
        time: now(),
        clientName: "Chrome",
        osName: "macOS",
        countryName: "Germany",
        ip: "203.0.113.24",
      },
      {
        event: "user.update.name",
        time: ago(60 * 24 * 2),
        clientName: "Safari",
        osName: "iOS",
        countryName: "Germany",
        ip: "198.51.100.7",
      },
      {
        event: "session.create",
        time: ago(60 * 24 * 3),
        clientName: "Firefox",
        osName: "Windows",
        countryName: "United States",
        ip: "192.0.2.90",
      },
    ] as unknown as Models.Log[];
  }

  private requireUser() {
    if (!this.user)
      throw err("general_unauthorized_scope", "User (role: guests) missing scope (account)");
    if (this.mfaPending)
      throw err(
        "user_more_factors_required",
        "More factors are required to complete the sign in process."
      );
    return this.user;
  }

  private requireRecentChallenge() {
    if (Date.now() - this.lastChallenge > 30 * 60_000) {
      throw err(
        "user_challenge_required",
        "A recently successful challenge is required to complete this action."
      );
    }
  }

  private afterPrimarySignIn() {
    const hasFactor = this.totpEnrolled || this.user?.emailVerification;
    this.mfaPending = !!(this.user?.mfa && hasFactor);
  }

  private async delay<T>(value: T | (() => T), ms = 150): Promise<T> {
    await new Promise((r) => setTimeout(r, ms));
    return typeof value === "function" ? (value as () => T)() : value;
  }

  /** Sign the preview user in directly (used by the playground). */
  signInDirectly(): void {
    if (!this.user) this.makeUser();
    this.mfaPending = false;
  }

  // ───────────────────────── account ─────────────────────────

  async get() {
    return this.delay(() => this.requireUser(), 120);
  }

  async create(_userId: string, email: string, _password: string, name?: string) {
    return this.delay(() => this.makeUser({ email, name: name || email.split("@")[0] }));
  }

  async createEmailPasswordSession(email: string) {
    return this.delay(() => {
      if (!this.user || this.user.email !== email)
        this.makeUser({ email, name: this.user?.name || this.seed.name });
      this.afterPrimarySignIn();
      return this.sessions[0];
    });
  }

  async createAnonymousSession() {
    return this.delay(() => {
      this.makeUser({ anonymous: true });
      this.mfaPending = false;
      return this.sessions[0];
    });
  }

  async createOAuth2Token(provider: string) {
    return this.delay(() => {
      this.makeUser({ email: `ada@${provider}.example`, name: this.seed.name });
      this.afterPrimarySignIn();
    }, 800);
  }

  async createMagicURLToken(userId: string, email: string) {
    this.tokens.set(userId, { email });
    return this.delay({
      $id: id(),
      $createdAt: now(),
      userId,
      secret: "",
      expire: "",
      phrase: phrase(),
    });
  }

  async createEmailToken(userId: string, email: string) {
    this.tokens.set(userId, { email });
    return this.delay({
      $id: id(),
      $createdAt: now(),
      userId,
      secret: "",
      expire: "",
      phrase: phrase(),
    });
  }

  async createPhoneToken(userId: string, phone: string) {
    this.tokens.set(userId, { phone });
    return this.delay({ $id: id(), $createdAt: now(), userId, secret: "", expire: "", phrase: "" });
  }

  async createSession(userId: string) {
    return this.delay(() => {
      const t = this.tokens.get(userId) ?? {};
      this.makeUser({ email: t.email ?? this.seed.email, phone: t.phone ?? this.seed.phone });
      if (t.phone) this.user!.phoneVerification = true;
      this.afterPrimarySignIn();
      return this.sessions[0];
    });
  }

  async createRecovery() {
    return this.delay({});
  }

  async updateRecovery() {
    return this.delay({});
  }

  async createRecoveryOTP(email: string, phrase?: boolean) {
    return this.delay({
      userId: this.user?.$id ?? "preview-user",
      secret: "",
      phrase: phrase ? "calm-river" : "",
      email,
    });
  }

  async updateRecoveryOTP(_userId: string, _secret: string, _password: string) {
    return this.delay({});
  }

  async createEmailVerification() {
    return this.delay({});
  }

  async updateEmailVerification() {
    return this.delay(() => {
      if (this.user) this.user.emailVerification = true;
      return {};
    });
  }

  async createEmailVerificationOTP(phrase?: boolean) {
    this.requireUser();
    return this.delay({
      userId: this.user!.$id,
      secret: "",
      phrase: phrase ? "calm-river" : "",
    });
  }

  async updateEmailVerificationOTP() {
    return this.delay(() => {
      if (this.user) this.user.emailVerification = true;
      return {};
    });
  }

  async createPhoneVerification() {
    return this.delay({});
  }

  async updatePhoneVerification() {
    return this.delay(() => {
      if (this.user) this.user.phoneVerification = true;
      return {};
    });
  }

  async createIdTokenSession(params: { provider: string; idToken: string; name?: string }) {
    return this.delay(() => {
      this.makeUser({
        email: this.seed.email,
        name: params.name?.trim() || this.seed.name,
      });
      this.afterPrimarySignIn();
      return this.sessions[0];
    });
  }

  async listConsents() {
    return this.delay(() => {
      this.requireUser();
      return { total: 0, consents: [] as never[] };
    });
  }

  async deleteConsent() {
    return this.delay({});
  }

  async getPrefs() {
    return this.delay(() => ({ ...(this.requireUser().prefs as object) }) as Models.Preferences);
  }

  async updatePrefs(prefs: object) {
    return this.delay(() => {
      const u = this.requireUser();
      u.prefs = { ...prefs } as Models.Preferences;
      return u;
    });
  }

  async updateName(name: string) {
    return this.delay(() => {
      this.requireUser().name = name;
      return this.user!;
    });
  }

  async updateEmail(email: string) {
    return this.delay(() => {
      const u = this.requireUser();
      u.email = email;
      u.emailVerification = false;
      u.passwordUpdate = now();
      return u;
    });
  }

  async updatePhone(phone: string) {
    return this.delay(() => {
      const u = this.requireUser();
      u.phone = phone;
      u.phoneVerification = false;
      return u;
    });
  }

  async updatePassword() {
    return this.delay(() => {
      const u = this.requireUser();
      u.passwordUpdate = now();
      return u;
    });
  }

  async updateStatus() {
    return this.delay(() => {
      this.requireUser();
      this.reset();
      this.mfaEnabled = false;
      this.totpEnrolled = false;
      this.recoveryCodes = [];
      return {};
    });
  }

  // ───────────────────────── sessions ─────────────────────────

  async listSessions() {
    return this.delay(() => {
      this.requireUser();
      return { total: this.sessions.length, sessions: this.sessions };
    });
  }

  async deleteSession(sessionId = "current") {
    return this.delay(() => {
      const target = this.sessions.find((s) => s.$id === sessionId);
      if (sessionId === "current" || target?.current) {
        this.reset();
      } else {
        this.sessions = this.sessions.filter((s) => s.$id !== sessionId);
      }
      return {};
    });
  }

  async deleteSessions() {
    return this.delay(() => {
      this.reset();
      return {};
    });
  }

  async listIdentities() {
    return this.delay(() => {
      this.requireUser();
      return { total: this.identities.length, identities: this.identities };
    });
  }

  async deleteIdentity(identityId: string) {
    return this.delay(() => {
      this.identities = this.identities.filter((i) => i.$id !== identityId);
      return {};
    });
  }

  async listLogs() {
    return this.delay(() => {
      this.requireUser();
      return { total: this.logs.length, logs: this.logs };
    });
  }

  // ───────────────────────── MFA ─────────────────────────

  async listMFAFactors(): Promise<Models.MfaFactors> {
    return this.delay({
      totp: this.totpEnrolled,
      email: !!this.user?.emailVerification,
      phone: !!this.user?.phoneVerification,
      recoveryCode: this.recoveryCodes.length > 0,
      custom: false,
    } as Models.MfaFactors);
  }

  async createMFAChallenge(): Promise<Models.MfaChallenge> {
    return this.delay({ $id: id(), $createdAt: now(), userId: "preview-user", expire: "" });
  }

  async updateMFAChallenge() {
    return this.delay(() => {
      this.mfaPending = false;
      this.lastChallenge = Date.now();
      return this.sessions[0];
    });
  }

  async updateMFA(mfa: boolean) {
    return this.delay(() => {
      const u = this.requireUser();
      this.mfaEnabled = mfa;
      u.mfa = mfa;
      return u;
    });
  }

  async createMFAAuthenticator(): Promise<Models.MfaType> {
    return this.delay(() => {
      const secret = "JBSWY3DPEHPK3PXP";
      this.pendingAuthenticator = {
        secret,
        uri: `otpauth://totp/Preview:${encodeURIComponent(this.user?.email ?? "user")}?secret=${secret}&issuer=Preview`,
      };
      return this.pendingAuthenticator;
    });
  }

  async updateMFAAuthenticator() {
    return this.delay(() => {
      this.totpEnrolled = true;
      this.pendingAuthenticator = null;
      this.lastChallenge = Date.now();
      return this.requireUser();
    });
  }

  async deleteMFAAuthenticator() {
    return this.delay(() => {
      this.requireRecentChallenge();
      this.totpEnrolled = false;
      return {};
    });
  }

  async createMFARecoveryCodes(): Promise<Models.MfaRecoveryCodes> {
    return this.delay(() => {
      if (this.recoveryCodes.length > 0) {
        throw err("user_recovery_codes_already_exists", "Recovery codes already generated.", 409);
      }
      this.recoveryCodes = Array.from({ length: 6 }, code);
      return { recoveryCodes: this.recoveryCodes };
    });
  }

  async getMFARecoveryCodes(): Promise<Models.MfaRecoveryCodes> {
    return this.delay(() => {
      this.requireRecentChallenge();
      return { recoveryCodes: this.recoveryCodes };
    });
  }

  async updateMFARecoveryCodes(): Promise<Models.MfaRecoveryCodes> {
    return this.delay(() => {
      this.requireRecentChallenge();
      this.recoveryCodes = Array.from({ length: 6 }, code);
      return { recoveryCodes: this.recoveryCodes };
    });
  }

  /** Forget everything, as a sign out would. */
  reset(): void {
    this.user = null;
    this.mfaPending = false;
    this.sessions = [];
    this.identities = [];
    this.logs = [];
    this.tokens.clear();
  }
}

/** A deterministic, QR-looking placeholder rendered while previewing authenticator setup. */
export function previewQrDataUrl(seed: string): string {
  let h = 2166136261;
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  for (const c of seed) h = (h ^ c.charCodeAt(0)) * 16777619;
  const n = 25;
  let rects = "";
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      if (!inFinder && rnd() < 0.45) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#000">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}${rects}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
