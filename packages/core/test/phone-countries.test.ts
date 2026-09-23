import { describe, expect, it } from "vitest";
import { defaultPhoneCountryIso, flagEmoji, parsePhone, toE164 } from "../src/phone-countries.js";

describe("flagEmoji", () => {
  it("builds regional-indicator flags", () => {
    expect(flagEmoji("US")).toBe("🇺🇸");
    expect(flagEmoji("gb")).toBe("🇬🇧");
  });
});

describe("defaultPhoneCountryIso", () => {
  it("reads the region from a language tag", () => {
    expect(defaultPhoneCountryIso("cs-CZ")).toBe("CZ");
    expect(defaultPhoneCountryIso("en")).toBe("US");
  });
});

describe("toE164", () => {
  it("composes dial + national digits", () => {
    expect(toE164("US", "4155552671")).toBe("+14155552671");
    expect(toE164("CZ", "601 123 456")).toBe("+420601123456");
  });

  it("accepts a pasted international number", () => {
    expect(toE164("US", "+420601123456")).toBe("+420601123456");
  });

  it("drops a trunk zero", () => {
    expect(toE164("GB", "07911123456")).toBe("+447911123456");
  });
});

describe("parsePhone", () => {
  it("splits an E.164 into ISO + national", () => {
    expect(parsePhone("+14155552671")).toEqual({
      iso: "US",
      national: "4155552671",
      e164: "+14155552671",
    });
  });

  it("prefers US for shared +1", () => {
    expect(parsePhone("+16135551234").iso).toBe("US");
  });
});
