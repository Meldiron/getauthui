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
import type { AuthUIConfig, AuthUIState, AuthUIView } from "../types.js";

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

/** Stable fingerprint so any relevant config change reconfigures the store. */
function configFingerprint(config: AuthUIConfig): string {
  return JSON.stringify(config);
}

/**
 * Configures Auth UI and renders children. Put it near the root of your app.
 *
 * Configuration runs during render (not in an effect) so the first paint already
 * sees `configured: true` and a non-null `getClient()` when `endpoint` and
 * `project` are present. Changing any config field reconfigures the store.
 * `configure()` is idempotent, so React Strict Mode double-invoke is safe.
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
    authStore.configure(config);
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
  return createElement("authui-modal", {
    ref: setEl,
    view: props.view,
    open: props.open || undefined,
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

export function AuthUIUserButton(props: { src?: string; children?: ReactNode }): ReactElement {
  return createElement("authui-user-button", { src: props.src }, props.children);
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
