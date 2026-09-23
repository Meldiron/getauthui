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
      getBrowser(code: string) {
        return `https://example.com/browser/${code}.png`;
      }
      getFlag(code: string) {
        return `https://example.com/flag/${code}.png`;
      }
    },
    ID: { unique: () => "unique()" },
  };
});

import "../src/index.js";
import { authStore } from "../src/store.js";
import { FOUC_CSS, CRITICAL_FOUC_CSS } from "../src/components/authui-show.js";

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

  it("keeps Forgot password outside the password label accessible name", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const label = root.querySelector('label[for="authui-password"]')!;
    expect(label.textContent?.trim()).toBe("Password");
    expect(label.querySelector("button")).toBeNull();
    const forgot = [...root.querySelectorAll("button")].find((b) =>
      /Forgot password/i.test(b.textContent ?? "")
    );
    expect(forgot).toBeTruthy();
    expect(forgot!.closest("label")).toBeNull();
    expect(forgot!.closest(".field-with-forgot")).not.toBeNull();
  });

  it("places Forgot after the password input in DOM tab order", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const password = root.querySelector("#authui-password")!;
    const forgot = [...root.querySelectorAll("button")].find((b) =>
      /Forgot password/i.test(b.textContent ?? "")
    )!;
    const pos = password.compareDocumentPosition(forgot);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("wires aria-invalid and aria-describedby when an auth error is shown", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    (el as any).error = "Invalid credentials. Check your email and password.";
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const alert = root.querySelector("#authui-error");
    expect(alert?.getAttribute("role")).toBe("alert");
    const email = root.querySelector("#authui-email")!;
    const password = root.querySelector("#authui-password")!;
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("authui-error");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-describedby")).toBe("authui-error");
    (el as any).error = "";
    await (el as any).updateComplete;
    expect(email.hasAttribute("aria-invalid")).toBe(false);
    expect(email.hasAttribute("aria-describedby")).toBe(false);
  });

  it("makes the show/hide password toggle keyboard-focusable", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const toggle = el.shadowRoot!.querySelector<HTMLButtonElement>(".input-wrap button.btn-icon")!;
    expect(toggle.getAttribute("tabindex")).not.toBe("-1");
    expect(toggle.getAttribute("aria-label")).toMatch(/Show password|Hide password/);
  });

  it("switches to the MFA screen when more factors are required", async () => {
    account.state.mfaPending = true;
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toContain("Two-factor authentication");
    // Default factor (totp) auto-starts; code entry is shown, not the phantom chooser.
    expect(text).toContain("Verify code");
    expect(el.shadowRoot!.querySelector("#authui-code")).toBeTruthy();
    expect(el.shadowRoot!.querySelector("[data-otp]")).toBeTruthy();
    expect(account.createMFAChallenge).toHaveBeenCalled();
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
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toContain("Two-factor authentication");
    // totp auto-started; enter the code directly.
    const code = el.shadowRoot!.querySelector<HTMLInputElement>("#authui-code")!;
    expect(code).toBeTruthy();
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

  it("opens the account modal from Manage account when not embedded", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const btn = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Manage account")
    )!;
    btn.click();
    await tick();
    await tick();
    const modal = document.querySelector("authui-modal") as HTMLElement & { open?: boolean };
    expect(modal).not.toBeNull();
    // Allow the microtask that dispatches authui:open to run.
    await tick();
    await (modal as any).updateComplete;
    expect(modal.open || modal.shadowRoot?.querySelector("dialog")?.open).toBeTruthy();
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

  it("installs a FOUC guard via adoptedStyleSheets or a style tag", () => {
    const sheets = document.adoptedStyleSheets ?? [];
    const inSheets = [...sheets].some((s) => {
      try {
        return [...s.cssRules].some((r) =>
          (r as CSSStyleRule).selectorText?.includes("authui-show")
        );
      } catch {
        return false;
      }
    });
    const tag = document.getElementById("authui-fouc");
    expect(inSheets || !!tag).toBe(true);
    if (tag) expect(tag.textContent).toContain("authui-show:not([ready])");
    expect(FOUC_CSS).toContain("authui-show:not([ready])");
    expect(CRITICAL_FOUC_CSS).toContain("authui-button:not(:defined)");
  });
});

