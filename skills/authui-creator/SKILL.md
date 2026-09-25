---
name: authui-creator
description: Add Appwrite authentication to any web app with Auth UI (@getauthui/core). Use this skill whenever the user wants sign in, sign up, login, auth, OAuth, magic link, MFA, account settings, or session management on a website or SPA. Trigger on requests like "add login", "add authentication", "sign in with Appwrite", "protect this page", "add a user menu", or any time the user needs auth UI without building custom forms.
---

# Auth UI: Authentication Creator

Drop-in authentication UI for Appwrite. One script (or npm import), every common sign-in method, MFA, sessions and account management as web components. No Auth UI backend. The Appwrite SDK owns the session.

Docs index: https://getauthui.appwrite.network/llms.txt
Full docs: https://getauthui.appwrite.network/llms-full.txt

## Quick Start (CDN + HTML)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My app</title>
    <!-- Critical CSS: hide protected content before the module runs -->
    <link rel="stylesheet" href="https://unpkg.com/@getauthui/core@0.1.43/dist/fouc.css" />
    <script type="module" src="https://unpkg.com/@getauthui/core@0.1.43"></script>
  </head>
  <body>
    <authui-config
      endpoint="https://cloud.appwrite.io/v1"
      project="YOUR_PROJECT_ID"
      methods="email-password oauth:google"
      name="Acme"
    ></authui-config>

    <header>
      <authui-show when="signed-out">
        <authui-button>Sign in</authui-button>
      </authui-show>
      <authui-show when="signed-in">
        <authui-user-button></authui-user-button>
      </authui-show>
    </header>

    <authui-show when="signed-in">
      <main>Signed-in content</main>
    </authui-show>
  </body>
</html>
```

Replace `YOUR_PROJECT_ID` and register the page hostname as a **Web platform** in the Appwrite Console. Enable the same methods under **Auth → Settings**.

## npm / bundler

```bash
npm install @getauthui/core appwrite lit
```

```ts
import { AuthUI } from "@getauthui/core";

AuthUI.init({
  endpoint: "https://cloud.appwrite.io/v1",
  project: "YOUR_PROJECT_ID",
  methods: { emailPassword: true, oauth: ["google"] },
  branding: { name: "Acme" },
});

AuthUI.on("signed-in", (user) => console.log(user.$id));
```

```html
<authui-show when="signed-out"><authui-button>Sign in</authui-button></authui-show>
<authui-show when="signed-in"><authui-user-button></authui-user-button></authui-show>
```

## React

```tsx
import {
  AuthUIProvider,
  AuthUIButton,
  AuthUIUserButton,
  AuthUIModal,
  Show,
  useAuthUI,
} from "@getauthui/core/react";

const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  project: "YOUR_PROJECT_ID",
  methods: { emailPassword: true, oauth: ["google"] },
};

export function App() {
  return (
    <AuthUIProvider config={config}>
      <AuthUIModal />
      <Header />
    </AuthUIProvider>
  );
}

function Header() {
  const { user } = useAuthUI();
  return (
    <header>
      <Show when="signed-out">
        <AuthUIButton>Sign in</AuthUIButton>
      </Show>
      <Show when="signed-in">
        <span>{user?.name}</span>
        <AuthUIUserButton />
      </Show>
    </header>
  );
}
```

`AuthUIProvider` configures during render so `getClient()` is ready on first paint. React `Show` returns `null` when hidden (children do not mount). Pass `closeOnSuccess={false}` to `AuthUIModal` to keep the dialog open after sign in.

## Imperative API (`AuthUI`)

| Call                   | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `AuthUI.init(config)`  | Configure client, handle redirect, load user    |
| `AuthUI.open(view?)`   | Open modal (`sign-in`, `sign-up`, `account`, …) |
| `AuthUI.close()`       | Close modal                                     |
| `AuthUI.signOut()`     | End session                                     |
| `AuthUI.getClient()`   | Reuse the Appwrite `Client`                     |
| `AuthUI.getAccount()`  | Reuse the `Account` service                     |
| `AuthUI.on(event, cb)` | `change`, `signed-in`, `signed-out`, `error`    |
| `AuthUI.getState()`    | Snapshot of status / user                       |

Config shape (common fields): `endpoint`, `project`, `methods`, `branding`, `redirectUrl`, `successUrl`, `signUp`, `requireName`, `mfa`, `preview`, `strings`.

## Components

| Element                      | Role                                  |
| ---------------------------- | ------------------------------------- |
| `<authui-config>`            | Declarative config (invisible)        |
| `<authui-button>`            | Opens the modal                       |
| `<authui-user-button>`       | Avatar + account menu when signed in  |
| `<authui-modal>`             | Dialog host (auto-created if missing) |
| `<authui-sign-in>`           | Inline sign-in panel                  |
| `<authui-account>`           | Inline account panel                  |
| `<authui-show when\|unless>` | Show slot while status matches        |

Statuses: `loading`, `signed-out`, `signed-in`, `mfa-required`.

## Reuse the session in your app

```ts
import { Client, Databases } from "appwrite";
// or: import { AuthUI, appwrite } from "@getauthui/core";

const client = AuthUI.getClient()!; // already signed in
const databases = new Databases(client);
```

Do not store `cookieFallback`, JWTs or session secrets yourself. Do not pass them through URLs.

## Tips for AI-Generated Code

1. Always include the critical FOUC CSS in `<head>` for CDN installs.
2. Endpoint **must** end with `/v1`.
3. Register the hostname as a Web platform; enable each method in the Console.
4. Prefer `<authui-config>` + `<authui-button>` / `<authui-show>`; do not invent custom login forms.
5. CDN-safe script URLs only: bare `https://unpkg.com/@getauthui/core@…` (or jsDelivr), `…/dist/authui.cdn.mjs`, or IIFE `…/dist/authui.cdn.js`. Never load `…/dist/authui.js` from a CDN (bundler entry; fails with `Failed to resolve module specifier "appwrite"`).
6. ESM CDN does **not** set `window.AuthUI`. Use `<authui-config>` or the IIFE build / npm `AuthUI.init`.
7. Pin the CDN version (`@0.1.43` or newer).
8. In React use `AuthUIProvider`, `Show`, and `@getauthui/core/react`. Do not wrap children in `<authui-show>` if you need true conditional mounting.
9. For `close-on-success` off in HTML use `close-on-success="false"` (string). In React use `closeOnSuccess={false}`.
10. Read common mistakes: docs `/docs/common-mistakes`. Machine docs: `/llms-full.txt`.
