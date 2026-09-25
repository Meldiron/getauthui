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
   * Built-in locale pack (BCP-47 short tag). Shipped: `en` (default), `cs`, `de`, `fr`.
   * Merge order: English defaults ← locale pack ← `strings` override.
   * Unknown tags fall back to English.
   */
  locale?: string;
  /**
   * When true, prompt Google One Tap on signed-out sign-in / sign-up mounts.
   * Requires `googleClientId`. Soft-fails if GIS is blocked or the user dismisses.
   * Does not replace the Google OAuth button. Default: false.
   */
  oneTap?: boolean;
  /**
   * Google OAuth 2.0 Web client ID for One Tap (from Google Cloud Console).
   * Appwrite stores its own Google provider credentials server-side and does not
   * expose them to the client, so this must be set explicitly when `oneTap` is on.
   */
  googleClientId?: string;
  /**
   * When true, sign-in shows email then Continue, then password (Clerk-style).
   * OAuth and passwordless stay on step 1. Sign-up keeps email+password together.
   * Default: false.
   */
  identifierFirst?: boolean;
  /**
   * Preview mode: no requests are made. Any email, password or code is accepted and a
   * sample user with sessions, identities, MFA and logs is used, so every screen can be
   * explored in a playground, design review or Storybook. Never enable in production.
   */
  preview?: boolean;
}

/** Minimal OAuth2 app branding from GET /v1/apps/{appId} (Apps.get). */
export interface AuthUIApp {
  $id: string;
  name: string;
  logoUri?: string;
  tagline?: string;
}

/**
 * Account activity log row. Models.Log was removed in appwrite@28; keep a local
 * shape for preview and soft-detect of /account/logs on older servers.
 */
export interface AuthUILog {
  event: string;
  time: string;
  ip?: string;
  clientName?: string;
  osName?: string;
  countryName?: string;
  countryCode?: string;
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
  /** Prefer OTP recovery: primary CTA on forgot-password. */
  sendResetCode: string;
  resendResetLink: string;
  requestNewLink: string;
  /** In-panel recovery OTP sent confirmation. */
  resetCodeSent: string;
  /** After entering a recovery OTP, continue to choose a new password. */
  continueToNewPassword: string;
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
  /** In-challenge link to switch to a recovery code without going Back. */
  mfaUseRecoveryCodeInstead: string;
  /** Factor-specific hint under the MFA code field (authenticator). */
  mfaHintTotp: string;
  /** Factor-specific hint under the MFA code field (email). */
  mfaHintEmail: string;
  /** Factor-specific hint under the MFA code field (phone). */
  mfaHintPhone: string;
  /** Factor-specific hint under the MFA code field (recovery code). */
  mfaHintRecoveryCode: string;
  recoveryCode: string;
  account: string;
  profile: string;
  security: string;
  sessions: string;
  connections: string;
  activity: string;
  /** OAuth2 apps the user has authorized (third-party consents). */
  consents: string;
  dangerZone: string;
  verified: string;
  unverified: string;
  verifyEmail: string;
  verificationResendIn: string;
  verificationSent: string;
  /** In-panel email verification OTP was sent. */
  emailVerificationCodeSent: string;
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
  /** Step-2 hint while verifying the authenticator OTP. */
  authenticatorVerifyHint: string;
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
  /** Checkbox label: user confirms they saved view-once recovery codes before Done. */
  recoveryCodesSavedConfirm: string;
  download: string;
  print: string;
  currentSession: string;
  /** Session expiry label, `{date}` = formatted expire time. */
  sessionExpires: string;
  /** Session created label, `{date}` = formatted created time. */
  sessionCreated: string;
  /** Identity / OAuth connection created label, `{date}` = formatted time. */
  identityCreated: string;
  /** OAuth access-token expiry label, `{date}` = formatted time. */
  identityExpires: string;
  /** Shown when an identity has no access-token expiry. */
  identityExpiresNone: string;
  /** Relative time: under a minute from now. */
  relativeJustNow: string;
  /** Relative past, `{count}` + `{unit}` e.g. "5 minutes ago". */
  relativePast: string;
  /** Relative future, `{count}` + `{unit}` e.g. "in 3 days". */
  relativeFuture: string;
  relativeUnitMinute: string;
  relativeUnitMinutes: string;
  relativeUnitHour: string;
  relativeUnitHours: string;
  relativeUnitDay: string;
  relativeUnitDays: string;
  relativeUnitWeek: string;
  relativeUnitWeeks: string;
  relativeUnitMonth: string;
  relativeUnitMonths: string;
  relativeUnitYear: string;
  relativeUnitYears: string;
  /** Tooltip / accessible label for MFA factors on a session. */
  sessionMfaFactors: string;
  signOutSession: string;
  signOutAllSessions: string;
  signOutAllSessionsDescription: string;
  noConnections: string;
  noConnectionsDescription: string;
  disconnect: string;
  connectProvider: string;
  noConsents: string;
  noConsentsDescription: string;
  revokeConsent: string;
  consentScopes: string;
  consentCreated: string;
  noActivity: string;
  noActivityDescription: string;
  noSessions: string;
  noSessionsDescription: string;
  /** Label for the account $id copy control on Profile. */
  accountId: string;
  /** Short help under Account ID. */
  accountIdDescription: string;
  /** Accessible name for the Account ID copy button. */
  copyAccountId: string;
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
  teamInviteAccepted: string;
  teamInviteAcceptedGeneric: string;
  createTeam: string;
  createTeamButton: string;
  teamNamePlaceholder: string;
  teamCreated: string;
  leaveTeam: string;
  leaveTeamConfirm: string;
  teamLeft: string;
  inviteMember: string;
  inviteEmailPlaceholder: string;
  inviteSend: string;
  inviteSent: string;
  manageTeams: string;
  teamMembers: string;
  hideTeamMembers: string;
  teamRoleOwner: string;
  teamMemberPending: string;
  teamMemberActive: string;
  teamJoined: string;
  noTeamMembers: string;
  removeMember: string;
  removeMemberConfirm: string;
  teamsDescription: string;
  consentTokens: string;
  consentTokenIssued: string;
  consentTokenExpires: string;
  consentTokenExpired: string;
  revokeConsentToken: string;
  noConsentTokens: string;
  showConsentTokens: string;
  hideConsentTokens: string;
  teamsEmptyDescription: string;
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
  /** Accessible label for the phone country / dial-code picker. */
  phoneCountry: string;
  /** Placeholder for the national phone number field (no country code). */
  phoneNationalPlaceholder: string;
  /** Search field in the phone country list. */
  phoneCountrySearch: string;
  /** No countries match the search query. */
  phoneCountryEmpty: string;
}
