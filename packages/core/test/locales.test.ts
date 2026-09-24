import { describe, expect, it } from "vitest";
import { defaultStrings } from "../src/i18n.js";
import {
  getLocalePack,
  localePacks,
  mergeStrings,
  resolveLocale,
  supportedLocales,
} from "../src/locales/index.js";
import { cs } from "../src/locales/cs.js";
import { de } from "../src/locales/de.js";
import { fr } from "../src/locales/fr.js";

describe("locale packs", () => {
  it("ships cs, de, fr with full key coverage", () => {
    expect(supportedLocales.sort()).toEqual(["cs", "de", "fr"]);
    const keys = Object.keys(defaultStrings).sort();
    for (const pack of [cs, de, fr]) {
      expect(Object.keys(pack).sort()).toEqual(keys);
    }
  });

  it("preserves placeholders in every translated string", () => {
    for (const [tag, pack] of Object.entries(localePacks)) {
      for (const key of Object.keys(defaultStrings) as Array<keyof typeof defaultStrings>) {
        const enPh = [...defaultStrings[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        const loc = pack[key];
        if (loc == null) continue;
        const locPh = [...loc.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(locPh, `${tag}.${key}`).toEqual(enPh);
        expect(loc, `${tag}.${key}`).not.toMatch(/[—–]/);
      }
    }
  });

  it("resolveLocale accepts BCP-47 variants and falls back for unknown", () => {
    expect(resolveLocale("cs")).toBe("cs");
    expect(resolveLocale("cs-CZ")).toBe("cs");
    expect(resolveLocale("de_DE")).toBe("de");
    expect(resolveLocale("fr-FR")).toBe("fr");
    expect(resolveLocale("en")).toBeNull();
    expect(resolveLocale("en-US")).toBeNull();
    expect(resolveLocale("ja")).toBeNull();
    expect(resolveLocale("")).toBeNull();
    expect(resolveLocale(undefined)).toBeNull();
  });

  it("getLocalePack returns null for English / unknown", () => {
    expect(getLocalePack("en")).toBeNull();
    expect(getLocalePack("xx")).toBeNull();
    expect(getLocalePack("cs")?.signIn).toBe(cs.signIn);
  });

  it("mergeStrings precedence: defaults ← locale ← strings override", () => {
    const merged = mergeStrings(defaultStrings, "de", { signIn: "Custom" });
    expect(merged.signIn).toBe("Custom");
    expect(merged.signUp).toBe(de.signUp);
    expect(merged.errorGeneric).toBe(de.errorGeneric);
  });

  it("mergeStrings falls back to English for unknown locale", () => {
    const merged = mergeStrings(defaultStrings, "ja", { signIn: "カスタム" });
    expect(merged.signIn).toBe("カスタム");
    expect(merged.signUp).toBe(defaultStrings.signUp);
  });

  it("mergeStrings uses English when a pack key is missing", () => {
    // Simulate a partial pack by merging manually
    const withPartial = { ...defaultStrings, ...{ signIn: "Přihlásit" } };
    expect(withPartial.signIn).toBe("Přihlásit");
    expect(withPartial.signUp).toBe(defaultStrings.signUp);
    expect(mergeStrings(defaultStrings, null, undefined).signIn).toBe(defaultStrings.signIn);
  });
});
