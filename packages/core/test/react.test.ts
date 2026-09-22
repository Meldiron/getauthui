import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { config, tick, type AccountMock } from "./mocks.js";

// Custom elements can only be registered once per jsdom page, so mock once
// and import the React entry a single time (same pattern as components.test.ts).
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
    Teams: class {
      list = vi.fn(async () => ({ teams: [] }));
    },
    Avatars: class {
      getQR(text: string) {
        return `https://example.com/qr?text=${encodeURIComponent(text)}`;
      }
    },
    ID: { unique: () => "unique()" },
  };
});

import {
  AuthUIProvider,
  Show,
  useAuthUI,
  AuthUIModal,
  AuthUIUserButton,
} from "../src/react/index.js";
import { authStore } from "../src/store.js";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let account: AccountMock;

beforeEach(async () => {
  account = (globalThis as any).__account as AccountMock;
  account.state.user = null;
  account.state.mfaPending = false;
  account.state.blocked = false;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  window.history.replaceState(null, "", "/app");
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

function Probe({ onClient }: { onClient: (client: unknown) => void }) {
  const { configured, store } = useAuthUI();
  onClient({ configured, client: store.getClient() });
  return null;
}

function MountTracker({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return createElement("span", { "data-testid": "child" }, "secret");
}

describe("React Show (D3)", () => {
  it("does not mount children while the status does not match", async () => {
    authStore.configure(config);
    await tick();
    await tick();
    expect(authStore.getState().status).toBe("signed-out");

    const mounts: string[] = [];
    const onMount = () => mounts.push("signed-in-child");
    render(createElement(Show, { when: "signed-in" }, createElement(MountTracker, { onMount })));
    expect(mounts).toEqual([]);
    expect(container.textContent).not.toContain("secret");

    await act(async () => {
      await authStore.signInWithEmailPassword("a@b.co", "correct-horse");
      await tick();
    });

    expect(container.textContent).toContain("secret");
    expect(mounts).toContain("signed-in-child");
  });
});

describe("React AuthUIProvider (D4+D5)", () => {
  it("configures before children render so getClient() is available on first paint", () => {
    const paints: { configured: boolean; client: unknown }[] = [];
    render(
      createElement(
        AuthUIProvider,
        { config },
        createElement(Probe, {
          onClient: (snap) => paints.push(snap as { configured: boolean; client: unknown }),
        })
      )
    );
    expect(paints.length).toBeGreaterThan(0);
    expect(paints[0].configured).toBe(true);
    expect(paints[0].client).not.toBeNull();
  });

  it("reconfigures when methods or branding change", async () => {
    function Harness() {
      const [cfg, setCfg] = useState({
        ...config,
        methods: { emailPassword: true, oauth: ["google"] as "google"[] },
        branding: { name: "Acme" },
      });
      return createElement(
        "div",
        null,
        createElement(AuthUIProvider, { config: cfg }, null),
        createElement(
          "button",
          {
            type: "button",
            onClick: () =>
              setCfg({
                ...config,
                methods: {
                  emailPassword: true,
                  magicUrl: true,
                  oauth: ["github"] as "github"[],
                },
                branding: { name: "Beta" },
              }),
          },
          "update"
        )
      );
    }

    render(createElement(Harness));
    await tick();
    expect(authStore.getConfig()?.branding?.name).toBe("Acme");
    expect(authStore.getConfig()?.methods?.oauth).toEqual(["google"]);

    await act(async () => {
      container.querySelector("button")!.click();
    });
    expect(authStore.getConfig()?.branding?.name).toBe("Beta");
    expect(authStore.getConfig()?.methods?.magicUrl).toBe(true);
    expect(authStore.getConfig()?.methods?.oauth).toEqual(["github"]);
  });
});

describe("React AuthUIModal closeOnSuccess (D6)", () => {
  it('maps closeOnSuccess={false} to the string attribute "false" and the JS property', async () => {
    authStore.configure(config);
    await tick();
    render(createElement(AuthUIModal, { closeOnSuccess: false }));
    await act(async () => {
      await Promise.resolve();
    });
    const modal = container.querySelector("authui-modal") as HTMLElement & {
      closeOnSuccess: boolean;
    };
    expect(modal).not.toBeNull();
    expect(modal.getAttribute("close-on-success")).toBe("false");
    expect(modal.closeOnSuccess).toBe(false);
  });
});

describe("React AuthUIUserButton showTeams", () => {
  it("maps showTeams to the show-teams attribute and JS property", async () => {
    authStore.configure(config);
    await tick();
    render(createElement(AuthUIUserButton, { showTeams: true }));
    await act(async () => {
      await Promise.resolve();
    });
    const btn = container.querySelector("authui-user-button") as HTMLElement & {
      showTeams: boolean;
    };
    expect(btn).not.toBeNull();
    expect(btn.hasAttribute("show-teams")).toBe(true);
    expect(btn.showTeams).toBe(true);
  });
});
