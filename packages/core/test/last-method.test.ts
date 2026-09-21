import { beforeEach, describe, expect, it } from "vitest";
import { clearLastMethod, getLastMethod, rememberLastMethod } from "../src/last-method.js";

describe("last-method", () => {
  beforeEach(() => {
    clearLastMethod();
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
});
