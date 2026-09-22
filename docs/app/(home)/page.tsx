import Link from "next/link";
import {
  Fingerprint,
  KeyRound,
  Layers,
  Lock,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Sparkles,
  UserCog,
  Zap,
} from "lucide-react";
import { CodeBlock } from "@/components/home/code-block";
import { T } from "@/components/home/code-tokens";
import { LiveDemo } from "@/components/home/live-demo";
import { cdnUrl, criticalCssTag, gitConfig } from "@/lib/shared";

const Underscore = () => <span className="text-brand">_</span>;

const heroSnippet = `${criticalCssTag}
<script type="module" src="${cdnUrl}"></script>

<authui-config
  endpoint="https://cloud.appwrite.io/v1"
  project="YOUR_PROJECT_ID"
  methods="email-password magic-url oauth:google oauth:github"
></authui-config>

<authui-show when="signed-out">
  <authui-button>Sign in</authui-button>
</authui-show>

<authui-show when="signed-in">
  <authui-user-button></authui-user-button>
</authui-show>`;

const features = [
  {
    icon: <Fingerprint size={18} />,
    title: "Every sign-in method",
    desc: "Email and password, magic URL, email and SMS codes, guest sessions and all 48 Appwrite OAuth providers.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "MFA built in",
    desc: "Challenges during sign in, authenticator enrollment with QR code, recovery codes and step-up verification.",
  },
  {
    icon: <UserCog size={18} />,
    title: "Account management",
    desc: "Profile, verification, password change, active sessions, connected identities, security log when exposed, deletion.",
  },
  {
    icon: <Lock size={18} />,
    title: "Runs on your origin",
    desc: "No hosted page, no third-party cookies, no tokens in URLs. Sessions land where your app already looks.",
  },
  {
    icon: <Palette size={18} />,
    title: "Themeable",
    desc: "Appwrite Console design system, dark mode that follows your page, CSS variables for every colour, string overrides.",
  },
  {
    icon: <Layers size={18} />,
    title: "Any framework",
    desc: "Standard web components with React wrappers. Works in Vue, Svelte, Angular, Astro and plain HTML.",
  },
];

const guides = [
  {
    href: "/docs/guides/nullboard",
    title: "Sync Nullboard across devices",
    desc: "A kanban board that lives in localStorage. Add sign in and mirror every board into user preferences.",
    uses: "User prefs",
  },
  {
    href: "/docs/guides/2048",
    title: "Keep your 2048 best score",
    desc: "Thirty lines that upload the record whenever it improves and restore it on any device.",
    uses: "User prefs",
  },
  {
    href: "/docs/guides/silverbullet",
    title: "Sign in to SilverBullet",
    desc: "Put Appwrite accounts in front of a self-hosted SilverBullet notebook.",
    uses: "Sessions",
  },
  {
    href: "/docs/guides/openhabittracker",
    title: "Back up OpenHabitTracker",
    desc: "A Blazor PWA that keeps habits offline. Add sign in and store backups per user in Appwrite Storage.",
    uses: "Storage",
  },
];

