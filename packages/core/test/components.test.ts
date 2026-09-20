import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, tick, type AccountMock } from "./mocks.js";

// One mock for the whole file: custom elements can only be registered once per page.
vi.mock("appwrite", async () => {
  const { createAccountMock } = await import("./mocks.js");
  const account = createAccountMock();
  (globalThis as any).__account = account;
  return {
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
        return account;
      }
    },
    Avatars: class {
      getQR(text: string) {
        return `https://example.com/qr?text=${encodeURIComponent(text)}`;
      }
    },
    ID: { unique: () => "unique()" },
  };
});

import "../src/index.js";
import { authStore } from "../src/store.js";

let account: AccountMock;

async function mount<T extends HTMLElement>(html: string): Promise<T> {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  const el = wrapper.firstElementChild as T & { updateComplete: Promise<unknown> };
  await (el as any).updateComplete;
  return el;
}

const shadowText = (el: Element) => el.shadowRoot?.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/app");
  account = (globalThis as any).__account as AccountMock;
  account.state.user = null;
  account.state.mfaPending = false;
  account.state.blocked = false;
  authStore.reset();
});

describe("<authui-config>", () => {
  it("parses attributes into a config and configures the store", async () => {
    await mount(
      `<authui-config endpoint="https://x/v1" project="p" methods="email-password magic-url oauth:google oauth:github anonymous" sign-up="false" name="Acme" theme="dark" primary="#ff0000"></authui-config>`
    );
    const cfg = authStore.getConfig()!;
    expect(cfg.endpoint).toBe("https://x/v1");
    expect(cfg.methods).toEqual({
      oauth: ["google", "github"],
      emailPassword: true,
      magicUrl: true,
      anonymous: true,
    });
    expect(cfg.signUp).toBe(false);
    expect(cfg.branding).toMatchObject({ name: "Acme", theme: "dark", primary: "#ff0000" });
  });

  it("can turn email-password off when methods lists other options", async () => {
    await mount(
      `<authui-config endpoint="https://x/v1" project="p" methods="oauth:google oauth:github"></authui-config>`
    );
    expect(authStore.getConfig()!.methods).toEqual({
      oauth: ["google", "github"],
      emailPassword: false,
    });

    authStore.reset();
    await mount(
      `<authui-config endpoint="https://x/v1" project="p" methods="magic-url email-otp phone"></authui-config>`
    );
    expect(authStore.getConfig()!.methods).toMatchObject({
      emailPassword: false,
      magicUrl: true,
      emailOtp: true,
      phone: true,
    });
  });

  it("defaults email-password on when methods is empty", async () => {
    await mount(`<authui-config endpoint="https://x/v1" project="p"></authui-config>`);
    expect(authStore.getConfig()!.methods.emailPassword).toBe(true);
  });
});

describe("<authui-sign-in>", () => {
  it("renders configured methods and provider buttons", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toContain("Sign in to Acme");
    expect(text).toContain("Continue with Google");
    expect(text).toContain("Continue with GitHub");
    expect(text).toContain("Send magic link");
    expect(text).toContain("Continue as guest");
    expect(el.shadowRoot!.querySelector("input[type=email]")).not.toBeNull();
  });

  it("shows a friendly error on bad credentials", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const email = root.querySelector<HTMLInputElement>("input[type=email]")!;
    const password = root.querySelector<HTMLInputElement>("input[type=password]")!;
    email.value = "a@b.co";
    email.dispatchEvent(new Event("input"));
    password.value = "wrong";
    password.dispatchEvent(new Event("input"));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Invalid email or password.");
  });

  it("switches to the MFA screen when more factors are required", async () => {
    account.state.mfaPending = true;
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toContain("Two-factor authentication");
    expect(text).toContain("Use authenticator app");
    expect(text).toContain("Use a recovery code");
    expect(text).not.toContain("Send code by SMS");
  });

  it("leaves the MFA chooser after a successful challenge", async () => {
    account.state.mfaPending = true;
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: true,
      emailVerification: true,
      phoneVerification: false,
      phone: "",
    };
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().status).toBe("mfa-required");
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Two-factor authentication");

    const authenticator = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("authenticator")
    )!;
    authenticator.click();
    await tick();
    await (el as any).updateComplete;

    const code = el.shadowRoot!.querySelector<HTMLInputElement>("#authui-code")!;
    code.value = "123456";
    code.dispatchEvent(new Event("input"));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect(authStore.getState().status).toBe("signed-in");
    const text = shadowText(el);
    expect(text).toContain("Signed in as");
    expect(text).not.toContain("Two-factor authentication");
    expect(text).not.toContain("Send code by SMS");
  });

  it("renders the signed-in state with sign out", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Signed in as");
    expect(shadowText(el)).toContain("Sign out");
  });

  it("resets the sign-in panel after sign-out from a passwordless step", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;

    // Drive the component onto the phone code-entry step with a pending token.
    (el as any).go("phone");
    (el as any).token = { userId: "u1", kind: "phone", target: "+15555550100" };
    await (el as any).updateComplete;
    expect(shadowText(el)).toMatch(/sent a code|Verify code|Code/i);

    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    await tick();
    await (el as any).updateComplete;
    // Signed in should leave the phone step.
    expect(shadowText(el)).toContain("Signed in as");

    await authStore.signOut();
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).not.toMatch(/We sent a code/i);
    expect(text).toContain("Sign in");
    expect(el.shadowRoot!.querySelector("input[type=email]")).not.toBeNull();
  });

  it("shows the not-configured hint when init was never called", async () => {
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    expect(shadowText(el)).toContain("Auth UI is not configured");
  });
});

