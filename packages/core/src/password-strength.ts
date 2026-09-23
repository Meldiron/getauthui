/** Client-only password strength (length and character classes). Breach checks live in `pwned-password.ts`. */

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthLabelKey =
  | "passwordStrengthTooWeak"
  | "passwordStrengthWeak"
  | "passwordStrengthFair"
  | "passwordStrengthStrong"
  | "passwordStrengthVeryStrong";

export interface PasswordStrength {
  /** 0 (empty) … 4 (very strong). */
  level: PasswordStrengthLevel;
  /** 0–100 for the meter fill. */
  percent: number;
  labelKey: PasswordStrengthLabelKey;
  checks: {
    length: boolean;
    long: boolean;
    lower: boolean;
    upper: boolean;
    number: boolean;
    symbol: boolean;
  };
}

/** Score a password for the live strength meter. */
export function scorePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    long: password.length >= 12,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return { level: 0, percent: 0, labelKey: "passwordStrengthTooWeak", checks };
  }

  let points = 0;
  if (checks.length) points += 1;
  if (checks.long) points += 1;
  if (checks.lower && checks.upper) points += 1;
  if (checks.number) points += 1;
  if (checks.symbol) points += 1;

  // Short passwords never look strong even if they mix character classes.
  if (password.length < 8) points = Math.min(points, 1);
  else if (password.length < 10) points = Math.min(points, 3);

  let level: PasswordStrengthLevel;
  let labelKey: PasswordStrengthLabelKey;
  if (!checks.length || points <= 1) {
    level = 1;
    labelKey = "passwordStrengthTooWeak";
  } else if (points === 2) {
    level = 2;
    labelKey = "passwordStrengthWeak";
  } else if (points === 3) {
    level = 3;
    labelKey = "passwordStrengthFair";
  } else if (
    points >= 5 &&
    checks.long &&
    checks.lower &&
    checks.upper &&
    checks.number &&
    checks.symbol
  ) {
    level = 4;
    labelKey = "passwordStrengthVeryStrong";
  } else {
    level = 4;
    labelKey = "passwordStrengthStrong";
  }

  return { level, percent: level * 25, labelKey, checks };
}
