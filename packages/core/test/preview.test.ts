import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "./mocks.js";

// Preview mode never touches the SDK; make sure it would explode if it did.
vi.mock("appwrite", () => ({
  Client: class {
    setEndpoint() {
      return this;
    }
    setProject() {
      return this;
    }
  },
  Account: class {
    constructor() {
      throw new Error("Account must not be constructed in preview mode");
    }
  },
  Avatars: class {},
  ID: { unique: () => "unique()" },
}));

import { authStore } from "../src/store.js";
import { previewQrDataUrl } from "../src/preview.js";

const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 60));
};

beforeEach(() => {
  authStore.reset();
  window.history.replaceState(null, "", "/app?authui=oauth&userId=x&secret=y");
});

describe("preview mode", () => {
  it("starts signed out, ignores redirect params and accepts any credentials", async () => {
    authStore.configure({ ...config, preview: true });
    expect(authStore.isPreview).toBe(true);
    await settle();
    expect(authStore.getState().status).toBe("signed-out");
    await authStore.signInWithEmailPassword("anyone@example.com", "whatever");
    expect(authStore.getState().status).toBe("signed-in");
    expect(authStore.user?.email).toBe("anyone@example.com");
  });

  it("completes OAuth in place", async () => {
    authStore.configure({ ...config, preview: true });
    await settle();
    await authStore.signInWithOAuth("github");
    expect(authStore.getState().status).toBe("signed-in");
    expect(authStore.user?.email).toContain("github");
  });

  it("accepts any one-time code and returns a security phrase", async () => {
    authStore.configure({ ...config, preview: true });
    await settle();
    const token = await authStore.sendEmailOtp("otp@example.com");
    expect(token.phrase).toMatch(/\w+-\w+/);
    await authStore.signInWithToken(token.userId, "000000");
    expect(authStore.user?.email).toBe("otp@example.com");
  });

  it("runs the full MFA lifecycle including step-up", async () => {
    authStore.configure({ ...config, preview: true });
    await settle();
    await authStore.signInWithEmailPassword("ada@example.com", "pw");
    const totp = await authStore.addAuthenticator();
    expect(totp.uri).toContain("otpauth://");
    await authStore.verifyAuthenticator("123456");
    await authStore.setMfaEnabled(true);
    expect(authStore.user?.mfa).toBe(true);
    expect((await authStore.listMfaFactors()).totp).toBe(true);

    // Sign out and back in: now a challenge is required.
    await authStore.signOut();
    await authStore.signInWithEmailPassword("ada@example.com", "pw");
    expect(authStore.getState().status).toBe("mfa-required");
    const c = await authStore.createMfaChallenge("totp");
    await authStore.completeMfaChallenge(c.$id, "654321");
    expect(authStore.getState().status).toBe("signed-in");

    // Recovery codes: create, then regenerate, which needs a recent challenge (we have one).
    const codes = await authStore.createRecoveryCodes();
    expect(codes).toHaveLength(6);
    const again = await authStore.regenerateRecoveryCodes();
    expect(again).not.toEqual(codes);
  }, 20000);

  it("seeds sessions, identities and logs, and deleting the current session signs out", async () => {
    authStore.configure({ ...config, preview: true });
    await settle();
    await authStore.previewSignIn();
    expect(authStore.getState().status).toBe("signed-in");
    const sessions = await authStore.listSessions();
    expect(sessions.length).toBe(3);
    expect(sessions[0].current).toBe(true);
    expect((await authStore.listIdentities())[0].provider).toBe("github");
    expect((await authStore.listLogs()).length).toBeGreaterThan(0);
    await authStore.signOut(sessions[1].$id);
    expect((await authStore.listSessions()).length).toBe(2);
    await authStore.signOut();
    expect(authStore.getState().status).toBe("signed-out");
  }, 20000);

  it("exposes the account service and stores prefs in preview", async () => {
    authStore.configure({ ...config, preview: true });
    await settle();
    await authStore.previewSignIn();
    const account = authStore.getAccount()!;
    await account.updatePrefs({ nullboard: { savedAt: 1 } });
    expect(await account.getPrefs()).toEqual({ nullboard: { savedAt: 1 } });
  });

  it("renders a placeholder QR as a data URL", () => {
    const a = previewQrDataUrl("otpauth://totp/a");
    expect(a.startsWith("data:image/svg+xml")).toBe(true);
    expect(a).toBe(previewQrDataUrl("otpauth://totp/a"));
    expect(a).not.toBe(previewQrDataUrl("otpauth://totp/b"));
  });
});
