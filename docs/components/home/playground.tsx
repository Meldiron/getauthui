"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUIConfig, OAuthProviderName } from "@getauthui/core";
import { CodeBlock } from "@/components/home/code-block";
import { T } from "@/components/home/code-tokens";

const PROVIDERS: OAuthProviderName[] = [
  "google",
  "github",
  "apple",
  "microsoft",
  "discord",
  "facebook",
  "x",
  "linkedin",
  "slack",
  "gitlab",
];
const STORAGE_KEY = "authui-playground-v2";

interface Settings {
  endpoint: string;
  project: string;
  name: string;
  emailPassword: boolean;
  magicUrl: boolean;
  emailOtp: boolean;
  phone: boolean;
  anonymous: boolean;
  oauth: OAuthProviderName[];
  signUp: boolean;
  theme: "auto" | "light" | "dark";
  radius: "none" | "sm" | "md" | "lg" | "xl";
  primary: string;
  preview: boolean;
}

const defaults: Settings = {
  endpoint: "https://cloud.appwrite.io/v1",
  project: "",
  name: "Acme",
  emailPassword: true,
  magicUrl: false,
  emailOtp: true,
  phone: false,
  anonymous: true,
  oauth: ["google", "github"],
  signUp: true,
  theme: "auto",
  radius: "md",
  primary: "",
  preview: true,
};

function toConfig(s: Settings): AuthUIConfig {
  return {
    endpoint: s.endpoint,
    project: s.project || "playground",
    methods: {
      emailPassword: s.emailPassword,
      magicUrl: s.magicUrl,
      emailOtp: s.emailOtp,
      phone: s.phone,
      anonymous: s.anonymous,
      oauth: s.oauth,
    },
    signUp: s.signUp,
    branding: {
      name: s.name || undefined,
      theme: s.theme,
      radius: s.radius,
      primary: s.primary || undefined,
    },
    preview: s.preview,
  };
}

function toHtml(s: Settings): string {
  const methods = [
    s.emailPassword && "email-password",
    s.magicUrl && "magic-url",
    s.emailOtp && "email-otp",
    s.phone && "phone",
    s.anonymous && "anonymous",
    ...s.oauth.map((p) => `oauth:${p}`),
  ]
    .filter(Boolean)
    .join(" ");
  const attrs = [
    `endpoint="${s.endpoint}"`,
    `project="${s.project || "my-project"}"`,
    `methods="${methods}"`,
    s.name ? `name="${s.name}"` : "",
    !s.signUp ? `sign-up="false"` : "",
    s.theme !== "auto" ? `theme="${s.theme}"` : "",
    s.radius !== "md" ? `radius="${s.radius}"` : "",
    s.primary ? `primary="${s.primary}"` : "",
    s.preview ? `preview` : "",
  ].filter(Boolean);
  return `<authui-config\n  ${attrs.join("\n  ")}\n></authui-config>`;
}

