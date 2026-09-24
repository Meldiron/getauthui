import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAppwrite, config, tick, type AccountMock } from "./mocks.js";

let account: AccountMock;
let authStore: typeof import("../src/store.js").authStore;

beforeEach(async () => {
  vi.resetModules();
  account = mockAppwrite();
  ({ authStore } = await import("../src/store.js"));
  window.history.replaceState(null, "", "/app");
});

describe("AuthStore", () => {
  it("starts signed out after configure", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().status).toBe("signed-out");
    expect(authStore.getState().configured).toBe(true);
  });

  it("warns and sets configError when the project does not exist", async () => {
    account.get.mockRejectedValueOnce({
      type: "project_not_found",
      message: "Project with the requested ID could not be found.",
      code: 404,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorListener = vi.fn();
    authStore.on("error", errorListener);
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().status).toBe("signed-out");
    expect(authStore.getState().configError).toMatch(/project|endpoint|platform/i);
    expect(authStore.getState().pending).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(errorListener).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns when endpoint does not end with /v1", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    authStore.configure({ ...config, endpoint: "https://cloud.appwrite.io" });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/\/v1/));
    warn.mockRestore();
  });

  it("notifyConfigIncomplete leaves a developer-facing configError", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    authStore.notifyConfigIncomplete();
    expect(authStore.getState().status).toBe("signed-out");
    expect(authStore.getState().configured).toBe(false);
    expect(authStore.getState().configError).toMatch(/endpoint|project/i);
    expect(authStore.getState().pending).toBeNull();
    warn.mockRestore();
  });

  it("signs in with email and password and emits signed-in", async () => {
    authStore.configure(config);
    const listener = vi.fn();
    authStore.on("signed-in", listener);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    expect(authStore.getState().status).toBe("signed-in");
    expect(authStore.user?.email).toBe("a@b.co");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("surfaces Appwrite errors and emits error", async () => {
    authStore.configure(config);
    const listener = vi.fn();
    authStore.on("error", listener);
    await expect(authStore.signInWithEmailPassword("a@b.co", "nope")).rejects.toMatchObject({
      type: "user_invalid_credentials",
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: "user_invalid_credentials" })
    );
    expect(authStore.getState().status).toBe("signed-out");
  });

  it("detects a pending MFA challenge and lists factors", async () => {
    account.state.mfaPending = true;
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().status).toBe("mfa-required");
    expect(authStore.getState().mfaFactors).toMatchObject({ totp: true, recoveryCode: true });
    await authStore.createMfaChallenge("totp");
    await authStore.completeMfaChallenge("c1", "123456");
    // account.get still throws because the mock user is null; the pending flag is cleared
    expect(account.state.mfaPending).toBe(false);
  });

  it("purges a blocked session and surfaces the blocked error after sign-in", async () => {
    authStore.configure(config);
    account.state.blocked = true;
    await expect(
      authStore.signInWithEmailPassword("a@b.co", "correct-horse")
    ).rejects.toMatchObject({
      type: "user_blocked",
    });
    expect(authStore.getState().status).toBe("signed-out");
    expect(authStore.getState().user).toBeNull();
    expect(authStore.getState().pending).toMatchObject({
      type: "notice",
      tone: "error",
    });
    expect(account.deleteSession).toHaveBeenCalled();
    account.state.blocked = false;
  });

  it("signs out when the current session is deleted by id", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    expect(authStore.getState().status).toBe("signed-in");
    // Mock deleteSession clears the user for any id; store must detect the guest state.
    await authStore.signOut("s1");
    expect(authStore.getState().status).toBe("signed-out");
    expect(authStore.getState().user).toBeNull();
  });

  it("navigates to successUrl after sign in", async () => {
    const original = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        ...original,
        assign,
        href: "http://localhost/app",
        origin: "http://localhost",
        pathname: "/app",
        search: "",
      },
      writable: true,
      configurable: true,
    });
    try {
      authStore.configure({ ...config, successUrl: "/dashboard" });
      await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
      expect(assign).toHaveBeenCalledWith("/dashboard");
    } finally {
      Object.defineProperty(window, "location", {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  it("builds redirect URLs with the authui marker and strips Appwrite params", () => {
    authStore.configure({
      ...config,
      redirectUrl: "https://myapp.com/auth?userId=old&secret=old&foo=bar",
    });
    const url = new URL(authStore.redirectUrl("magic-url"));
    expect(url.origin + url.pathname).toBe("https://myapp.com/auth");
    expect(url.searchParams.get("authui")).toBe("magic-url");
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.has("secret")).toBe(false);
  });

  it("redeems a magic URL token found in the page URL and cleans it", async () => {
    const { clearLastMethod, getLastMethod } = await import("../src/last-method.js");
    clearLastMethod();
    window.history.replaceState(
      null,
      "",
      "/app?authui=magic-url&userId=u9&secret=valid-secret&expire=x&project=p"
    );
    authStore.configure(config);
    await tick();
    await tick();
    expect(account.createSession).toHaveBeenCalledWith("u9", "valid-secret");
    expect(authStore.getState().status).toBe("signed-in");
    expect(window.location.search).toBe("");
    expect(getLastMethod()).toBe("magic-url");
  });

  it("stores a pending reset-password action from a recovery link", async () => {
    window.history.replaceState(null, "", "/app?authui=recovery&userId=u9&secret=s9");
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().pending).toEqual({
      type: "reset-password",
      userId: "u9",
      secret: "s9",
    });
    await authStore.completePasswordRecovery("u9", "s9", "new-password-1");
    expect(account.updateRecovery).toHaveBeenCalledWith("u9", "s9", "new-password-1");
    expect(authStore.getState().pending).toBeNull();
  });

  it("confirms email verification from a link", async () => {
    window.history.replaceState(null, "", "/app?authui=verify-email&userId=u9&secret=s9");
    authStore.configure(config);
    await tick();
    await tick();
    expect(account.updateEmailVerification).toHaveBeenCalledWith("u9", "s9");
    expect(authStore.getState().pending).toMatchObject({ type: "notice", tone: "success" });
  });

  it("records a failed OAuth attempt", async () => {
    window.history.replaceState(null, "", "/app?authui=oauth-failed&error=denied");
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().pending).toMatchObject({ type: "notice", tone: "error" });
  });

  it("signs out and emits signed-out", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const listener = vi.fn();
    authStore.on("signed-out", listener);
    await authStore.signOut();
    expect(authStore.getState().status).toBe("signed-out");
    expect(listener).toHaveBeenCalled();
  });

  it("falls back to legacy MFA method names on older SDKs", async () => {
    authStore.configure(config);
    delete (account as any).listMFAFactors;
    (account as any).listMfaFactors = vi.fn(async () => ({
      totp: false,
      email: true,
      phone: false,
      recoveryCode: false,
    }));
    const factors = await authStore.listMfaFactors();
    expect(factors.email).toBe(true);
  });

  it("merges custom strings over defaults", () => {
    authStore.configure({ ...config, strings: { signIn: "Log in" } });
    expect(authStore.getStrings().signIn).toBe("Log in");
    expect(authStore.getStrings().signUp).toBe("Sign up");
  });

  it("applies locale pack before strings override", () => {
    authStore.configure({
      ...config,
      locale: "cs",
      strings: { signIn: "Custom CZ" },
    });
    expect(authStore.getStrings().signIn).toBe("Custom CZ");
    expect(authStore.getStrings().continue).toBe("Pokračovat");
  });

  it("falls back to English for unknown locale", () => {
    authStore.configure({ ...config, locale: "ja" });
    expect(authStore.getStrings().signIn).toBe("Sign in");
  });
});

