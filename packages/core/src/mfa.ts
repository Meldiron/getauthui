import type { Models } from "appwrite";
import type { MfaFactor } from "./store.js";

/** Vibes priority: totp, then email, phone, recovery code. */
const FACTOR_ORDER: MfaFactor[] = ["totp", "email", "phone", "recoverycode"];

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