describe("<authui-modal> and <authui-button>", () => {
  it('honours close-on-success="false" from HTML', async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const modal = await mount<
      HTMLElement & { open: boolean; closeOnSuccess: boolean; show: (v?: string) => void }
    >(`<authui-modal close-on-success="false"></authui-modal>`);
    expect(modal.closeOnSuccess).toBe(false);
    modal.show("sign-in");
    await modal.updateComplete;
    expect(modal.open).toBe(true);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    modal
      .shadowRoot!.querySelector("authui-sign-in")!
      .dispatchEvent(new CustomEvent("authui-success", { bubbles: true, composed: true }));
    await modal.updateComplete;
    expect(modal.open).toBe(true);
  });

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
  it("hides the Activity tab when /account/logs is unsupported", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-account tab="activity"></authui-account>`);
    await tick();
    await tick();
    await tick();
    await (el as any).updateComplete;
    const tabs = [...el.shadowRoot!.querySelectorAll("[role=tab]")].map((t) =>
      t.textContent!.trim()
    );
    expect(tabs).toEqual(["Profile", "Security", "Sessions", "Connections"]);
    expect(tabs).not.toContain("Activity");
    // Opened on activity via attr; should fall back to profile after the probe fails.
    const selected = el.shadowRoot!.querySelector('[role=tab][aria-selected="true"]');
    expect(selected?.textContent?.trim()).toBe("Profile");
    expect(shadowText(el)).not.toMatch(/No recent activity/i);
  });

  it("lists sessions", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-account tab="sessions"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toContain("Chrome");
    expect(text).toContain("This device");
    expect(text).toMatch(/Expires|Created/);
    expect(text).toContain("MFA");
    expect(el.shadowRoot!.querySelector("img.device-img, img.flag")).toBeTruthy();
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

describe("UX audit follow-ups", () => {
  it("falls back to the user icon when the avatar label is a phone number", async () => {
    const { avatarInitial } = await import("../src/icons.js");
    expect(avatarInitial("+15555550100")).not.toBe("+");
    expect(avatarInitial("Ada")).toBe("A");
    expect(avatarInitial("42")).toBe("4");
  });

  it("forces sign-in when signUp is disabled", async () => {
    authStore.configure({ ...config, signUp: false });
    await tick();
    const el = await mount<HTMLElement & { view?: string }>(
      `<authui-sign-in view="sign-up"></authui-sign-in>`
    );
    await (el as any).updateComplete;
    await tick();
    expect(shadowText(el)).not.toMatch(/Create account/i);
    expect(shadowText(el)).toMatch(/Welcome back|Sign in/i);
  });

  it("renders sign-in (not wide account) when opening account while signed out", async () => {
    authStore.configure(config);
    await tick();
    const modal = await mount<HTMLElement & { open: boolean; show: (v?: string) => void }>(
      `<authui-modal></authui-modal>`
    );
    modal.show("account");
    await modal.updateComplete;
    expect(modal.open).toBe(true);
    const dialog = modal.shadowRoot!.querySelector("dialog");
    expect(dialog?.classList.contains("wide")).toBe(false);
    expect(modal.shadowRoot!.querySelector("authui-sign-in")).not.toBeNull();
    expect(modal.shadowRoot!.querySelector("authui-account")).toBeNull();
  });

  it("shows Resend code and a phone icon on the SMS code screen", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: true, phone: true, oauth: [] },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    const phoneBtn = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /phone/i.test(b.textContent ?? "")
    );
    expect(phoneBtn).toBeTruthy();
    phoneBtn!.click();
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector("#authui-phone") as HTMLInputElement;
    input.value = "+15555550100";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const form = el.shadowRoot!.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toMatch(/Resend code/);
    expect(text).toMatch(/Use a different phone/);
    expect(text).not.toMatch(/Send code ·|Send code\s*·/);
  });
});

describe("auth notice and last-method bugs", () => {
  it("keeps passwordUpdated notice after reset navigates to sign-in", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;

    (el as any).recovery = { userId: "u9", secret: "s9" };
    (el as any).go("reset-password");
    await (el as any).updateComplete;

    const root = el.shadowRoot!;
    const pw = root.querySelectorAll<HTMLInputElement>("input[type=password]");
    expect(pw.length).toBeGreaterThanOrEqual(2);
    pw[0].value = "new-password-1";
    pw[0].dispatchEvent(new Event("input"));
    pw[1].value = "new-password-1";
    pw[1].dispatchEvent(new Event("input"));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect((el as any).step).toBe("sign-in");
    expect(shadowText(el)).toContain("Your password was updated");
  });

  it("keeps oauth-failed redirect notice visible after signed-out sync", async () => {
    window.history.replaceState(null, "", "/app?authui=oauth-failed&error=denied");
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().pending).toMatchObject({ type: "notice", tone: "error" });
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toMatch(
      /provider failed|Sign in with the provider failed|failed\. Please try again/i
    );
    // Force another signed-out sync (the path that used to wipe the notice).
    await authStore.refresh();
    await tick();
    await (el as any).updateComplete;
    expect(shadowText(el)).toMatch(
      /provider failed|Sign in with the provider failed|failed\. Please try again/i
    );
    expect(authStore.getState().pending).toMatchObject({ type: "notice", tone: "error" });
  });

  it("shows configError once without a stacked pending notice", async () => {
    account.get.mockRejectedValueOnce({
      type: "project_not_found",
      message: "Project with the requested ID could not be found.",
      code: 404,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    authStore.configure(config);
    await tick();
    await tick();
    const hint = authStore.getState().configError;
    expect(hint).toBeTruthy();
    expect(authStore.getState().pending).toBeNull();

    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toContain(hint!);
    // Message appears once (sticky configError), not twice (notice + banner).
    const first = text.indexOf(hint!);
    const second = text.indexOf(hint!, first + hint!.length);
    expect(second).toBe(-1);
    warn.mockRestore();
  });

  it("does not pin Last used on OAuth click before a successful session", async () => {
    const { clearLastMethod, getLastMethod } = await import("../src/last-method.js");
    clearLastMethod();
    authStore.configure(config);
    await tick();
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;

    account.createOAuth2Token.mockImplementation(() => undefined);
    const github = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").toLowerCase().includes("github")
    )!;
    github.click();
    await tick();
    await tick();
    expect(getLastMethod()).toBeNull();
    expect(account.createOAuth2Token).toHaveBeenCalled();
  });
});

describe("account step-up and cooldown", () => {
  it("retries the protected action after step-up MFA verify", async () => {
    const err = (type: string, code = 401) => Object.assign(new Error(type), { type, code });
    let createCalls = 0;
    account.createMFARecoveryCodes.mockImplementation(async () => {
      createCalls += 1;
      if (createCalls === 1) throw err("user_challenge_required");
      return { recoveryCodes: ["aaaa-bbbb", "cccc-dddd"] };
    });

    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-account tab="security"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;

    const viewBtn = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /view recovery|generate recovery/i.test(b.textContent ?? "")
    );
    expect(viewBtn).toBeTruthy();
    viewBtn!.click();
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect((el as any).stepUp).toBeTruthy();

    const factorBtn = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /authenticator/i.test(b.textContent ?? "")
    );
    expect(factorBtn).toBeTruthy();
    factorBtn!.click();
    await tick();
    await (el as any).updateComplete;

    const codeInput = el.shadowRoot!.querySelector<HTMLInputElement>("#acc-stepup");
    expect(codeInput).toBeTruthy();
    codeInput!.value = "123456";
    codeInput!.dispatchEvent(new Event("input"));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect((el as any).stepUp).toBeNull();
    expect(createCalls).toBe(2);
    expect(shadowText(el)).toMatch(/aaaa-bbbb/);
  });

  it("ticks the verify-email cooldown label while the timer is active", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: false,
      emailVerification: false,
      phoneVerification: false,
      phone: "",
    };
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="profile"></authui-account>`);
    await tick();
    await (el as any).updateComplete;

    vi.useFakeTimers();
    try {
      (el as any).startVerifyEmailCooldown();
      await (el as any).updateComplete;
      expect(shadowText(el)).toMatch(/Sent\. You can resend in \d+ s/);
      const before = Number((shadowText(el).match(/resend in (\d+) s/) ?? [])[1]);
      expect(before).toBeGreaterThan(40);

      await vi.advanceTimersByTimeAsync(3000);
      await (el as any).updateComplete;
      const after = Number((shadowText(el).match(/resend in (\d+) s/) ?? [])[1]);
      expect(after).toBeLessThan(before);
      expect(after).toBeGreaterThan(0);
    } finally {
      (el as any).clearVerifyEmailCooldownTimer();
      vi.useRealTimers();
    }
  });
});

