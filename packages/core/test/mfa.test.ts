import { describe, expect, it } from "vitest";
import { availableMfaFactors, defaultMfaFactor } from "../src/mfa.js";

describe("mfa helpers", () => {
  it("returns only enabled factors in Vibes priority order", () => {
    expect(
      availableMfaFactors({
        totp: false,
        email: true,
        phone: true,
        recoveryCode: true,
      })
    ).toEqual(["email", "phone", "recoverycode"]);
  });

  it("picks totp as the default when available", () => {
    expect(
      defaultMfaFactor({
        totp: true,
        email: true,
        phone: false,
        recoveryCode: true,
      })
    ).toBe("totp");
  });

  it("returns null when nothing is enabled", () => {
    expect(
      defaultMfaFactor({
        totp: false,
        email: false,
        phone: false,
        recoveryCode: false,
      })
    ).toBeNull();
  });
});
