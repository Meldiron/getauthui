import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLastMethod,
  clearPendingOAuth,
  getLastMethod,
  rememberLastMethod,
  rememberPendingOAuth,
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
});
