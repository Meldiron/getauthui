import type { Models } from "appwrite";
import type { MfaFactor } from "./store.js";
import type { AuthUIStrings } from "./types.js";

/** Vibes priority: totp, then email, phone, recovery code. */
const FACTOR_ORDER: MfaFactor[] = ["totp", "email", "phone", "recoverycode"];

const HINT_KEYS: Record<MfaFactor, keyof AuthUIStrings> = {
  totp: "mfaHintTotp",
  email: "mfaHintEmail",
  phone: "mfaHintPhone",
  recoverycode: "mfaHintRecoveryCode",
};

/** Factors that are actually enabled on the account (no phantom defaults). */
export function availableMfaFactors(factors: Models.MfaFactors): MfaFactor[] {
  const enabled: Record<MfaFactor, boolean> = {
    totp: !!factors.totp,
    email: !!factors.email,
    phone: !!factors.phone,
    recoverycode: !!factors.recoveryCode,
  };
  return FACTOR_ORDER.filter((f) => enabled[f]);
}

/** Default challenge type matching Vibes getDefaultChallengeType. */
export function defaultMfaFactor(factors: Models.MfaFactors): MfaFactor | null {
  return availableMfaFactors(factors)[0] ?? null;
}

/** i18n key for the short factor-specific hint under the MFA code field. */
export function mfaFactorHintKey(factor: MfaFactor): keyof AuthUIStrings {
  return HINT_KEYS[factor];
}

/** Other enabled factors the user can switch to without leaving the challenge. */
export function alternateMfaFactors(factors: Models.MfaFactors, current: MfaFactor): MfaFactor[] {
  return availableMfaFactors(factors).filter((f) => f !== current);
}
