import type { Models } from "appwrite";

/** Every OAuth2 provider slug Appwrite understands. */
export type OAuthProviderName =
  | "amazon"
  | "apple"
  | "appwrite"
  | "auth0"
  | "authentik"
  | "autodesk"
  | "bitbucket"
  | "bitly"
  | "box"
  | "cloudflare"
  | "dailymotion"
  | "discord"
  | "disqus"
  | "dropbox"
  | "etsy"
  | "facebook"
  | "figma"
  | "fusionauth"
  | "github"
  | "gitlab"
  | "google"
  | "huggingface"
  | "kakao"
  | "keycloak"
  | "kick"
  | "linkedin"
  | "microsoft"
  | "notion"
  | "oidc"
  | "okta"
  | "paypal"
  | "paypalSandbox"
  | "podio"
  | "resend"
  | "salesforce"
  | "slack"
  | "spotify"
  | "stripe"
  | "tiktok"
  | "tradeshift"
  | "tradeshiftBox"
  | "twitch"
  | "wordpress"
  | "x"
  | "yahoo"
  | "yammer"
  | "yandex"
  | "zoho"
  | "zoom";

/** Screens the widget can show. */
export type AuthUIView =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "magic-url"
  | "email-otp"
  | "phone"
  | "mfa"
  | "account";

export type AuthUITheme = "light" | "dark" | "auto";
export type AuthUIRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";

/** How OAuth provider buttons are laid out. */
export type AuthUIOauthLayout = "stack" | "accordion" | "icon" | "horizontal";

export interface AuthUIMethods {
  /** Email + password sign in and sign up. Default: true. */
  emailPassword?: boolean;
  /** Passwordless link sent by email. Default: false. */
  magicUrl?: boolean;
  /** Passwordless 6-digit code sent by email. Default: false. */
  emailOtp?: boolean;
  /** SMS one-time code. Default: false. */
  phone?: boolean;
  /** "Continue as guest" anonymous session. Default: false. */
  anonymous?: boolean;
  /** OAuth2 providers to show, in order. Default: []. */
  oauth?: OAuthProviderName[];
  /**
   * OAuth button layout. Default: `stack` for 1–2 providers, `accordion` for 3+.
   * `icon` / `horizontal` = compact icon-only row. `stack` = full-width labeled buttons.
   */
  oauthLayout?: AuthUIOauthLayout;
}

export interface AuthUIBranding {
  /** Product name shown in headings. */
  name?: string;
  /** Logo URL rendered above the form. */
  logo?: string;
  /** Color scheme. "auto" follows prefers-color-scheme and an `html.dark` class. Default: "auto". */
  theme?: AuthUITheme;
  /** Corner radius scale. Default: "md". */
  radius?: AuthUIRadius;
  /** Any CSS color for primary buttons. Default: near-black / near-white. */
  primary?: string;
  /** Text color on primary buttons. */
  primaryForeground?: string;
}

export interface AuthUILegal {
  termsUrl?: string;
  privacyUrl?: string;
  /**
   * When true, sign-up shows a required checkbox that must be checked before
   * email sign-up or OAuth. Client-only gate; nothing is sent to Appwrite.
   */
  requireAcceptance?: boolean;
}

/** Custom item in the <authui-user-button> account menu. */
export interface AuthUIMenuItem {
  /** Visible label (integrator-supplied; not passed through t()). */
  label: string;
  /** Navigate here on click (renders as a link). */
  href?: string;
  /** Link target, e.g. "_blank". */
  target?: string;
  /** Opaque id; clicking fires `authui-menu-action` with `{ actionId }`. */
  actionId?: string;
}

