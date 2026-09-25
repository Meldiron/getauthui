import {
  Fragment,
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { authStore } from "../store.js";
import { openModal, closeModal } from "../modal-controller.js";
import { matchesAuthStatus } from "../components/authui-show.js";
import type { Models } from "appwrite";
import type {
  AuthUIConfig,
  AuthUIMenuItem,
  AuthUIState,
  AuthUIStatus,
  AuthUIView,
} from "../types.js";

/** DOM props forwarded onto the underlying authui-* custom element. */
type HostDomProps = {
  className?: string;
  style?: CSSProperties;
  id?: string;
};

function hostDom(props: HostDomProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (props.className !== undefined) out.className = props.className;
  if (props.style !== undefined) out.style = props.style;
  if (props.id !== undefined) out.id = props.id;
  return out;
}

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
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() =>
    authStore.getActiveTeamId()
  );
  useEffect(() => authStore.on("change", setState), []);
  useEffect(
    () =>
      authStore.on("active-team", (detail) => {
        setActiveTeamId(detail.teamId);
      }),
    []
  );
  return {
    ...state,
    activeTeamId,
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

export function AuthUIModal(
  props: {
    view?: AuthUIView;
    open?: boolean;
    closeOnSuccess?: boolean;
    /** Called when the dialog wants to change open state (e.g. Esc, backdrop, X). */
    onOpenChange?: (open: boolean) => void;
    /** Fired when a sign-in flow inside the modal completes. */
    onSignedIn?: (user: Models.User<Models.Preferences>) => void;
    /** Fired when the modal closes (Esc, backdrop, X, hide, or closeOnSuccess). */
    onClose?: () => void;
  } & HostDomProps
): ReactElement {
  const [el, setEl] = useState<AuthUIModalElement | null>(null);
  useEffect(() => {
    if (!el || props.closeOnSuccess === undefined) return;
    el.closeOnSuccess = props.closeOnSuccess;
  }, [el, props.closeOnSuccess]);
  useEffect(() => {
    if (!el || typeof props.open !== "boolean") return;
    el.open = props.open;
  }, [el, props.open]);
  useEffect(() => {
    if (!el || (!props.onOpenChange && !props.onClose)) return;
    const onCloseEvt = () => {
      props.onOpenChange?.(false);
      props.onClose?.();
    };
    el.addEventListener("authui-close", onCloseEvt);
    return () => el.removeEventListener("authui-close", onCloseEvt);
  }, [el, props.onOpenChange, props.onClose]);
  useEffect(() => {
    if (!el || !props.onSignedIn) return;
    const handler = (e: Event) => {
      const user = (e as CustomEvent<Models.User<Models.Preferences>>).detail;
      if (user) props.onSignedIn?.(user);
    };
    el.addEventListener("authui-signed-in", handler);
    return () => el.removeEventListener("authui-signed-in", handler);
  }, [el, props.onSignedIn]);
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
    ...hostDom(props),
  });
}

export function AuthUIButton(
  props: {
    view?: AuthUIView;
    variant?: "primary" | "brand" | "outline" | "secondary" | "ghost" | "link";
    size?: "sm" | "md" | "lg";
    children?: ReactNode;
  } & HostDomProps
): ReactElement {
  return createElement(
    "authui-button",
    { view: props.view, variant: props.variant, size: props.size, ...hostDom(props) },
    props.children
  );
}

export function AuthUISignIn(
  props: {
    view?: Exclude<AuthUIView, "account">;
    /** Prefill the email field. */
    email?: string;
    /** Alternate email prefill (WorkOS-style login_hint). */
    loginHint?: string;
    /** Fired when a sign-in flow completes. Receives Lit's `{ method }` detail. */
    onSuccess?: (detail: { method: string }) => void;
    /** Fired when the visible screen changes (`authui-view`). */
    onView?: (detail: { view: string }) => void;
  } & HostDomProps
): ReactElement {
  return createElement(SignInBridge, props);
}

function SignInBridge(
  props: {
    view?: Exclude<AuthUIView, "account">;
    email?: string;
    loginHint?: string;
    onSuccess?: (detail: { method: string }) => void;
    onView?: (detail: { view: string }) => void;
  } & HostDomProps
): ReactElement {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!el || !props.onSuccess) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ method?: string }>).detail ?? { method: "" };
      props.onSuccess?.({ method: detail.method ?? "" });
    };
    el.addEventListener("authui-success", handler);
    return () => el.removeEventListener("authui-success", handler);
  }, [el, props.onSuccess]);
  useEffect(() => {
    if (!el || !props.onView) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ view?: string }>).detail ?? { view: "" };
      props.onView?.({ view: detail.view ?? "" });
    };
    el.addEventListener("authui-view", handler);
    return () => el.removeEventListener("authui-view", handler);
  }, [el, props.onView]);
  return createElement("authui-sign-in", {
    ref: setEl,
    view: props.view,
    email: props.email,
    "login-hint": props.loginHint,
    ...hostDom(props),
  });
}

export function AuthUIAccount(
  props: {
    tab?: "profile" | "security" | "sessions" | "connections" | "consents" | "activity";
  } & HostDomProps
): ReactElement {
  return createElement("authui-account", { tab: props.tab, ...hostDom(props) });
}

type AuthUIUserButtonElement = HTMLElement & {
  showTeams: boolean;
  menuItems: AuthUIMenuItem[];
};

export function AuthUIUserButton(
  props: {
    src?: string;
    showTeams?: boolean;
    menuItems?: AuthUIMenuItem[];
    onMenuAction?: (actionId: string) => void;
    /** Fired when the user picks an active team (`authui-active-team`). */
    onActiveTeam?: (detail: {
      teamId: string | null;
      team: { $id: string; name: string } | null;
    }) => void;
    children?: ReactNode;
  } & HostDomProps
): ReactElement {
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
  useEffect(() => {
    if (!el || !props.onActiveTeam) return;
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          teamId?: string | null;
          team?: { $id: string; name: string } | null;
        }>
      ).detail;
      props.onActiveTeam?.({
        teamId: detail?.teamId ?? null,
        team: detail?.team ?? null,
      });
    };
    el.addEventListener("authui-active-team", handler);
    return () => el.removeEventListener("authui-active-team", handler);
  }, [el, props.onActiveTeam]);
  return createElement(
    "authui-user-button",
    {
      ref: setEl,
      src: props.src,
      // Lit boolean attrs treat presence as true; omit when false/undefined.
      "show-teams": props.showTeams === true ? "" : undefined,
      ...hostDom(props),
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
  when?: AuthUIStatus | AuthUIStatus[] | (string & {});
  unless?: AuthUIStatus | AuthUIStatus[] | (string & {});
  children?: ReactNode;
}): ReactElement | null {
  const { status } = useAuthUI();
  const when =
    props.when === undefined
      ? undefined
      : Array.isArray(props.when)
        ? props.when.join(",")
        : props.when;
  const unless =
    props.unless === undefined
      ? undefined
      : Array.isArray(props.unless)
        ? props.unless.join(",")
        : props.unless;
  if (!matchesAuthStatus(status, when, unless)) return null;
  return createElement(Fragment, null, props.children);
}