describe("keyboard isolation", () => {
  it("keeps keystrokes typed into the component away from page-level listeners", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const pageListener = vi.fn();
    document.addEventListener("keydown", pageListener);
    window.addEventListener("keydown", pageListener);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>("input[type=email]")!;
    const inner = vi.fn();
    input.addEventListener("keydown", inner);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true, composed: true }));
    expect(inner).toHaveBeenCalledTimes(1);
    expect(pageListener).not.toHaveBeenCalled();
    // keys pressed outside the component still reach the page
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
    expect(pageListener).toHaveBeenCalled();
    document.removeEventListener("keydown", pageListener);
    window.removeEventListener("keydown", pageListener);
  });

  it("still closes the user menu with Escape while focus is inside it", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-user-button></authui-user-button>`);
    await tick();
    await (el as any).updateComplete;
    el.shadowRoot!.querySelector<HTMLButtonElement>(".trigger")!.click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector(".menu")).not.toBeNull();
    el.shadowRoot!.querySelector<HTMLButtonElement>(".menu-item")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true })
    );
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector(".menu")).toBeNull();
  });
});

describe("<authui-show>", () => {
  it("toggles children with auth state using when", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const inEl = await mount<HTMLElement>(
      `<authui-show when="signed-in"><b>secret</b></authui-show>`
    );
    const outEl = await mount<HTMLElement>(
      `<authui-show when="signed-out"><b>public</b></authui-show>`
    );
    await tick();
    expect(inEl.shadowRoot!.querySelector("slot")).toBeNull();
    expect(outEl.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(outEl.hasAttribute("ready")).toBe(true);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    await (inEl as any).updateComplete;
    await (outEl as any).updateComplete;
    expect(inEl.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(outEl.shadowRoot!.querySelector("slot")).toBeNull();
  });

  it("supports unless and lists, and treats mfa-required as not signed in", async () => {
    account.state.mfaPending = true;
    authStore.configure(config);
    await tick();
    await tick();
    const unlessEl = await mount<HTMLElement>(
      `<authui-show unless="signed-in"><b>x</b></authui-show>`
    );
    const listEl = await mount<HTMLElement>(
      `<authui-show when="signed-out, mfa-required"><b>y</b></authui-show>`
    );
    const outEl = await mount<HTMLElement>(`<authui-show when="signed-out"><b>z</b></authui-show>`);
    await tick();
    expect(unlessEl.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(listEl.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(outEl.shadowRoot!.querySelector("slot")).toBeNull();
  });

  it("stays hidden while loading unless asked for it", async () => {
    const hidden = await mount<HTMLElement>(
      `<authui-show when="signed-out"><b>x</b></authui-show>`
    );
    const loading = await mount<HTMLElement>(
      `<authui-show when="loading"><b>spinner</b></authui-show>`
    );
    expect(hidden.hasAttribute("ready")).toBe(false);
    expect(hidden.shadowRoot!.querySelector("slot")).toBeNull();
    expect(loading.hasAttribute("ready")).toBe(true);
    expect(loading.shadowRoot!.querySelector("slot")).not.toBeNull();
  });
});

describe("<authui-modal> and <authui-button>", () => {
  it("opens the modal on button click and closes on sign in", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const button = await mount<HTMLElement>(`<authui-button>Sign in</authui-button>`);
    button.shadowRoot!.querySelector("button")!.click();
    await tick();
    await tick();
    const modal = document.querySelector("authui-modal") as HTMLElement & {
      open: boolean;
      updateComplete: Promise<unknown>;
    };
    expect(modal).not.toBeNull();
    await modal.updateComplete;
    expect(modal.open).toBe(true);
    expect(modal.shadowRoot!.querySelector("authui-sign-in")).not.toBeNull();
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    modal
      .shadowRoot!.querySelector("authui-sign-in")!
      .dispatchEvent(new CustomEvent("authui-success", { bubbles: true, composed: true }));
    await modal.updateComplete;
    expect(modal.open).toBe(false);
  });

  it("opens automatically for a password reset link", async () => {
    window.history.replaceState(null, "", "/app?authui=recovery&userId=u1&secret=s1");
    await mount(`<authui-modal></authui-modal>`);
    authStore.configure(config);
    await tick();
    await tick();
    const modal = document.querySelector("authui-modal") as HTMLElement & {
      open: boolean;
      updateComplete: Promise<unknown>;
    };
    await modal.updateComplete;
    expect(modal.open).toBe(true);
    const inner = modal.shadowRoot!.querySelector("authui-sign-in") as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await inner.updateComplete;
    expect(shadowText(inner)).toContain("Reset password");
  });
});

describe("<authui-account>", () => {
  it("renders tabs and hides activity when logs are unsupported", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement & { select: (t: string) => void }>(
      `<authui-account></authui-account>`
    );
    await tick();
    await (el as any).updateComplete;
    const tabs = [...el.shadowRoot!.querySelectorAll("[role=tab]")].map((t) =>
      t.textContent!.trim()
    );
    expect(tabs).toEqual(["Profile", "Security", "Sessions", "Connections", "Activity"]);
    (el.shadowRoot!.querySelectorAll("[role=tab]")[4] as HTMLButtonElement).click();
    await tick();
    await tick();
    await (el as any).updateComplete;
    const after = [...el.shadowRoot!.querySelectorAll("[role=tab]")].map((t) =>
      t.textContent!.trim()
    );
    expect(after).not.toContain("Activity");
  });

  it("lists sessions", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-account tab="sessions"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Chrome");
    expect(shadowText(el)).toContain("This device");
  });

  it("shows the guest upgrade form for anonymous users", async () => {
    authStore.configure(config);
    await authStore.signInAnonymously();
    const el = await mount<HTMLElement>(`<authui-account></authui-account>`);
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Guest account");
    expect(shadowText(el)).toContain("Create your account");
  });
});