describe("user-button menu placement", () => {
  it("flips the menu above the trigger when space below is tight", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    const el = await mount<HTMLElement>(`<authui-user-button></authui-user-button>`);
    await tick();
    await (el as any).updateComplete;

    el.shadowRoot!.querySelector<HTMLButtonElement>(".trigger")!.click();
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
    const menu = el.shadowRoot!.querySelector(".menu") as HTMLElement;
    expect(menu).not.toBeNull();

    // Near the bottom: almost no room below, plenty above.
    Object.defineProperty(trigger, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: 500,
        bottom: 532,
        left: 200,
        right: 232,
        width: 32,
        height: 32,
        x: 200,
        y: 500,
        toJSON() {
          return this;
        },
      }),
    });
    Object.defineProperty(menu, "offsetHeight", { configurable: true, get: () => 180 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 540 });

    (el as any).placeMenu();
    await (el as any).updateComplete;

    expect((el as any).menuAbove).toBe(true);
    expect(el.shadowRoot!.querySelector(".menu")!.classList.contains("above")).toBe(true);
  });
});

describe("0.1.10 features", () => {
  it("updates the password strength meter live while typing on sign-up", async () => {
    authStore.configure(config);
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in view="sign-up"></authui-sign-in>`);
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const pw = root.querySelector("#authui-password") as HTMLInputElement;
    expect(pw).toBeTruthy();
    expect(root.querySelector(".strength")).toBeNull();
    pw.value = "Aa1!";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    await (el as any).updateComplete;
    expect(root.querySelector(".strength")).not.toBeNull();
    expect(shadowText(el)).toMatch(/weak|fair|strong|too weak/i);
    pw.value = "Aa1!Aa1!Longer";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    await (el as any).updateComplete;
    expect(shadowText(el)).toMatch(/strong|fair/i);
  });

  it("requires legal acceptance on sign-up when configured", async () => {
    authStore.configure({
      ...config,
      legal: { termsUrl: "/terms", privacyUrl: "/privacy", requireAcceptance: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in view="sign-up"></authui-sign-in>`);
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const box = root.querySelector(".legal-accept input") as HTMLInputElement;
    expect(box).toBeTruthy();
    expect(box.checked).toBe(false);
    const name = root.querySelector("#authui-name") as HTMLInputElement;
    const email = root.querySelector("#authui-email") as HTMLInputElement;
    const pw = root.querySelector("#authui-password") as HTMLInputElement;
    name.value = "Ada";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    email.value = "new@example.com";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    pw.value = "password123";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any).legalAccepted).toBe(false);
    root
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any).error).toMatch(/Accept the terms/i);
    expect(shadowText(el)).toMatch(/Accept the terms/i);
    expect(authStore.getState().status).not.toBe("signed-in");
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any).legalAccepted).toBe(true);
  });

  it("renders icon oauth layout when methods.oauthLayout is icon", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: true, oauth: ["google", "github", "apple"], oauthLayout: "icon" },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    const providers = el.shadowRoot!.querySelector(".providers");
    expect(providers?.classList.contains("icon")).toBe(true);
    expect(providers?.classList.contains("accordion")).toBe(false);
  });

  it("renders custom menuItems on the user button", async () => {
    authStore.configure(config);
    await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
    await tick();
    const el = await mount<HTMLElement & { menuItems: unknown[] }>(
      `<authui-user-button></authui-user-button>`
    );
    el.menuItems = [
      { label: "Billing", actionId: "billing" },
      { label: "Docs", href: "/docs" },
    ];
    await (el as any).updateComplete;
    el.shadowRoot!.querySelector<HTMLButtonElement>(".trigger")!.click();
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const items = [...root.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent?.trim());
    expect(items.some((t) => t === "Billing")).toBe(true);
    expect(items.some((t) => t === "Docs")).toBe(true);
    const link = root.querySelector('a.menu-item[href="/docs"]');
    expect(link).not.toBeNull();
    let fired: string | null = null;
    el.addEventListener("authui-menu-action", ((e: CustomEvent) => {
      fired = e.detail.actionId;
    }) as EventListener);
    const billing = [...root.querySelectorAll("button.menu-item")].find((b) =>
      /Billing/.test(b.textContent ?? "")
    )!;
    billing.click();
    expect(fired).toBe("billing");
  });

  it("parses require-acceptance and oauth-layout on authui-config", async () => {
    await mount(
      `<authui-config endpoint="https://x/v1" project="p" terms-url="/t" privacy-url="/p" require-acceptance="true" oauth-layout="stack" methods="email-password oauth:google"></authui-config>`
    );
    const cfg = authStore.getConfig()!;
    expect(cfg.legal?.requireAcceptance).toBe(true);
    expect(cfg.methods?.oauthLayout).toBe("stack");
  });
});