export interface AuthUIConfig {
  /** Appwrite API endpoint, e.g. https://cloud.appwrite.io/v1 */
  endpoint: string;
  /** Appwrite project ID. */
  project: string;
  /**
   * Absolute URL the user returns to after OAuth, magic URL, recovery and verification emails.
   * Must be on a hostname registered as a web platform in your Appwrite project.
   * Default: the current page without query string or hash.
   */
  redirectUrl?: string;
  /** Where to navigate after a successful sign in. If omitted the page is not changed. */
  successUrl?: string;
  methods?: AuthUIMethods;
  /** Show the "Sign up" option. Default: true. */
  signUp?: boolean;
  /** Ask for a display name during sign up. Default: true. */
  requireName?: boolean;
  /** Let users enroll and manage MFA from the account screen. Default: true. */
  mfa?: boolean;
  /** Request a security phrase for email OTP and magic URL. Default: true. */
  securityPhrase?: boolean;
  /** Extra OAuth scopes per provider. */
  oauthScopes?: Partial<Record<OAuthProviderName, string[]>>;
  branding?: AuthUIBranding;
  legal?: AuthUILegal;
  /** Override any UI string. */
  strings?: Partial<AuthUIStrings>;
  /**
   * Preview mode: no requests are made. Any email, password or code is accepted and a
   * sample user with sessions, identities, MFA and logs is used, so every screen can be
   * explored in a playground, design review or Storybook. Never enable in production.
   */
  preview?: boolean;
}

export type AuthUIStatus = "loading" | "signed-out" | "signed-in" | "mfa-required";

/** Something the widget must finish after a redirect, e.g. password reset. */
export type AuthUIPendingAction =
  | { type: "reset-password"; userId: string; secret: string }
  | { type: "verify-email"; userId: string; secret: string }
  | { type: "oauth-failed" }
  | { type: "notice"; message: string; tone: "success" | "error" | "info" };

export interface AuthUIState {
  status: AuthUIStatus;
  user: Models.User<Models.Preferences> | null;
  /** Factors available to complete MFA when status is "mfa-required". */
  mfaFactors: Models.MfaFactors | null;
  pending: AuthUIPendingAction | null;
  configured: boolean;
  /**
   * Developer-facing configuration problem (wrong project, origin, endpoint, or
   * incomplete config). When set, sign-in shows this instead of a form.
   */
  configError: string | null;
}

export type AuthUIEventMap = {
  change: AuthUIState;
  "signed-in": Models.User<Models.Preferences>;
  "signed-out": undefined;
  error: { message: string; type: string; code: number };
  "active-team": { teamId: string | null; team: { $id: string; name: string } | null };
};

export type AuthUIEventName = keyof AuthUIEventMap;