const steps = [
  {
    n: "01",
    title: "Add the script and config",
    desc: "One tag loads Lit, the Appwrite SDK and every component. One element points it at your project.",
    code: (
      <>
        {T.tag("<authui-config")}
        {"\n  "}
        {T.attr("endpoint")}={T.str('"https://cloud.appwrite.io/v1"')}
        {"\n  "}
        {T.attr("project")}={T.str('"YOUR_PROJECT_ID"')}
        {"\n"}
        {T.tag(">")}
        {T.tag("</authui-config>")}
      </>
    ),
    raw: `<authui-config endpoint="https://cloud.appwrite.io/v1" project="YOUR_PROJECT_ID"></authui-config>`,
  },
  {
    n: "02",
    title: "Drop in the elements",
    desc: "A button opens the modal. The user button shows the avatar and account menu once signed in.",
    code: (
      <>
        {T.tag("<authui-button>")}
        {T.pl("Sign in")}
        {T.tag("</authui-button>")}
        {"\n"}
        {T.tag("<authui-user-button>")}
        {T.tag("</authui-user-button>")}
      </>
    ),
    raw: `<authui-button>Sign in</authui-button>\n<authui-user-button></authui-user-button>`,
  },
  {
    n: "03",
    title: "Sign in to your app",
    desc: "Your users pick a method and sign in. The session belongs to your page, so the Appwrite SDK in your own code sees it right away.",
    code: (
      <>
        {T.kw("import")} {T.pl("{")} {T.fn("AuthUI")} {T.pl("}")} {T.kw("from")}{" "}
        {T.str('"@getauthui/core"')}
        {T.pl(";")}
        {"\n\n"}
        {T.fn("AuthUI")}
        {T.pl(".")}
        {T.fn("on")}
        {T.pl("(")}
        {T.str('"signed-in"')}
        {T.pl(", (user) => {")}
        {"\n  "}
        {T.cm("// user.email, user.name, ...")}
        {"\n"}
        {T.pl("});")}
      </>
    ),
    raw: `import { AuthUI } from "@getauthui/core";\n\nAuthUI.on("signed-in", (user) => {\n  // user.email, user.name, ...\n});`,
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1 overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-fd-border">
        <div className="absolute inset-0 -z-10 bg-dots" aria-hidden />
        <div className="absolute inset-0 -z-10 hero-glow" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div className="text-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
              Authentication for Appwrite
              <Underscore />
            </p>
            <h1 className="font-display mt-4 text-balance font-normal leading-[1.02] tracking-tight text-[38px] sm:text-[48px] lg:text-[60px]">
              <span className="text-gradient-brand">Sign-in UI</span> your users already know how to
              use
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-fd-muted-foreground sm:text-[16px]">
              One script tag. Every Appwrite sign-in method, MFA, sessions and account settings as
              web components that run on your own domain. No hosted page, no third-party cookies, no
              backend.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Link
                href="/docs/getting-started"
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-5 text-[14px] font-medium text-brand-foreground hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
              <Link
                href="/playground"
                className="inline-flex h-10 items-center justify-center rounded-md border border-fd-border px-5 text-[14px] font-medium text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent transition-colors"
              >
                Open playground
              </Link>
              <a
                href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md px-3 text-[14px] font-medium text-fd-muted-foreground hover:text-fd-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-fd-muted-foreground font-mono">
              {[
                ["~96 KB", "gzipped ESM, batteries included"],
                ["0", "servers"],
                ["48", "OAuth providers"],
                ["MIT", "license"],
              ].map(([v, l]) => (
                <div key={l} className="flex items-baseline gap-2">
                  <span className="font-display text-[22px] text-fd-foreground tabular-nums tracking-tight">
                    {v}
                  </span>
                  <span className="text-[12px]">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <CodeBlock code={heroSnippet} title="index.html">
            {T.tag("<style>")}
            {T.pl("authui-show:not([ready]){display:none}")}
            {"\n  "}
            {T.pl(
              "authui-button:not(:defined),authui-user-button:not(:defined){visibility:hidden}"
            )}
            {T.tag("</style>")}
            {"\n"}
            {T.tag("<script")} {T.attr("type")}={T.str('"module"')} {T.attr("src")}=
            {T.str(`"${cdnUrl}"`)}
            {T.tag(">")}
            {T.tag("</script>")}
            {"\n\n"}
            {T.tag("<authui-config")}
            {"\n  "}
            {T.attr("endpoint")}={T.str('"https://cloud.appwrite.io/v1"')}
            {"\n  "}
            {T.attr("project")}={T.str('"YOUR_PROJECT_ID"')}
            {"\n  "}
            {T.attr("methods")}={T.str('"email-password magic-url oauth:google oauth:github"')}
            {"\n"}
            {T.tag(">")}
            {T.tag("</authui-config>")}
            {"\n\n"}
            {T.tag("<authui-show")} {T.attr("when")}={T.str('"signed-out"')}
            {T.tag(">")}
            {"\n  "}
            {T.tag("<authui-button>")}
            {T.pl("Sign in")}
            {T.tag("</authui-button>")}
            {"\n"}
            {T.tag("</authui-show>")}
            {"\n\n"}
            {T.tag("<authui-show")} {T.attr("when")}={T.str('"signed-in"')}
            {T.tag(">")}
            {"\n  "}
            {T.tag("<authui-user-button>")}
            {T.tag("</authui-user-button>")}
            {"\n"}
            {T.tag("</authui-show>")}
          </CodeBlock>
        </div>
      </section>

      {/* Live demo */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
              Live component
              <Underscore />
            </p>
            <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
              This is the real thing
              <Underscore />
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-fd-muted-foreground">
              The panel on the right is{" "}
              <code className="font-mono text-[13px] px-1.5 py-0.5 rounded-md border border-fd-border bg-fd-muted/50">
                &lt;authui-sign-in&gt;
              </code>{" "}
              rendered by this page, pointed at a placeholder project. Toggle the site theme and it
              follows. Every screen you see in it, from OAuth to MFA to password reset, ships in the
              same tag.
            </p>
            <ul className="mt-6 space-y-2.5 text-[14px] text-fd-muted-foreground">
              {[
                "Native <dialog> modal with focus trap, or inline like this",
                "Follows html.dark, data-theme or prefers-color-scheme",
                "Every colour and radius is a CSS custom property",
                "Every string is replaceable",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-1 text-emerald-500 text-[11px]">&#10003;</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-fd-border bg-dots p-6 sm:p-10">
            <LiveDemo />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
            How it works
            <Underscore />
          </p>
          <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
            Three steps, five minutes
            <Underscore />
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-fd-border rounded-xl overflow-hidden border border-fd-border">
            {steps.map((s) => (
              <div key={s.n} className="bg-fd-background p-7 flex flex-col gap-4">
                <span className="text-[12px] font-mono text-fd-muted-foreground/60">{s.n}</span>
                <h3 className="text-[15px] font-semibold text-fd-foreground">{s.title}</h3>
                <p className="text-[13px] leading-6 text-fd-muted-foreground">{s.desc}</p>
                <div className="pt-2 mt-auto">
                  <CodeBlock code={s.raw} className="text-[12px]">
                    {s.code}
                  </CodeBlock>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
            Features
            <Underscore />
          </p>
          <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
            Everything Appwrite Auth can do, already designed
            <Underscore />
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-fd-border rounded-xl overflow-hidden border border-fd-border">
            {features.map((f) => (
              <div key={f.title} className="bg-fd-background p-7 flex flex-col gap-3 group">
                <div className="w-9 h-9 rounded-md bg-fd-muted text-fd-muted-foreground flex items-center justify-center group-hover:text-fd-foreground transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-[14px] font-semibold text-fd-foreground">{f.title}</h3>
                <p className="text-[13px] leading-5 text-fd-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
                Guides
                <Underscore />
              </p>
              <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
                Real apps, start to finish
                <Underscore />
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-fd-muted-foreground">
                Each guide takes an existing open source app, adds Auth UI, and uses the signed-in
                user for something concrete. Happy path only, and every one is tested end to end.
                More are on the way.
              </p>
            </div>
            <Link
              href="/docs/guides"
              className="inline-flex h-10 items-center justify-center rounded-md border border-fd-border px-5 text-[14px] font-medium text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent transition-colors shrink-0"
            >
              Browse all guides
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-fd-border rounded-xl overflow-hidden border border-fd-border">
            {guides.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="bg-fd-background p-7 flex flex-col gap-3 group hover:bg-fd-accent/40 transition-colors"
              >
                <span className="inline-flex w-fit items-center rounded-md bg-fd-muted/60 px-2 py-0.5 text-[11px] font-medium text-fd-muted-foreground">
                  {g.uses}
                </span>
                <h3 className="text-[15px] font-semibold text-fd-foreground group-hover:underline decoration-dotted underline-offset-4">
                  {g.title}
                </h3>
                <p className="text-[13px] leading-5 text-fd-muted-foreground">{g.desc}</p>
                <span className="mt-auto pt-2 text-[13px] text-fd-muted-foreground group-hover:text-fd-foreground transition-colors">
                  Read the guide
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why not hosted */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
              Why a component
              <Underscore />
            </p>
            <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
              Hosted login pages broke when third-party cookies did
              <Underscore />
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-fd-muted-foreground">
              A login page on another domain creates the session on that domain. Safari, Firefox,
              Brave and Chrome with tracking protection refuse to share it with your app. The old
              fixes, hidden iframes and silent redirects, are now classified as bounce tracking and
              purged.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-fd-muted-foreground">
              Auth UI runs in your page instead. Its requests to Appwrite are indistinguishable from
              your own, so whatever session mechanism your project uses, cookies on a custom domain
              or the SDK fallback on Cloud, simply works.
            </p>
          </div>
          <div className="rounded-xl border border-fd-border overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/30">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                    Approach
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-fd-muted-foreground uppercase tracking-wider text-center">
                    Safari
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-fd-muted-foreground uppercase tracking-wider text-center">
                    Static apps
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-fd-muted-foreground uppercase tracking-wider text-center">
                    Backend
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Hosted page, shared cookie", false, true, "none"],
                  ["Hosted page, JWT renewal", "partial", true, "none"],
                  ["Hosted page, code exchange", true, false, "required"],
                  ["Auth UI component", true, true, "none"],
                ].map(([name, safari, spa, backend], i) => (
                  <tr
                    key={String(name)}
                    className={`border-b border-fd-border last:border-0 ${i === 3 ? "bg-fd-muted/20" : ""}`}
                  >
                    <td className="px-4 py-3 text-fd-foreground">{name as string}</td>
                    <td className="px-4 py-3 text-center">
                      {safari === true ? (
                        <span className="text-emerald-500">&#10003;</span>
                      ) : safari === "partial" ? (
                        <span className="text-amber-500">~</span>
                      ) : (
                        <span className="text-fd-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {spa ? (
                        <span className="text-emerald-500">&#10003;</span>
                      ) : (
                        <span className="text-fd-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[12px] text-fd-muted-foreground">
                      {backend as string}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AI section */}
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
              Built for agents
              <Underscore />
            </p>
            <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
              HTML your coding agent writes correctly the first time
              <Underscore />
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-fd-muted-foreground">
              Declarative tags, one global config, and conditional wrappers instead of state
              plumbing. The full documentation is available as a single Markdown file at{" "}
              <Link href="/llms-full.txt" className="link-neutral">
                /llms-full.txt
              </Link>
              .
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[Sparkles, Zap, KeyRound, MonitorSmartphone].map((Icon, i) => (
                <span
                  key={i}
                  className="w-9 h-9 rounded-md bg-fd-muted text-fd-muted-foreground flex items-center justify-center"
                >
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>
          <CodeBlock
            title="prompt.txt"
            code={`Add authentication with Auth UI (@getauthui/core) for Appwrite.\nDocs: https://getauthui.appwrite.network/llms-full.txt\n\n1. Put <style>authui-show:not([ready]){display:none}authui-button:not(:defined),authui-user-button:not(:defined){visibility:hidden}</style> in <head>, then <script type="module" src="${cdnUrl}"></script>\n2. <authui-config endpoint="..." project="..." methods="email-password oauth:google">\n3. <authui-button> inside <authui-show when="signed-out">, <authui-user-button> inside <authui-show when="signed-in">\n4. Do not build custom login forms or store sessions yourself.`}
          >
            {T.pl("Add authentication with Auth UI (@getauthui/core) for Appwrite.")}
            {"\n"}
            {T.cm("Docs: https://getauthui.appwrite.network/llms-full.txt")}
            {"\n\n"}
            {T.kw("1.")} {T.pl("Put critical CSS in <head>, then")} {T.tag("<script")}{" "}
            {T.attr("type")}={T.str('"module"')} {T.attr("src")}={T.str(`"${cdnUrl}"`)}
            {T.tag(">")}
            {T.tag("</script>")}
            {"\n"}
            {T.kw("2.")} {T.tag("<authui-config")} {T.attr("endpoint")}={T.str('"..."')}{" "}
            {T.attr("project")}={T.str('"..."')} {T.attr("methods")}=
            {T.str('"email-password oauth:google"')}
            {T.tag(">")}
            {"\n"}
            {T.kw("3.")} {T.tag("<authui-button>")} {T.pl("inside")} {T.tag("<authui-show")}{" "}
            {T.attr("when")}={T.str('"signed-out"')}
            {T.tag(">")}
            {T.pl(",")} {T.tag("<authui-user-button>")} {T.pl("inside")} {T.tag("<authui-show")}{" "}
            {T.attr("when")}={T.str('"signed-in"')}
            {T.tag(">")}
            {"\n"}
            {T.kw("4.")} {T.pl("Do not build custom login forms or store sessions yourself.")}
          </CodeBlock>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="font-display text-balance font-normal leading-none tracking-tight text-[32px] sm:text-[44px]">
            Ship login today
            <Underscore />
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-fd-muted-foreground">
            Free, open source, and built on the official Appwrite SDK. Add the script tag and you
            are done.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/docs/getting-started"
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-5 text-[14px] font-medium text-brand-foreground hover:opacity-90 transition-opacity"
            >
              Read the docs
            </Link>
            <a
              href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md border border-fd-border px-5 text-[14px] font-medium text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent transition-colors"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-fd-muted-foreground">
          <span className="font-mono">
            <span className="text-fd-muted-foreground/60">&lt;</span>authui
            <span className="text-fd-muted-foreground/60"> /&gt;</span> · MIT License
          </span>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="hover:text-fd-foreground transition-colors">
              Docs
            </Link>
            <Link href="/docs/guides" className="hover:text-fd-foreground transition-colors">
              Guides
            </Link>
            <Link href="/playground" className="hover:text-fd-foreground transition-colors">
              Playground
            </Link>
            <a
              href="https://appwrite.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              Appwrite
            </a>
            <a
              href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
