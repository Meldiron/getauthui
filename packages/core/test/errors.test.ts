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

  it("maps general_argument_invalid to per-field copy", () => {
    expect(
      describeError(
        { type: "general_argument_invalid", message: "Invalid `email` param: Value must be a valid email address", code: 400 },
        defaultStrings
      )
    ).toBe(defaultStrings.errorInvalidEmail);
    expect(
      describeError(
        { type: "general_argument_invalid", message: "Invalid `password` param: Password must be between 8 and 256 characters long.", code: 400 },
        defaultStrings
      )
    ).toBe(defaultStrings.errorInvalidPassword);
    expect(
      describeError(
        { type: "general_argument_invalid", message: "Invalid `phone` param: Phone number must start with a '+'", code: 400 },
        defaultStrings
      )
    ).toBe(defaultStrings.errorInvalidPhone);
  });

  it("strips HTML error bodies so they never reach the UI", () => {
    const html = "<!DOCTYPE html><html><body>not found</body></html>";
    expect(toAuthUIError({ message: html, type: "general_route_not_found", code: 404 }).message).toBe(
      ""
    );
    expect(describeError({ message: html, type: "general_route_not_found", code: 404 }, defaultStrings)).toBe(
      defaultStrings.errorGeneric
    );
  });

  it("formats placeholders", () => {
    expect(format("Hi {name}, {n} left", { name: "Ada", n: 2 })).toBe("Hi Ada, 2 left");
    expect(format("Missing {x}")).toBe("Missing {x}");
  });
});