describe("handleRedirect notices", () => {
  it("maps invalid magic-url secrets with describeError", async () => {
    window.history.replaceState(null, "", "/app?authui=magic-url&userId=u9&secret=bad");
    account.createSession.mockRejectedValueOnce({
      type: "user_invalid_token",
      message: "Invalid token passed in the request.",
      code: 401,
    });
    authStore.configure(config);
    await tick();
    await tick();
    const pending = authStore.getState().pending;
    expect(pending).toMatchObject({ type: "notice", tone: "error" });
    expect((pending as any).message).toMatch(/invalid or has expired/i);
    expect((pending as any).message).not.toMatch(/Invalid token passed/i);
  });

  it("shows an error for incomplete recovery returns", async () => {
    window.history.replaceState(null, "", "/app?authui=recovery");
    authStore.configure(config);
    await tick();
    await tick();
    const pending = authStore.getState().pending;
    expect(pending).toMatchObject({ type: "notice", tone: "error" });
  });
});

describe("teams", () => {
  it("persists the active team and emits active-team", async () => {
    authStore.configure(config);
    await tick();
    const listener = vi.fn();
    authStore.on("active-team", listener);
    authStore.setActiveTeam({ $id: "t1", name: "Acme" });
    expect(authStore.getActiveTeamId()).toBe("t1");
    expect(listener).toHaveBeenCalledWith({
      teamId: "t1",
      team: { $id: "t1", name: "Acme" },
    });
    authStore.setActiveTeam(null);
    expect(authStore.getActiveTeamId()).toBeNull();
  });

  it("returns no teams while signed out or in preview", async () => {
    authStore.configure(config);
    await tick();
    expect(await authStore.listTeams()).toEqual([]);
    authStore.configure({ ...config, preview: true });
    await tick();
    expect(await authStore.listTeams()).toEqual([]);
  });
});

