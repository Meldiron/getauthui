import type { AuthUIStrings } from "./types.js";

export interface AuthUIError {
  message: string;
  type: string;
  code: number;
}

/** Appwrite error `type` strings the UI reacts to. */
export const ErrorTypes = {
  moreFactorsRequired: "user_more_factors_required",
  invalidCredentials: "user_invalid_credentials",
  userAlreadyExists: "user_already_exists",
  emailAlreadyExists: "user_email_already_exists",
  phoneAlreadyExists: "user_phone_already_exists",
  userBlocked: "user_blocked",
  rateLimit: "general_rate_limit_exceeded",
  invalidToken: "user_invalid_token",
  invalidCode: "user_invalid_code",
  passwordMismatch: "user_password_mismatch",
  passwordRecentlyUsed: "password_recently_used",
  passwordPersonalData: "password_personal_data",
  passwordWeak: "user_password_weak",
  passwordPwned: "password_pwned",
  challengeRequired: "user_challenge_required",
  recoveryCodesExist: "user_recovery_codes_already_exists",
  recoveryCodesNotFound: "user_recovery_codes_not_found",
  authenticatorNotFound: "user_authenticator_not_found",
  routeNotFound: "general_route_not_found",
  emailAlreadyVerified: "user_email_already_verified",
  sessionNotFound: "user_session_not_found",
  wafChallenged: "waf_request_challenged",
  sessionAlreadyExists: "user_session_already_exists",
  oauthUnauthorized: "user_oauth2_unauthorized",
  oauthBadRequest: "user_oauth2_bad_request",
  unauthorized: "general_unauthorized_scope",
  userUnauthorized: "user_unauthorized",
  authMethodUnsupported: "user_auth_method_unsupported",
  countMaxExceeded: "user_count_exceeded",
  targetAlreadyExists: "user_target_already_exists",
  argumentInvalid: "general_argument_invalid",
} as const;

export function toAuthUIError(err: unknown): AuthUIError {
  if (err && typeof err === "object") {
    const e = err as { message?: string; type?: string; code?: number };
    let message = typeof e.message === "string" ? e.message : "Unknown error";
    // Appwrite Cloud sometimes returns HTML 404 bodies (e.g. /account/logs).
    if (/^\s*<(!doctype|html)/i.test(message)) message = "";
    return {
      message,
      type: typeof e.type === "string" ? e.type : "",
      code: typeof e.code === "number" ? e.code : 0,
    };
  }
  return { message: String(err), type: "", code: 0 };
}

export function isErrorType(err: unknown, type: string): boolean {
  return toAuthUIError(err).type === type;
}

/**
 * Pick a friendly message for an error, falling back to Appwrite's own text.
 * Pass `context: "code"` when the user typed a one-time code so an invalid
 * token reads as "wrong code" instead of "expired link".
 */
export function describeError(
  err: unknown,
  s: AuthUIStrings,
  context: "link" | "code" = "link"
): string {
  const e = toAuthUIError(err);
  switch (e.type) {
    case ErrorTypes.invalidCredentials:
      return s.errorInvalidCredentials;
    case ErrorTypes.userAlreadyExists:
    case ErrorTypes.emailAlreadyExists:
    case ErrorTypes.phoneAlreadyExists:
      return s.errorUserExists;
    case ErrorTypes.userBlocked:
      return s.errorUserBlocked;
    case ErrorTypes.rateLimit:
      return s.errorRateLimit;
    case ErrorTypes.invalidToken:
      return context === "code" ? s.errorInvalidCode : s.errorInvalidToken;
    case ErrorTypes.invalidCode:
      return s.errorInvalidCode;
    case ErrorTypes.passwordMismatch:
      return s.errorPasswordMismatch;
    case ErrorTypes.passwordRecentlyUsed:
      return s.errorPasswordRecentlyUsed;
    case ErrorTypes.passwordPersonalData:
      return s.errorPasswordPersonalData;
    case ErrorTypes.passwordWeak:
      return s.errorPasswordWeak;
    case ErrorTypes.passwordPwned:
      return s.errorPasswordPwned;
    case ErrorTypes.challengeRequired:
      return s.errorChallengeRequired;
    case ErrorTypes.sessionAlreadyExists:
      return s.errorSessionExists;
    case ErrorTypes.oauthUnauthorized:
    case ErrorTypes.oauthBadRequest:
      return s.errorOAuth;
    case ErrorTypes.authMethodUnsupported:
      return s.errorMethodDisabled;
  }
  if (e.type === ErrorTypes.argumentInvalid || /Invalid `\w+` param/i.test(e.message)) {
    const param = e.message.match(/Invalid `([^`]+)` param/i)?.[1]?.toLowerCase();
    if (param === "email") return s.errorInvalidEmail;
    if (param === "password") return s.errorInvalidPassword;
    if (param === "phone") return s.errorInvalidPhone;
    if (param === "name") return s.errorInvalidName;
    return s.errorGeneric;
  }
  if (e.code === 0 && /fetch|network/i.test(e.message)) return s.errorNetwork;
  // Never surface raw messages that still contain Appwrite backtick param markers.
  if (/Invalid `\w+` param/i.test(e.message)) return s.errorGeneric;
  if (/^\s*<(!doctype|html)/i.test(e.message)) return s.errorGeneric;
  return e.message || s.errorGeneric;
}

