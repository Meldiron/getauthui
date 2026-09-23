import { describe, expect, it } from "vitest";
import {
  alternateMfaFactors,
  availableMfaFactors,
  defaultMfaFactor,
  mfaFactorHintKey,
} from "../src/mfa.js";

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

describe("mfa factor hints and alternates", () => {
  it("maps each factor to a hint string key", () => {
    expect(mfaFactorHintKey("totp")).toBe("mfaHintTotp");
    expect(mfaFactorHintKey("email")).toBe("mfaHintEmail");
    expect(mfaFactorHintKey("phone")).toBe("mfaHintPhone");
    expect(mfaFactorHintKey("recoverycode")).toBe("mfaHintRecoveryCode");
  });

  it("lists other enabled factors for in-challenge switching", () => {
    expect(
      alternateMfaFactors({ totp: true, email: true, phone: false, recoveryCode: true }, "totp")
    ).toEqual(["email", "recoverycode"]);
  });
});
