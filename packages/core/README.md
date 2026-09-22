# Auth UI

[![npm version](https://img.shields.io/npm/v/@getauthui/core)](https://www.npmjs.com/package/@getauthui/core)
[![license](https://img.shields.io/npm/l/@getauthui/core)](./LICENSE)

**Drop-in authentication for Appwrite. One script tag, every sign-in method, MFA, sessions and account management, running on your own domain.**

```html
<style>
  authui-show:not([ready]) {
    display: none;
  }
  authui-button:not(:defined),
  authui-user-button:not(:defined) {
    visibility: hidden;
  }
</style>
<script type="module" src="https://unpkg.com/@getauthui/core@0.1.15"></script>

<authui-config
  endpoint="https://cloud.appwrite.io/v1"
  project="YOUR_PROJECT_ID"
  methods="email-password magic-url oauth:google oauth:github"
></authui-config>

<authui-show when="signed-out"><authui-button>Sign in</authui-button></authui-show>
<authui-show when="signed-in"><authui-user-button></authui-user-button></authui-show>
```

That is a complete login flow: OAuth buttons, email and password, sign up, forgot password, passwordless email and SMS, guest sessions, MFA challenges, and a full account screen behind the avatar.

Docs: **https://getauthui.appwrite.network**

---

## Why v2 is a component, not a hosted page

Auth UI v1 was a hosted login page on `*.authui.site`. Browsers now block or partition third-party cookies, so a session created on one site cannot be read from another. Sign in worked in some browsers and silently failed in Safari, Firefox and Brave.

v2 runs inside your page. Its requests to Appwrite are indistinguishable from your own app's, so the session lands exactly where your code needs it. No hand-off, no tokens in URLs, no custom domain required.

## Features

- **Sign in / sign up** with email and password, password recovery and reset
- **Passwordless**: magic URL, email OTP, SMS OTP, with Appwrite's security phrase
- **OAuth2** for every provider Appwrite supports, with brand icons for the common ones
- **Guest sessions** with an upgrade path to a real account
- **MFA**: challenges during sign in, authenticator app enrollment with QR code, recovery codes, step-up verification for protected actions
- **Account management**: profile, email and phone verification, password change, active sessions, connected identities, security log when the server exposes it, account deletion
- **Modal, inline or headless** usage, `<authui-show when="signed-in">` conditionals, React wrappers
- **Themeable**: Appwrite Console design system, dark mode that follows your page, CSS custom properties for everything, string overrides
- **Framework agnostic**: standard web components built with Lit, ~99 KB gzipped ESM on the CDN (~86 KB IIFE), including Lit and the full Appwrite SDK

## Install

CDN:

```html
<style>
  authui-show:not([ready]) {
    display: none;
  }
  authui-button:not(:defined),
  authui-user-button:not(:defined) {
    visibility: hidden;
  }
</style>
<script type="module" src="https://unpkg.com/@getauthui/core@0.1.15"></script>
```

The `<style>` keeps `<authui-show>` and the buttons hidden until the module defines them. See [`<authui-show>`](https://getauthui.appwrite.network/docs/components/show).

The default CDN URL is an ESM module: it defines the elements but does **not** set `window.AuthUI`. For `AuthUI.init` / `AuthUI.on` from a classic script, use the IIFE build:

```html
<script src="https://unpkg.com/@getauthui/core@0.1.15/dist/authui.cdn.js"></script>
```

npm:

```bash
npm install @getauthui/core appwrite lit
```

```ts
import { AuthUI } from "@getauthui/core";

AuthUI.init({
  endpoint: "https://cloud.appwrite.io/v1",
  project: "YOUR_PROJECT_ID",
  methods: { emailPassword: true, magicUrl: true, anonymous: true, oauth: ["google", "github"] },
  branding: { name: "Acme", theme: "auto" },
});

AuthUI.on("signed-in", (user) => console.log("hello", user.name));
AuthUI.open(); // opens the modal
```

Register your app's hostname as a **Web platform** in the Appwrite Console and enable the methods you use under **Auth → Settings**.

## Components

| Element                  | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `<authui-config>`        | Declarative configuration                                                |
| `<authui-modal>`         | Dialog that hosts sign-in and account screens (auto-created when needed) |
| `<authui-button>`        | Opens the modal                                                          |
| `<authui-user-button>`   | Avatar with account menu, or a sign-in button while signed out           |
| `<authui-sign-in>`       | Inline sign-in panel with every flow                                     |
| `<authui-account>`       | Inline account management                                                |
| `<authui-show when="…">` | Render children only for matching auth states (`when`, `unless`)         |

React: `import { AuthUIProvider, AuthUIButton, AuthUIUserButton, Show, useAuthUI } from "@getauthui/core/react"`.

## Repository layout

```
packages/core   @getauthui/core, the Lit component library
docs            Landing page and documentation (Next.js + Fumadocs, static export)
example         Vite playground that exercises every component
```

## Development

```bash
pnpm install
pnpm dev:core      # build the library in watch mode
pnpm dev:docs      # docs site on http://localhost:3100
pnpm --filter example dev   # example app on http://localhost:5174
pnpm test          # unit tests (vitest + jsdom, Appwrite mocked)
pnpm check && pnpm lint && pnpm format:check
pnpm build         # library build: ESM + types, CDN ESM and IIFE bundles
```

## License

MIT