export interface AuthUIStrings {
  signIn: string;
  dialogSignIn: string;
  signUp: string;
  signOut: string;
  continueAsGuest: string;
  email: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  newPassword: string;
  confirmPassword: string;
  name: string;
  phone: string;
  code: string;
  forgotPassword: string;
  noAccount: string;
  haveAccount: string;
  or: string;
  continueWith: string;
  continueWithEmail: string;
  sendEmailCode: string;
  continueWithPhone: string;
  sendMagicLink: string;
  sendCode: string;
  resendCode: string;
  resendMagicLink: string;
  useDifferentEmail: string;
  useDifferentPhone: string;
  verifyCode: string;
  magicLinkSent: string;
  codeSent: string;
  securityPhrase: string;
  securityPhraseHint: string;
  back: string;
  cancel: string;
  save: string;
  update: string;
  remove: string;
  close: string;
  resetPassword: string;
  resetLinkSent: string;
  passwordUpdated: string;
  /** Account Security: password changed while signed in. */
  passwordChanged: string;
  sendResetLink: string;
  requestNewLink: string;
  agreeTo: string;
  terms: string;
  privacy: string;
  and: string;
  welcomeBack: string;
  createAccount: string;
  signInTitle: string;
  signUpTitle: string;
  mfaTitle: string;
  mfaDescription: string;
  mfaUseAuthenticator: string;
  mfaUseEmail: string;
  mfaUsePhone: string;
  mfaUseRecoveryCode: string;
  recoveryCode: string;
  account: string;
  profile: string;
  security: string;
  sessions: string;
  connections: string;
  activity: string;
  dangerZone: string;
  verified: string;
  unverified: string;
  verifyEmail: string;
  verificationResendIn: string;
  verificationSent: string;
  emailVerified: string;
  changePassword: string;
  currentPassword: string;
  twoFactor: string;
  mfaBadge: string;
  twoFactorDescription: string;
  mfaNoFactorWarning: string;
  enable: string;
  disable: string;
  authenticatorApp: string;
  authenticatorAdd: string;
  authenticatorScan: string;
  qrCodeAlt: string;
  authenticatorManual: string;
  authenticatorCopyKey: string;
  authenticatorVerify: string;
  recoveryCodes: string;
  viewRecoveryCodes: string;
  recoveryCodesDescription: string;
  recoveryCodesOnceHint: string;
  generateRecoveryCodes: string;
  regenerateRecoveryCodes: string;
  recoveryCodesWarning: string;
  currentSession: string;
  /** Session expiry label, `{date}` = formatted expire time. */
  sessionExpires: string;
  /** Session created label, `{date}` = formatted created time. */
  sessionCreated: string;
  /** Tooltip / accessible label for MFA factors on a session. */
  sessionMfaFactors: string;
  signOutSession: string;
  signOutAllSessions: string;
  signOutAllSessionsDescription: string;
  noConnections: string;
  noConnectionsDescription: string;
  disconnect: string;
  connectProvider: string;
  noActivity: string;
  noActivityDescription: string;
  noSessions: string;
  noSessionsDescription: string;
  deleteAccount: string;
  deleteAccountDescription: string;
  deleteAccountConfirm: string;
  loading: string;
  copied: string;
  copyFailed: string;
  copy: string;
  done: string;
  nameUpdated: string;
  emailUpdated: string;
  phoneUpdated: string;
  phoneVerified: string;
  authenticatorAdded: string;
  accountConverted: string;
  enabled: string;
  disabled: string;
  createPassword: string;
  createPasswordHint: string;
  errorCurrentPassword: string;
  errorGeneric: string;
  errorInvalidCredentials: string;
  errorInvalidEmail: string;
  errorInvalidPassword: string;
  errorInvalidPhone: string;
  errorInvalidName: string;
  errorUserExists: string;
  errorUserBlocked: string;
  errorRateLimit: string;
  errorInvalidToken: string;
  errorInvalidCode: string;
  errorPasswordMismatch: string;
  errorPasswordRecentlyUsed: string;
  errorPasswordPersonalData: string;
  errorPasswordWeak: string;
  errorPasswordPwned: string;
  errorChallengeRequired: string;
  errorSessionExists: string;
  errorOAuth: string;
  errorNetwork: string;
  errorMethodDisabled: string;
  errorNotConfigured: string;
  /** Incomplete <authui-config> / init (missing endpoint or project). */
  errorConfigIncomplete: string;
  /** Wrong project, origin, endpoint, or unreachable API during the first refresh. */
  errorConfig: string;
  /** Hint when the endpoint looks like it is missing /v1. */
  errorConfigEndpoint: string;
  passwordHint: string;
  /** Live password strength meter labels. */
  passwordStrengthLabel: string;
  passwordStrengthTooWeak: string;
  passwordStrengthWeak: string;
  passwordStrengthFair: string;
  passwordStrengthStrong: string;
  passwordStrengthVeryStrong: string;
  /** Badge on the last-used sign-in method. */
  lastUsed: string;
  teamsLabel: string;
  noTeams: string;
  activeTeam: string;
  signedInAs: string;
  manageAccount: string;
  dialogAccount: string;
  continue: string;
  provider: string;
  lastActive: string;
  guestAccount: string;
  guestAccountDescription: string;
  preview: string;
  /** Prefix for the required legal checkbox on sign-up, before terms/privacy links. */
  acceptLegal: string;
  /** Shown when sign-up is blocked because the legal checkbox is unchecked. */
  errorLegalRequired: string;
}
