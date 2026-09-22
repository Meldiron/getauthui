# Auth UI - Development guidelines

Monorepo: `packages/core` (the `@getauthui/core` Lit library), `docs` (Next.js + Fumadocs, static export), `example` (Vite playground).

## Principles

- **The component is the product.** Everything must work from one `<script>` tag on any origin, with no Auth UI backend and no custom domain. Never introduce a server, a hosted page, or a hand-off of sessions or tokens through URLs.
- **The Appwrite SDK owns the session.** Do not read, store, or forward `cookieFallback`, JWTs or session secrets. Call `Account` methods and let the SDK handle persistence.
- **Follow the Appwrite Console design system.** Tokens live in `packages/core/src/styles/tokens.ts` and were copied from the console's `styles.css` (shadcn new-york, zinc, `--radius: 0.625rem`, brand pink `#fd366e` for CTAs only). Shared component classes live in `styles/base.ts`. Reuse them; do not invent new colours.
- **Every string goes through `t()`** and has a key in `types.ts` (`AuthUIStrings`) with a default in `i18n.ts`, so users can override it.
- **Every Appwrite error the UI can trigger gets a friendly mapping** in `errors.ts`. Fall back to the server message, never to a blank state.
- **Compatibility across SDK versions.** Appwrite renamed methods in 1.8 (`createMfaAuthenticator` became `createMFAAuthenticator`, `createVerification` became `createEmailVerification`). Use the `call(target, [newName, oldName], args)` helper in `store.ts` for any renamed method.
- **No em dashes in copy.** Use a period, comma, colon or parentheses.

## Adding a feature

1. Add the store method in `packages/core/src/store.ts`. Wrap the SDK call in `try/catch` and `this.fail(err)` so the `error` event fires.
2. Add strings to `types.ts` and `i18n.ts`.
3. Render it in the relevant component. Prefer the existing classes (`.btn`, `.input`, `.card`, `.row`, `.alert`, `.badge`, `.tabs`).
4. Add a test in `packages/core/test`. The Appwrite SDK is mocked in `test/mocks.ts`; extend `createAccountMock()` with the new method.
5. Document it in `docs/content/docs`. Component attributes and events go in `docs/content/docs/components/*.mdx`; store methods in `api/store.mdx`.

## Commands

```bash
pnpm install
pnpm check            # tsc for the library
pnpm test             # vitest (jsdom)
pnpm build            # library: ESM + d.ts, CDN ESM + IIFE
pnpm build:docs       # library then docs static export to docs/out
pnpm lint && pnpm format:check
pnpm --filter example dev     # http://localhost:5174
pnpm --filter docs dev        # http://localhost:3100
```

## Publishing

`packages/core` publishes to npm as `@getauthui/core` (npm user `meldiron`). `prepublishOnly` copies the root README and LICENSE and runs the build. CDN consumers load `dist/authui.cdn.mjs` through the `unpkg` and `jsdelivr` fields.

**CDN pins are versioned with the package.** Homepage and docs read `docs/lib/shared.ts` (`cdnUrl`). Install snippets also live in README, `packages/core/README`, docs MDX, and `skills/authui-creator/SKILL.md`. After any version bump run `pnpm sync:cdn-pins` so every `@getauthui/core@x.y.z` pin and the skill tip move together. Do not hand-edit pins in isolation.

### Humans

1. `pnpm human:login` once (npm account `meldiron`).
2. Set the new version in `packages/core/package.json` (or use an `agent:publish-*` script).
3. `pnpm sync:cdn-pins`
4. `pnpm human:publish` (builds, then `npm publish --access public` from `packages/core`)
5. Commit version + pin sync, push `origin/main`, then `pnpm docs:deploy` (Appwrite Sites site `authui-docs`, monorepo root as `--code`).

### Agents

- `pnpm agent:publish-patch` / `agent:publish-minor` / `agent:publish-pre`: bump with `npm version --no-git-tag-version`, sync CDN pins, build, publish. Prereleases use the current branch name as the npm dist-tag.
- Then commit the version bump and pin sync, push, and run `pnpm docs:deploy`. Wait until the Sites deployment is ready.
- Do not run publish scripts unless the task explicitly asks for an npm release.
