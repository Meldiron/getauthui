import type { AuthUIStrings } from "../types.js";
import { cs } from "./cs.js";
import { de } from "./de.js";
import { fr } from "./fr.js";

/** Built-in locale packs keyed by BCP-47 short tag (lowercase). */
export const localePacks: Record<string, Partial<AuthUIStrings>> = {
  cs,
  de,
  fr,
};

/** Locales shipped with Auth UI (excluding English defaults). */
export const supportedLocales = Object.keys(localePacks) as Array<"cs" | "de" | "fr">;

/**
 * Normalize a locale tag to a pack key.
 * Accepts `cs`, `cs-CZ`, `de_DE`, etc. Unknown tags return null (caller falls back to English).
 */
export function resolveLocale(locale: string | undefined | null): string | null {
  if (!locale) return null;
  const raw = locale.trim().toLowerCase().replace(/_/g, "-");
  if (!raw) return null;
  if (raw === "en" || raw.startsWith("en-")) return null; // English is the default base
  const primary = raw.split("-")[0]!;
  if (primary in localePacks) return primary;
  if (raw in localePacks) return raw;
  return null;
}

/** Return the pack for a locale tag, or null when falling back to English. */
export function getLocalePack(locale: string | undefined | null): Partial<AuthUIStrings> | null {
  const key = resolveLocale(locale);
  return key ? (localePacks[key] ?? null) : null;
}

/**
 * Merge string layers: English defaults ← locale pack ← user `strings` override.
 * Missing keys in a pack fall through to English; unknown locales use English only.
 */
export function mergeStrings(
  defaults: AuthUIStrings,
  locale: string | undefined | null,
  overrides?: Partial<AuthUIStrings> | null
): AuthUIStrings {
  const pack = getLocalePack(locale);
  return {
    ...defaults,
    ...(pack ?? {}),
    ...(overrides ?? {}),
  };
}