describe("0.1.11 sign-in fixes", () => {
  it("disables passwordless entry buttons while busy", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: true, magicUrl: true, emailOtp: true, phone: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    (el as any).busy = true;
    await (el as any).updateComplete;
    const buttons = [...el.shadowRoot!.querySelectorAll("button.btn-secondary")];
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    for (const b of buttons) {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("starts OTP resend cooldown after the initial send", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: false, emailOtp: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    (el as any).go("email-otp");
    await (el as any).updateComplete;
    const email = el.shadowRoot!.querySelector("#authui-email") as HTMLInputElement;
    email.value = "a@b.co";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect((el as any).token?.kind).toBe("email-otp");
    expect((el as any).resendCooldownUntil).toBeGreaterThan(Date.now());
    const resend = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /resend code/i.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    expect(resend).toBeTruthy();
    expect(resend.disabled).toBe(true);
  });

  it("toggles show-password independently on reset confirm field", async () => {
    authStore.configure(config);
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    (el as any).recovery = { userId: "u9", secret: "s9" };
    (el as any).go("reset-password");
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const pw = root.querySelector("#authui-password") as HTMLInputElement;
    const confirm = root.querySelector("#authui-password-confirm") as HTMLInputElement;
    expect(pw.type).toBe("password");
    expect(confirm.type).toBe("password");
    const toggles = [...root.querySelectorAll(".input-wrap .btn-icon")] as HTMLButtonElement[];
    expect(toggles.length).toBe(2);
    toggles[1].click();
    await (el as any).updateComplete;
    expect(pw.type).toBe("password");
    expect(confirm.type).toBe("text");
    toggles[0].click();
    await (el as any).updateComplete;
    expect(pw.type).toBe("text");
    expect(confirm.type).toBe("text");
  });

  it("shows legal-required error near OAuth when OAuth is blocked", async () => {
    authStore.configure({
      ...config,
      legal: { termsUrl: "/terms", privacyUrl: "/privacy", requireAcceptance: true },
      methods: { emailPassword: true, oauth: ["google", "github"] },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in view="sign-up"></authui-sign-in>`);
    await (el as any).updateComplete;
    const root = el.shadowRoot!;
    const github = [...root.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").toLowerCase().includes("github")
    )!;
    github.click();
    await (el as any).updateComplete;
    expect((el as any).legalErrorFromOAuth).toBe(true);
    expect((el as any).error).toMatch(/Accept the terms/i);
    const stack = root.querySelector(".stack")!;
    const children = [...stack.children];
    const providersIdx = children.findIndex((c) => c.classList.contains("providers"));
    const alertIdx = children.findIndex((c) => c.classList.contains("alert-error"));
    expect(providersIdx).toBeGreaterThanOrEqual(0);
    expect(alertIdx).toBe(providersIdx + 1);
    // Form should not also render the same alert under the password field.
    const formAlerts = root.querySelectorAll("form .alert-error");
    expect(formAlerts.length).toBe(0);
  });

  it("reorders last-used OAuth provider first in icon layout", async () => {
    const { clearLastMethod, rememberLastMethod } = await import("../src/last-method.js");
    clearLastMethod();
    rememberLastMethod("oauth:github");
    authStore.configure({
      ...config,
      methods: {
        emailPassword: true,
        oauth: ["google", "github", "apple"],
        oauthLayout: "icon",
      },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    const buttons = [...el.shadowRoot!.querySelectorAll(".providers.icon > button")];
    expect(buttons.length).toBe(3);
    expect(buttons[0].classList.contains("last-used")).toBe(true);
    expect(buttons[0].getAttribute("aria-label")?.toLowerCase()).toMatch(/github/);
  });
});

describe("0.1.12 account UX fixes", () => {
  it("shows phone verify Resend with cooldown after Send code", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: false,
      emailVerification: true,
      phoneVerification: false,
      phone: "+15555550100",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="profile"></authui-account>`);
    await tick();
    await (el as any).updateComplete;

    const send = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /send code/i.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    expect(send).toBeTruthy();
    send.click();
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect((el as any).phoneCodeSent).toBe(true);
    expect((el as any).verifyPhoneCooldownUntil).toBeGreaterThan(Date.now());
    expect(shadowText(el)).toMatch(/Sent\. You can resend in \d+ s/);
    expect(shadowText(el)).toMatch(/Verify code/i);
    const resend = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /resend in|resend code/i.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    expect(resend).toBeTruthy();
    expect(resend.disabled).toBe(true);
  });

  it("toggles change-password reveal independently per field", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: false,
      emailVerification: true,
      phoneVerification: false,
      phone: "",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="security"></authui-account>`);
    await tick();
    await (el as any).updateComplete;

    const root = el.shadowRoot!;
    const oldPw = root.querySelector("#acc-old-password") as HTMLInputElement;
    const newPw = root.querySelector("#acc-new-password") as HTMLInputElement;
    const confirm = root.querySelector("#acc-new-password-confirm") as HTMLInputElement;
    expect(oldPw?.type).toBe("password");
    expect(newPw?.type).toBe("password");
    expect(confirm?.type).toBe("password");
    const toggles = [...root.querySelectorAll(".input-wrap .btn-icon")] as HTMLButtonElement[];
    expect(toggles.length).toBe(3);
    toggles[2].click();
    await (el as any).updateComplete;
    expect(oldPw.type).toBe("password");
    expect(newPw.type).toBe("password");
    expect(confirm.type).toBe("text");
    toggles[0].click();
    await (el as any).updateComplete;
    expect(oldPw.type).toBe("text");
    expect(confirm.type).toBe("text");
  });

  it("warns about MFA with no factors without saying before enabling", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: true,
      emailVerification: false,
      phoneVerification: false,
      phone: "",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    account.listMFAFactors.mockResolvedValueOnce({
      totp: false,
      email: false,
      phone: false,
      recoveryCode: false,
    });
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="security"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;
    const text = shadowText(el);
    expect(text).toMatch(/no factors are set up yet/i);
    expect(text).not.toMatch(/before enabling/i);
  });

  it("autofocuses Cancel on regenerate recovery and remove authenticator confirms", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: true,
      emailVerification: true,
      phoneVerification: false,
      phone: "",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    account.listMFAFactors.mockResolvedValue({
      totp: true,
      email: true,
      phone: false,
      recoveryCode: true,
    });
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="security"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;

    (el as any).confirmRegenerate = true;
    await (el as any).updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const regenCancel = el.shadowRoot!.querySelector(
      ".inline [autofocus]"
    ) as HTMLButtonElement | null;
    expect(regenCancel?.textContent?.trim()).toMatch(/cancel/i);

    (el as any).confirmRegenerate = false;
    (el as any).confirmRemoveAuthenticator = true;
    await (el as any).updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const removeCancel = el.shadowRoot!.querySelector(
      ".inline [autofocus]"
    ) as HTMLButtonElement | null;
    expect(removeCancel?.textContent?.trim()).toMatch(/cancel/i);
  });
});

describe("0.1.18 sign-in fixes", () => {
  it("keeps magic-url sent UI when setPending notice arrives while signed-out", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: true, magicUrl: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    (el as any).go("magic-url");
    await (el as any).updateComplete;
    const email = el.shadowRoot!.querySelector("#authui-email") as HTMLInputElement;
    email.value = "a@b.co";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect((el as any).step).toBe("magic-url");
    expect((el as any).token?.kind).toBe("magic-url");
    expect(shadowText(el)).toMatch(/sign-in link/i);

    authStore.setPending({
      type: "notice",
      tone: "info",
      message: "Redirect notice for QA",
    });
    await tick();
    await (el as any).updateComplete;

    expect((el as any).step).toBe("magic-url");
    expect((el as any).token?.kind).toBe("magic-url");
    expect(shadowText(el)).toMatch(/sign-in link/i);
    expect(shadowText(el)).toContain("Redirect notice for QA");
    expect(shadowText(el)).toMatch(/Resend link/i);
    expect(shadowText(el)).toMatch(/Use a different email/i);
  });

  it("keeps email-otp code entry when setPending notice arrives while signed-out", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: true, emailOtp: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    (el as any).go("email-otp");
    await (el as any).updateComplete;
    const email = el.shadowRoot!.querySelector("#authui-email") as HTMLInputElement;
    email.value = "a@b.co";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect((el as any).token?.kind).toBe("email-otp");

    authStore.setPending({
      type: "notice",
      tone: "info",
      message: "OTP notice should not wipe",
    });
    await tick();
    await (el as any).updateComplete;

    expect((el as any).step).toBe("email-otp");
    expect((el as any).token?.kind).toBe("email-otp");
    expect(shadowText(el)).toMatch(/We sent a code/i);
    expect(shadowText(el)).toContain("OTP notice should not wipe");
  });

  it("opens last-used email-otp as the initial sign-in step", async () => {
    const { clearLastMethod, rememberLastMethod } = await import("../src/last-method.js");
    clearLastMethod();
    rememberLastMethod("email-otp");
    authStore.configure({
      ...config,
      methods: { emailPassword: true, emailOtp: true, magicUrl: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    expect((el as any).step).toBe("email-otp");
    expect(shadowText(el)).toMatch(/Send code/i);
    // Back returns to main form with Last used badge still present.
    const back = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /back/i.test(b.textContent ?? "")
    )!;
    back.click();
    await (el as any).updateComplete;
    expect((el as any).step).toBe("sign-in");
    expect(shadowText(el)).toMatch(/Last used/i);
  });

  it("keeps email-password as the initial step when it was last used", async () => {
    const { clearLastMethod, rememberLastMethod } = await import("../src/last-method.js");
    clearLastMethod();
    rememberLastMethod("email-password");
    authStore.configure({
      ...config,
      methods: { emailPassword: true, emailOtp: true, magicUrl: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await tick();
    await (el as any).updateComplete;
    expect((el as any).step).toBe("sign-in");
    expect(shadowText(el)).toMatch(/Last used/i);
  });

  it("shows Resend link and Use different email after magic-url send", async () => {
    authStore.configure({
      ...config,
      methods: { emailPassword: false, magicUrl: true },
    });
    await tick();
    const el = await mount<HTMLElement>(`<authui-sign-in></authui-sign-in>`);
    await (el as any).updateComplete;
    // last-method may open magic-url; force the entry form.
    (el as any).token = null;
    (el as any).step = "magic-url";
    await (el as any).updateComplete;
    const email = el.shadowRoot!.querySelector("#authui-email") as HTMLInputElement;
    email.value = "a@b.co";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    el.shadowRoot!.querySelector("form")!.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
    await tick();
    await tick();
    await (el as any).updateComplete;
    expect((el as any).token?.kind).toBe("magic-url");
    expect((el as any).resendCooldownUntil).toBeGreaterThan(Date.now());
    const text = shadowText(el);
    expect(text).toMatch(/Resend link/i);
    expect(text).toMatch(/Use a different email/i);
    const resend = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /resend link/i.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    expect(resend).toBeTruthy();
    expect(resend.disabled).toBe(true);

    const useDifferent = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /use a different email/i.test(b.textContent ?? "")
    )!;
    useDifferent.click();
    await (el as any).updateComplete;
    expect((el as any).token).toBeNull();
    expect((el as any).step).toBe("magic-url");
    expect(el.shadowRoot!.querySelector("#authui-email")).toBeTruthy();
  });
});

describe("0.1.19 account UX fixes", () => {
  it("adds Download, Print, and a save gate before Done on recovery codes", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: true,
      emailVerification: true,
      phoneVerification: false,
      phone: "",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    account.listMFAFactors.mockResolvedValue({
      totp: true,
      email: true,
      phone: false,
      recoveryCode: true,
    });
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="security"></authui-account>`);
    await tick();
    await tick();
    await (el as any).updateComplete;

    (el as any).recoveryCodes = ["aaaa-bbbb", "cccc-dddd"];
    (el as any).recoveryCodesSaved = false;
    await (el as any).updateComplete;

    const text = shadowText(el);
    expect(text).toMatch(/aaaa-bbbb/);
    expect(text).toMatch(/Download/i);
    expect(text).toMatch(/Print/i);
    expect(text).toMatch(/I saved these codes/i);

    const done = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /^Done$/i.test((b.textContent ?? "").trim())
    ) as HTMLButtonElement;
    expect(done).toBeTruthy();
    expect(done.disabled).toBe(true);

    const checkbox = el.shadowRoot!.querySelector(
      ".legal-accept input[type=checkbox]"
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    await (el as any).updateComplete;
    expect(done.disabled).toBe(false);

    const createObjectURL = vi.fn(() => "blob:codes");
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      const download = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
        /download/i.test(b.textContent ?? "")
      )!;
      download.click();
      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:codes");
    } finally {
      clickSpy.mockRestore();
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }

    const printWin = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(printWin as unknown as Window);
    try {
      const printBtn = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
        /print/i.test(b.textContent ?? "")
      )!;
      printBtn.click();
      expect(openSpy).toHaveBeenCalled();
      expect(printWin.document.write).toHaveBeenCalled();
      expect(printWin.print).toHaveBeenCalled();
    } finally {
      openSpy.mockRestore();
    }

    done.click();
    await (el as any).updateComplete;
    expect((el as any).recoveryCodes).toBeNull();
    expect((el as any).recoveryCodesSaved).toBe(false);
  });

  it("toggles profile email and phone password reveal", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: false,
      emailVerification: true,
      phoneVerification: false,
      phone: "+15555550100",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="profile"></authui-account>`);
    await tick();
    await (el as any).updateComplete;

    (el as any).emailInput = "new@b.co";
    (el as any).phoneInput = "+15555550999";
    await (el as any).updateComplete;

    const root = el.shadowRoot!;
    const emailPw = root.querySelector("#acc-email-password") as HTMLInputElement;
    const phonePw = root.querySelector("#acc-phone-password") as HTMLInputElement;
    expect(emailPw?.type).toBe("password");
    expect(phonePw?.type).toBe("password");

    const emailToggle = emailPw
      .closest(".input-wrap")!
      .querySelector(".btn-icon") as HTMLButtonElement;
    const phoneToggle = phonePw
      .closest(".input-wrap")!
      .querySelector(".btn-icon") as HTMLButtonElement;
    emailToggle.click();
    await (el as any).updateComplete;
    expect(emailPw.type).toBe("text");
    expect(phonePw.type).toBe("password");
    phoneToggle.click();
    await (el as any).updateComplete;
    expect(phonePw.type).toBe("text");
  });

  it("cancels phone verify mid-flow and returns to phone edit", async () => {
    account.state.user = {
      $id: "u1",
      email: "a@b.co",
      name: "Test",
      mfa: false,
      emailVerification: true,
      phoneVerification: false,
      phone: "+15555550100",
      passwordUpdate: "2024-01-01T00:00:00.000Z",
    };
    authStore.configure(config);
    await authStore.refresh();
    const el = await mount<HTMLElement>(`<authui-account tab="profile"></authui-account>`);
    await tick();
    await (el as any).updateComplete;

    const send = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /send code/i.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    send.click();
    await tick();
    await tick();
    await (el as any).updateComplete;

    expect((el as any).phoneCodeSent).toBe(true);
    expect(shadowText(el)).toMatch(/Use a different phone number/i);

    const cancel = [...el.shadowRoot!.querySelectorAll("button")].find((b) =>
      /use a different phone number/i.test(b.textContent ?? "")
    )!;
    cancel.click();
    await (el as any).updateComplete;

    expect((el as any).phoneCodeSent).toBe(false);
    expect((el as any).phoneCode).toBe("");
    expect((el as any).verifyPhoneCooldownUntil).toBe(0);
    expect(el.shadowRoot!.querySelector("#acc-phone")).toBeTruthy();
    expect(shadowText(el)).toMatch(/Send code/i);
    expect(shadowText(el)).not.toMatch(/Use a different phone number/i);
  });
});