export function Playground() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"sign-in" | "account">("sign-in");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings({ ...defaults, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
  }, []);

  const config = useMemo(() => toConfig(settings), [settings]);

  useEffect(() => {
    let cancelled = false;
    import("@getauthui/core").then(({ authStore }) => {
      if (cancelled) return;
      authStore.configure(config);
      setReady(true);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, [config, settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  // In preview mode the account screen should show the sample user, not a login form.
  useEffect(() => {
    if (!ready || view !== "account" || !settings.preview) return;
    import("@getauthui/core").then(({ authStore }) => {
      if (authStore.getState().status !== "signed-in") void authStore.previewSignIn();
    });
  }, [ready, view, settings.preview, config]);
  const toggleProvider = (p: OAuthProviderName) =>
    set(
      "oauth",
      settings.oauth.includes(p) ? settings.oauth.filter((x) => x !== p) : [...settings.oauth, p]
    );

  const field =
    "h-9 w-full rounded-md border border-fd-border bg-transparent px-3 text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-fd-ring/50 focus-visible:border-fd-ring";
  const label = "text-[13px] font-medium";
  const check = (checked: boolean, onChange: () => void, text: string) => (
    <label key={text} className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
      <input
        type="checkbox"
        className="accent-[var(--brand-cta)]"
        checked={checked}
        onChange={onChange}
      />
      {text}
    </label>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] items-start">
      <aside className="rounded-xl border border-fd-border bg-fd-card/50 overflow-hidden text-[14px]">
        <div className="px-5 py-4 border-b border-fd-border">
          <h2 className="text-[15px] font-semibold">Mode</h2>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2 border-b border-fd-border">
          {check(settings.preview, () => set("preview", !settings.preview), "Preview mode")}
          <p className="text-[12px] leading-5 text-fd-muted-foreground">
            {settings.preview
              ? "No requests are made. Any email, password or code works, and a sample account with sessions, MFA and connections is used."
              : "Live mode. Requests go to the endpoint and project below, which must list this hostname as a Web platform."}
          </p>
        </div>
        <div className="px-5 py-4 border-b border-fd-border">
          <h2 className="text-[15px] font-semibold">Project</h2>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4 border-b border-fd-border">
          <div className="flex flex-col gap-1.5">
            <span className={label}>Endpoint</span>
            <input
              className={field}
              value={settings.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={label}>Project ID</span>
            <input
              className={field}
              placeholder="my-project"
              value={settings.project}
              onChange={(e) => set("project", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={label}>Product name</span>
            <input
              className={field}
              value={settings.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-b border-fd-border">
          <h2 className="text-[15px] font-semibold">Methods</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-fd-border">
          {check(
            settings.emailPassword,
            () => set("emailPassword", !settings.emailPassword),
            "Email + password"
          )}
          {check(settings.signUp, () => set("signUp", !settings.signUp), "Sign up")}
          {check(settings.magicUrl, () => set("magicUrl", !settings.magicUrl), "Magic URL")}
          {check(settings.emailOtp, () => set("emailOtp", !settings.emailOtp), "Email OTP")}
          {check(settings.phone, () => set("phone", !settings.phone), "Phone")}
          {check(settings.anonymous, () => set("anonymous", !settings.anonymous), "Guest")}
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-fd-border">
          {PROVIDERS.map((p) => check(settings.oauth.includes(p), () => toggleProvider(p), p))}
        </div>
        <div className="px-5 py-4 border-b border-fd-border">
          <h2 className="text-[15px] font-semibold">Theme</h2>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className={label}>Scheme</span>
              <select
                className={field}
                value={settings.theme}
                onChange={(e) => set("theme", e.target.value as Settings["theme"])}
              >
                <option value="auto">auto</option>
                <option value="light">light</option>
                <option value="dark">dark</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Radius</span>
              <select
                className={field}
                value={settings.radius}
                onChange={(e) => set("radius", e.target.value as Settings["radius"])}
              >
                {["none", "sm", "md", "lg", "xl"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Primary</span>
              <input
                className={field}
                placeholder="#fd366e"
                value={settings.primary}
                onChange={(e) => set("primary", e.target.value)}
              />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col gap-6 min-w-0">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-lg bg-fd-muted/50 p-[3px] text-fd-muted-foreground">
            {(["sign-in", "account"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-full rounded-md px-3 text-[13px] font-medium transition-colors ${
                  view === v
                    ? "bg-fd-background text-fd-foreground border border-fd-border"
                    : "hover:text-fd-foreground"
                }`}
              >
                {v === "sign-in" ? "<authui-sign-in>" : "<authui-account>"}
              </button>
            ))}
          </div>
          {ready ? (
            <authui-button variant="outline" size="sm">
              Open modal
            </authui-button>
          ) : null}
          {ready ? <authui-user-button /> : null}
        </div>

        <div className="rounded-2xl border border-fd-border bg-dots p-6 sm:p-10 flex justify-center min-h-[560px]">
          {ready ? (
            view === "sign-in" ? (
              <authui-sign-in style={{ width: "100%", maxWidth: 420 }} />
            ) : (
              <authui-account style={{ width: "100%", maxWidth: 560 }} />
            )
          ) : (
            <div className="w-full max-w-[420px] h-[520px] rounded-xl border border-fd-border animate-pulse bg-fd-muted/30" />
          )}
        </div>

        <CodeBlock code={toHtml(settings)} title="index.html">
          {toHtml(settings)
            .split("\n")
            .map((line, i) => {
              const m = line.match(/^(\s*)([\w-]+)=("[^"]*")$/);
              if (m) {
                return (
                  <span key={i}>
                    {m[1]}
                    {T.attr(m[2])}={T.str(m[3])}
                    {"\n"}
                  </span>
                );
              }
              return (
                <span key={i}>
                  {T.tag(line)}
                  {"\n"}
                </span>
              );
            })}
        </CodeBlock>
      </div>
    </section>
  );
}