describe("recovery OTP, email verify OTP, id token, consents", () => {
  it("prefers recovery OTP and completes via updateRecoveryOTP", async () => {
    authStore.configure(config);
    await tick();
    const result = await authStore.sendPasswordRecovery("a@b.co");
    expect(result).toMatchObject({ mode: "otp" });
    expect(account.createRecoveryOTP).toHaveBeenCalled();
    expect(account.createRecovery).not.toHaveBeenCalled();
    await authStore.completePasswordRecovery("u-recovery", "123456", "NewPass1!", { otp: true });
    expect(account.updateRecoveryOTP).toHaveBeenCalledWith("u-recovery", "123456", "NewPass1!");
    expect(account.updateRecovery).not.toHaveBeenCalled();
  });

  it("falls back to link recovery when OTP route is missing", async () => {
    account.createRecoveryOTP.mockRejectedValueOnce({
      type: "general_route_not_found",
      message: "Not Found",
      code: 404,
    });
    authStore.configure(config);
    await tick();
    const result = await authStore.sendPasswordRecovery("a@b.co");
    expect(result).toEqual({ mode: "link" });
    expect(account.createRecovery).toHaveBeenCalled();
  });

  it("prefers email verification OTP and confirms it", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      emailVerification: false,
    };
    authStore.configure(config);
    await authStore.refresh();
    const result = await authStore.sendEmailVerification();
    expect(result).toMatchObject({ mode: "otp" });
    expect(account.createEmailVerificationOTP).toHaveBeenCalled();
    await authStore.confirmEmailVerification("654321");
    expect(account.updateEmailVerificationOTP).toHaveBeenCalledWith("u1", "654321");
  });

  it("creates an ID token session and refreshes", async () => {
    authStore.configure(config);
    await tick();
    await authStore.createIdTokenSession({ provider: "google", idToken: "jwt.here" });
    expect(account.createIdTokenSession).toHaveBeenCalled();
    expect(authStore.getState().status).toBe("signed-in");
  });

  it("lists consents when the route exists", async () => {
    account.listConsents.mockResolvedValueOnce({
      total: 1,
      consents: [
        {
          $id: "c1",
          $createdAt: "2026-01-01T00:00:00.000Z",
          $updatedAt: "2026-01-01T00:00:00.000Z",
          userId: "u1",
          appId: "app1",
          cimdUrl: "",
          scopes: ["openid"],
          resources: [],
          authorizationDetails: "",
          expire: "",
        },
      ],
    });
    account.state.user = { $id: "u1", email: "a@b.co", name: "Test" };
    authStore.configure(config);
    await authStore.refresh();
    const list = await authStore.listConsents();
    expect(list).toHaveLength(1);
    expect(list[0]!.appId).toBe("app1");
  });

  it("loads app branding via REST when Apps SDK is not exported", async () => {
    const clientCall = (account as AccountMock & { clientCall: ReturnType<typeof vi.fn> })
      .clientCall;
    clientCall.mockResolvedValueOnce({
      $id: "app1",
      name: "Acme Docs",
      logoUri: "https://example.com/acme.png",
      tagline: "Ship faster",
    });
    account.state.user = { $id: "u1", email: "a@b.co", name: "Test" };
    authStore.configure(config);
    await authStore.refresh();
    const app = await authStore.getApp("app1");
    expect(app.name).toBe("Acme Docs");
    expect(app.logoUri).toBe("https://example.com/acme.png");
    expect(clientCall).toHaveBeenCalled();
    const [, uri] = clientCall.mock.calls[0]!;
    expect(String(uri)).toContain("/apps/app1");
    // Cached: second call does not hit the network again.
    clientCall.mockClear();
    const again = await authStore.getApp("app1");
    expect(again.name).toBe("Acme Docs");
    expect(clientCall).not.toHaveBeenCalled();
  });
});
