import {
  Fragment,
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { authStore } from "../store.js";
import { openModal, closeModal } from "../modal-controller.js";
import { matchesAuthStatus } from "../components/authui-show.js";
import type { AuthUIConfig, AuthUIMenuItem, AuthUIState, AuthUIView } from "../types.js";

// Register the custom elements when this module loads.
import "../components/authui-config.js";
import "../components/authui-show.js";
import "../components/authui-sign-in.js";
import "../components/authui-account.js";
import "../components/authui-modal.js";
import "../components/authui-button.js";
import "../components/authui-user-button.js";

/** Subscribe to Auth UI state and get the imperative helpers. */
export function useAuthUI() {
  const [state, setState] = useState<AuthUIState>(() => authStore.getState());
  useEffect(() => authStore.on("change", setState), []);
  return {
    ...state,
    open: openModal,
    close: closeModal,
    signOut: () => authStore.signOut(),
    store: authStore,
  };
}

/** Recursively sort object keys so equal values fingerprint the same. */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

/** Stable fingerprint so any relevant config change reconfigures the store. */
function configFingerprint(config: AuthUIConfig): string {
  return JSON.stringify(canonicalize(config));
}

/**
 * Configures Auth UI and renders children. Put it near the root of your app.
 *
 * Configuration runs during render (not in an effect) so the first paint already
 * sees `configured: true` and a non-null `getClient()` when `endpoint` and
 * `project` are present. Incomplete config (empty endpoint or project) mirrors
 * `<authui-config>`: it does not mark configured, and surfaces `configError`.
 * Changing any config field reconfigures the store. Passing a new object with
 * the same values is fine; the fingerprint sorts keys so insertion order does
 * not matter. `configure()` is idempotent, so React Strict Mode double-invoke
 * is safe.
 */
export function AuthUIProvider({
  config,
  children,
}: {
  config: AuthUIConfig;
  children?: ReactNode;
}): ReactElement {
  const fingerprint = configFingerprint(config);
  const lastFingerprint = useRef<string | null>(null);
  if (lastFingerprint.current !== fingerprint) {
    lastFingerprint.current = fingerprint;
    const endpoint = config.endpoint?.trim() ?? "";
    const project = config.project?.trim() ?? "";
    if (!endpoint || !project) {
      authStore.notifyConfigIncomplete();
    } else {
      authStore.configure(config);
    }
  }
  return createElement(Fragment, null, children);
}

type AuthUIModalElement = HTMLElement & { closeOnSuccess: boolean; open: boolean };

export function AuthUIModal(props: {
  view?: AuthUIView;
  open?: boolean;
  closeOnSuccess?: boolean;
}): ReactElement {
  const [el, setEl] = useState<AuthUIModalElement | null>(null);
  useEffect(() => {
    if (!el || props.closeOnSuccess === undefined) return;
    el.closeOnSuccess = props.closeOnSuccess;
  }, [el, props.closeOnSuccess]);
  useEffect(() => {
    if (!el || typeof props.open !== "boolean") return;
    el.open = props.open;
  }, [el, props.open]);
  return createElement("authui-modal", {
    ref: setEl,
    view: props.view,
    // Preserve boolean false; `props.open || undefined` would drop it and leave
    // the dialog open. Controlled writes also go through the effect above.
    open: props.open === undefined ? undefined : props.open,
    // Lit boolean attrs treat presence as true; write the string "false" so HTML
    // and React can turn the default off. Also set the JS property above.
    "close-on-success":
      props.closeOnSuccess === false ? "false" : props.closeOnSuccess === true ? "" : undefined,
  });
}

export function AuthUIButton(props: {
  view?: AuthUIView;
  variant?: "primary" | "brand" | "outline" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}): ReactElement {
  return createElement(
    "authui-button",
    { view: props.view, variant: props.variant, size: props.size },
    props.children
  );
}

export function AuthUISignIn(props: {
  view?: Exclude<AuthUIView, "account">;
  onSuccess?: () => void;
}): ReactElement {
  return createElement(SignInBridge, props);
}

function SignInBridge(props: {
  view?: Exclude<AuthUIView, "account">;
  onSuccess?: () => void;
}): ReactElement {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!el || !props.onSuccess) return;
    const handler = () => props.onSuccess?.();
    el.addEventListener("authui-success", handler);
    return () => el.removeEventListener("authui-success", handler);
  }, [el, props.onSuccess]);
  return createElement("authui-sign-in", { ref: setEl, view: props.view });
}

export function AuthUIAccount(props: {
  tab?: "profile" | "security" | "sessions" | "connections" | "activity";
}): ReactElement {
  return createElement("authui-account", { tab: props.tab });
}

type AuthUIUserButtonElement = HTMLElement & {
  showTeams: boolean;
  menuItems: AuthUIMenuItem[];
};

export function AuthUIUserButton(props: {
  src?: string;
  showTeams?: boolean;
  menuItems?: AuthUIMenuItem[];
  onMenuAction?: (actionId: string) => void;
  children?: ReactNode;
}): ReactElement {
  const [el, setEl] = useState<AuthUIUserButtonElement | null>(null);
  useEffect(() => {
    if (!el || props.showTeams === undefined) return;
    el.showTeams = props.showTeams;
  }, [el, props.showTeams]);
  useEffect(() => {
    if (!el) return;
    el.menuItems = props.menuItems ?? [];
  }, [el, props.menuItems]);
  useEffect(() => {
    if (!el || !props.onMenuAction) return;
    const handler = (e: Event) => {
      const actionId = (e as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId) props.onMenuAction?.(actionId);
    };
    el.addEventListener("authui-menu-action", handler);
    return () => el.removeEventListener("authui-menu-action", handler);
  }, [el, props.onMenuAction]);
  return createElement(
    "authui-user-button",
    {
      ref: setEl,
      src: props.src,
      // Lit boolean attrs treat presence as true; omit when false/undefined.
      "show-teams": props.showTeams === true ? "" : undefined,
    },
    props.children
  );
}

/**
 * Renders children only while the auth status matches.
 * `when` and `unless` accept a status or a comma separated list:
 * `signed-in`, `signed-out`, `mfa-required`, `loading`.
 *
 * Unlike the Lit `<authui-show>` element (which only skips its slot), this
 * React wrapper returns `null` so children are not mounted while hidden.
 */
export function Show(props: {
  when?: string;
  unless?: string;
  children?: ReactNode;
}): ReactElement | null {
  const { status } = useAuthUI();
  if (!matchesAuthStatus(status, props.when, props.unless)) return null;
  return createElement(Fragment, null, props.children);
}
