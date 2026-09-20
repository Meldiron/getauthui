import { describe, expect, it } from "vitest";
import { describeError, toAuthUIError } from "../src/errors.js";
import { defaultStrings, format } from "../src/i18n.js";

describe("errors", () => {
  it("maps known Appwrite error types to friendly copy", () => {
    expect(
      describeError({ type: "user_invalid_credentials", message: "x", code: 401 }, defaultStrings)
    ).toBe(defaultStrings.errorInvalidCredentials);
    expect(
      describeError(
        { type: "general_rate_limit_exceeded", message: "x", code: 429 },
        defaultStrings
      )
    ).toBe(defaultStrings.errorRateLimit);
    expect(describeError({ type: "password_pwned", message: "x", code: 400 }, defaultStrings)).toBe(
      defaultStrings.errorPasswordPwned
    );
  });

  it("reads invalid tokens as wrong codes when the user typed a code", () => {
    const err = { type: "user_invalid_token", message: "x", code: 401 };
    expect(describeError(err, defaultStrings, "code")).toBe(defaultStrings.errorInvalidCode);
    expect(describeError(err, defaultStrings, "link")).toBe(defaultStrings.errorInvalidToken);
  });

  it("falls back to the server message for unknown types", () => {
    expect(
      describeError(
        { type: "something_else", message: "Server said no", code: 400 },
        defaultStrings
      )
    ).toBe("Server said no");
  });

  it("detects network failures", () => {
    expect(describeError(new TypeError("Failed to fetch"), defaultStrings)).toBe(
      defaultStrings.errorNetwork
    );
  });

  it("normalises unknown values", () => {
    expect(toAuthUIError("boom")).toEqual({ message: "boom", type: "", code: 0 });
  });

  it("formats placeholders", () => {
    expect(format("Hi {name}, {n} left", { name: "Ada", n: 2 })).toBe("Hi Ada, 2 left");
    expect(format("Missing {x}")).toBe("Missing {x}");
  });
});
