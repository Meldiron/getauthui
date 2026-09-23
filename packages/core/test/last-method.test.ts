import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLastMethod,
  clearPendingOAuth,
  countSignInMethods,
  getLastMethod,
  rememberLastMethod,
  rememberPendingOAuth,
  showLastUsedBadge,
  stashPendingOAuth,
} from "../src/last-method.js";

describe("last-method", () => {
  beforeEach(() => {
    clearLastMethod();
    clearPendingOAuth();
  });

  it("round-trips a method key", () => {
    rememberLastMethod("email-password");
    expect(getLastMethod()).toBe("email-password");
  });

  it("maps sign-up to email-password", () => {
    rememberLastMethod("sign-up");
    expect(getLastMethod()).toBe("email-password");
  });

  it("ignores mfa", () => {
    rememberLastMethod("email-password");
    rememberLastMethod("mfa");
    expect(getLastMethod()).toBe("email-password");
  });

  it("stores oauth provider keys", () => {
    rememberLastMethod("oauth:github");
    expect(getLastMethod()).toBe("oauth:github");
  });

  it("does not remember OAuth until rememberPendingOAuth runs", () => {
    stashPendingOAuth("github");
    expect(getLastMethod()).toBeNull();
    rememberPendingOAuth();
    expect(getLastMethod()).toBe("oauth:github");
  });

  it("clearPendingOAuth drops the stash without remembering", () => {
    rememberLastMethod("email-password");
    stashPendingOAuth("google");
    clearPendingOAuth();
    rememberPendingOAuth();
    expect(getLastMethod()).toBe("email-password");
  });

  it("counts each configured sign-in option including OAuth providers", () => {
    expect(countSignInMethods({})).toBe(1); // email-password default
    expect(countSignInMethods({ emailPassword: false })).toBe(0);
    expect(
      countSignInMethods({
        emailPassword: true,
        magicUrl: true,
        emailOtp: true,
        phone: true,
        anonymous: true,
        oauth: ["google", "github"],
      })
    ).toBe(7);
  });

  it("hides last-used badges when only one method is available", () => {
    expect(showLastUsedBadge({ emailPassword: true })).toBe(false);
    expect(showLastUsedBadge({ emailPassword: false, oauth: ["github"] })).toBe(false);
    expect(showLastUsedBadge({ emailPassword: true, oauth: ["github"] })).toBe(true);
    expect(showLastUsedBadge({ emailPassword: true, magicUrl: true })).toBe(true);
  });
});
