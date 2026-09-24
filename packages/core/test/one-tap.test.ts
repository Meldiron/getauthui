import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAppwrite, config, tick } from "./mocks.js";

let account: ReturnType<typeof mockAppwrite>;
let authStore: typeof import("../src/store.js").authStore;
let promptGoogleOneTap: typeof import("../src/one-tap.js").promptGoogleOneTap;
let resetOneTapPromptState: typeof import("../src/one-tap.js").resetOneTapPromptState;
let loadGoogleIdentityServices: typeof import("../src/one-tap.js").loadGoogleIdentityServices;
let generateOneTapNonce: typeof import("../src/one-tap.js").generateOneTapNonce;

beforeEach(async () => {
  vi.resetModules();
  document.head.innerHTML = "";
  account = mockAppwrite();
  ({ authStore } = await import("../src/store.js"));
  ({ promptGoogleOneTap, resetOneTapPromptState, loadGoogleIdentityServices, generateOneTapNonce } =
    await import("../src/one-tap.js"));
  resetOneTapPromptState();
  delete (window as any).google;
});

describe("Google One Tap", () => {
  it("soft-fails when client id is empty", async () => {
    const soft = vi.fn();
    await promptGoogleOneTap({ clientId: "  ", onSoftFail: soft });
    expect(soft).toHaveBeenCalledWith(expect.stringMatching(/missing googleClientId/));
    expect(account.createIdTokenSession).not.toHaveBeenCalled();
  });

  it("soft-fails when GIS is unavailable", async () => {
    const soft = vi.fn();
    // Force script error by not defining window.google and stubbing createElement
    const orig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = orig(tag);
      if (tag === "script") {
        queueMicrotask(() => el.dispatchEvent(new Event("error")));
      }
      return el;
    });
    await promptGoogleOneTap({ clientId: "client.apps.googleusercontent.com", onSoftFail: soft });
    await tick();
    await tick();
    expect(soft).toHaveBeenCalledWith(expect.stringMatching(/unavailable|failed/i));
  });

  it("generateOneTapNonce returns 64 hex chars", () => {
    const a = generateOneTapNonce();
    const b = generateOneTapNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("initializes GIS and creates an id-token session on credential", async () => {
    authStore.configure(config);
    await tick();
    const initialize = vi.fn();
    const prompt = vi.fn((cb?: (n: any) => void) => {
      cb?.({
        isNotDisplayed: () => false,
        isSkippedMoment: () => false,
        isDismissedMoment: () => false,
      });
    });
    (window as any).google = {
      accounts: {
        id: {
          initialize,
          prompt,
          cancel: vi.fn(),
        },
      },
    };
    resetOneTapPromptState();

    const onSuccess = vi.fn();
    await promptGoogleOneTap({
      clientId: "123.apps.googleusercontent.com",
      onSuccess,
    });

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "123.apps.googleusercontent.com",
        nonce: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    );
    expect(prompt).toHaveBeenCalled();

    const initArgs = initialize.mock.calls[0][0] as {
      nonce: string;
      callback: (r: { credential?: string }) => void;
    };
    const nonce = initArgs.nonce;
    initArgs.callback({ credential: "eyJhbGciOiJSUzI1NiJ9.payload.sig" });
    await tick();
    await tick();
    expect(account.createIdTokenSession).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        idToken: "eyJhbGciOiJSUzI1NiJ9.payload.sig",
        nonce,
      })
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("loadGoogleIdentityServices resolves existing window.google", async () => {
    (window as any).google = {
      accounts: { id: { initialize: vi.fn(), prompt: vi.fn(), cancel: vi.fn() } },
    };
    const id = await loadGoogleIdentityServices();
    expect(id).toBeTruthy();
  });
});
