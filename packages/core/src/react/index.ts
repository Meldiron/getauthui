import {
  Fragment,
  createElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { authStore } from "../store.js";
import { openModal, closeModal } from "../modal-controller.js";
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

/** Configures Auth UI once and renders children. Put it near the root of your app. */
export function AuthUIProvider({
  config,
  children,
}: {
  config: AuthUIConfig;
  children?: ReactNode;
}): ReactElement {
  useEffect(() => {
    authStore.configure(config);
  }, [config.endpoint, config.project]);
  return createElement(Fragment, null, children);
}

export function AuthUIModal(props: {
  view?: AuthUIView;
  open?: boolean;
  closeOnSuccess?: boolean;
}): ReactElement {
  return createElement("authui-modal", {
    view: props.view,
    open: props.open || undefined,
    "close-on-success": props.closeOnSuccess === false ? undefined : "",
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
 */
export function Show(props: {
  when?: string;
  unless?: string;
  children?: ReactNode;
}): ReactElement {
  return createElement("authui-show", { when: props.when, unless: props.unless }, props.children);
}
