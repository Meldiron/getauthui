# Auth UI v2: UI/UX audit and fix tasks

Audit date: 2026-09-20. Method: headless Chromium (Playwright) driving the built CDN bundle
(`packages/core/dist/authui.cdn.mjs`) on `http://localhost:5174` against the real Appwrite Cloud project
`6aafa421001e80b7153a` (Appwrite 2.2.0, fra) and against preview mode. Real flows covered: sign up, sign in,
magic URL (token minted server side and redeemed through `?authui=magic-url`), email OTP, SMS OTP (project
mock number), TOTP enrolment with computed codes, MFA challenge, recovery codes, step-up, sessions, identities,
activity, email verification, password change, account deletion, OAuth redirect (URL captured, navigation
intercepted), `oauth-failed` / `recovery` / `verify-email` returns, blocked user, rate limiting. Viewports: 1280,
375, 320, 1280x560. Light and dark. axe-core on every screen.

Line numbers refer to `packages/core/src/`. Severity: **P0** breaks a core flow, **P1** wrong or confusing
behaviour, **P2** polish, accessibility, i18n.

---

## P0: state and flow bugs

### 1. DONE (2026-09-20) Sign-in panel stays on the MFA chooser after the challenge succeeds
Observed (real, TOTP): after `updateMFAChallenge` succeeds the user is signed in, but the inline panel keeps
rendering the factor chooser, now listing all four factors ("Send code by SMS" for a user with no phone)
because `mfaFactors` is `null` again and `?? true` makes everything available.
Cause: `renderStep()` (`components/authui-sign-in.ts:470`) short-circuits to `renderSignedIn()` only when
`step !== "mfa"`, and `onVerifyFactor` (`:237`) never leaves the `mfa` step.
Fix: call `this.go("sign-in")` after a successful challenge, and in `syncFromStore()` (`:71`) leave the `mfa`
step whenever `status` becomes `signed-in` or `signed-out`.

### 2. Sign-in panel does not reset after sign-out or after a token sign-in
Observed: sign in by SMS, then sign out (any of: panel button, user menu, "Sign out everywhere", account
deletion). The panel shows the stale "We sent a code to +1555… / Verify code" screen, or the MFA chooser,
instead of the sign-in form. A user who signs out cannot sign back in without reloading.
Cause: `token`, `challenge`, `step` survive status changes; `go()` (`:94`) is only called by user clicks.
Fix: on `signed-out` (and on `signed-in`) in `syncFromStore()`, reset `token`, `challenge`, `code`,
`password`, `error`, `notice` and go to `sign-in` (respecting the `view` attribute). Also clear `token` in
`onVerifyCode` (`:218`) on success.

### 3. `<authui-config methods="…">` can never turn email + password off
Observed: `methods="oauth:google oauth:github"` and `methods="magic-url email-otp phone"` both still render the
email/password form and the "Sign up" link.
Cause: `toConfig()` (`components/authui-config.ts:73`) only sets `emailPassword = true`; when the token is absent
it stays `undefined`, and `renderSignIn()` treats `m.emailPassword !== false` as enabled (`authui-sign-in.ts:556`).
Fix: when the attribute is non-empty, set `emailPassword = tokens.includes("email-password")`. Add a test.

### 4. Signing out the current session from the Sessions list leaves a zombie signed-in state
Observed (real): click the sign-out icon on the row marked "This device". The row disappears, the list says
"No recent activity.", the header still shows the user, and every later action fails with
`User (role: guests) missing scopes (["account"])`.
Cause: `onDeleteSession` (`components/authui-account.ts:426`) calls `authStore.signOut(id)` with the real ID, and
`signOut()` (`store.ts:457`) only updates state when `sessionId === "current"`.
Fix: if `s.current`, call `authStore.signOut()` (current) or treat the deleted ID as current when it matches
the session list's current entry; then let the normal signed-out handling take over. Consider hiding the
icon on the current row and pointing to "Sign out" instead.

### 5. Blocked user: silent failure and a poisoned local session
Observed (real): a blocked user requests an SMS code, enters it, `createSession` succeeds, then `account.get()`
fails with `user_blocked`. The UI shows nothing (the code form just stays), the SDK keeps the session in
`localStorage.cookieFallback`, and from then on every request from that browser, including sign-in attempts
for other accounts and guest sign-in, returns "This account is blocked. Contact support." until storage is
cleared manually.
Cause: `refresh()` (`store.ts:180`) swallows every non-MFA error as `signed-out`; nothing purges the session.
Fix: in `refresh()`, when the error is `user_blocked`, try `deleteSession("current")`, clear the client
session (`client.setSession("")` and remove the SDK's `cookieFallback` entry), set a pending error notice with
`errorUserBlocked`, and make `afterSignIn()` reject so the form shows the message.

### 6. Inline "Manage account" button is dead outside the modal
Observed: `<authui-sign-in>` signed-in state, click "Manage account": nothing happens. Only works when the
panel is inside `<authui-modal>`.
Cause: it fires `authui-open` (`authui-sign-in.ts:517`) and only the modal's own dialog listens
(`authui-modal.ts:167`). Docs (`docs/content/docs/components/modal.mdx:36`) promise it works.
Fix: when `!this.embedded`, call `openModal("account")` from `modal-controller.ts`; keep the event for the
embedded case.

### 7. Tab strip is unreachable on narrow screens
Observed at 375 px and 320 px: `.tabs` is `inline-flex` with `justify-content: center` and `overflow-x: auto`,
so the overflow is clipped on both sides. The selected "Profile" tab is scrolled out of view and cannot be
reached; "Activity" is cut to "A". No scrollbar (hidden on purpose).
Fix (`styles/base.ts:396`): use `justify-content: flex-start` (or `safe center`), give tabs `flex: 0 0 auto`,
scroll the selected tab into view on select, and consider a `<select>` or wrapping layout under 400 px.

### 8. Long name or email breaks the account header and the page layout
Observed: 60-char name plus 90-char email. Desktop: the email overflows the card and the "Sign out" button is
pushed outside the panel. Mobile: the whole page becomes ~1300 px wide and horizontally scrollable. The inline
signed-in panel wraps the avatar onto its own line and the email runs past the card edge. The user menu grows
to the email's width with no cap.
Cause: `.identity` (`authui-account.ts:49`) and `.inline` (`base.ts:542`) are flex items without `min-width: 0`;
`.row-sub` (`base.ts:517`) ellipsis never triggers; `.menu` (`authui-user-button.ts:38`) has no `max-width`.
Fix: `min-width: 0; flex: 1` on `.identity` and the signed-in row, `overflow: hidden; text-overflow: ellipsis;
white-space: nowrap` on `.row-title` where it holds the name, `max-width: min(320px, 90vw)` on `.menu`, and
`title` attributes for the full values.

---

## P1: wrong, confusing or unpolished behaviour

### 9. Raw Appwrite validation messages with backticks reach the user
Observed: empty sign-up submit shows "Invalid `email` param: Value must be a valid email address"; short
password shows "Invalid `password` param: Password must be between 8 and 256 characters long."; phone without
"+" shows "Invalid `phone` param: Phone number must start with a '+' can have a maximum of fifteen digits.";
empty name in Profile shows "Invalid `name` param: …". Forms are `novalidate` with `required`/`minlength`
attributes that are never checked.
Fix: run `form.reportValidity()` (or custom inline validation with friendly strings) before calling the store
in every submit handler (`authui-sign-in.ts:119` and siblings, account handlers). Map
`general_argument_invalid` in `describeError()` (`errors.ts:64`) to per-field strings by parsing the param
name, falling back to `errorGeneric`.

### 10. Whole HTML error pages leak into the error event and could reach the UI
Observed: on Cloud 2.2.0 `GET /account/logs` returns an HTML 404 page; the `error` event's `message` is the
entire page (the harness log became 64 000 px wide). Any 404/HTML response would render as an alert.
Fix: in `toAuthUIError()` (`errors.ts:43`) detect `^\s*<(!doctype|html)` and replace the message with
`errorGeneric` while keeping `code`/`type`; never render HTML-looking messages in `describeError()`.

### 11. Activity tab: wrong docs claim and an orphaned tab after the first click
Observed (real): tab list shows "Activity"; clicking it calls `listLogs`, gets 404, the tab vanishes, no tab is
selected, and the panel shows a card titled "Activity" with "No recent activity." Docs say Cloud supports it
(`docs/content/docs/account-management.mdx:35`); Cloud 2.2.0 does not.
Fix: when `loadLogs()` (`authui-account.ts:225`) fails with `general_route_not_found`, switch `active` to
`profile` (or keep the tab and show an explanatory empty state). Better: probe once on hydrate and hide the tab
before it is ever shown. Update the docs.

### 12. Header title is wrong for the signed-in state and after passwordless sign-in
Observed: after sign-up the card reads "Sign up for Acme" above "Test Person / Manage account / Sign out";
after SMS sign-in it reads "Continue with phone". Only the `sign-in` step maps to "Signed in as".
Fix: in `renderHeader()` (`authui-sign-in.ts:302`) check `status === "signed-in"` before the step switch.
(Resolved automatically once task 2 resets the step, but keep the guard.)

### 13. Success and error notices survive navigation
Observed: "If an account exists for …, a reset link is on its way." stays visible on the email-OTP screen;
"That code is not valid" stays after clicking "Send code" back to the email form (`authui-sign-in.ts:742`); in
the account panel "Done" sits at the top through the rest of the session (no dismiss button).
Fix: clear `notice` and `error` in `go()` (`:94`) and when `token` is reset; add a dismiss button and a
timeout to account notices (`authui-account.ts:497`); clear `notice` when a new action starts.

### 14. "Done" is a poor success message
Observed: every account update (name, email, TOTP verified, phone verified) shows a green alert reading just
"Done" (`authui-account.ts:262` and others).
Fix: specific strings: "Name updated", "Email updated. Verify the new address.", "Authenticator added",
"Phone verified". Add keys to `types.ts`/`i18n.ts`.

### 15. "Enabled"/"Disabled" built by string concatenation
`${u.mfa ? this.t("enable") : this.t("disable")}d` (`authui-account.ts:947`) breaks every translation.
Fix: add `enabled`/`disabled` strings.

### 16. Delete account copy is in the wrong tense
"Your account is disabled and you are signed out. An administrator can restore it." (`i18n.ts:92`) reads as if
it already happened. Fix: "Deleting disables your account and signs you out everywhere. An administrator can
restore it." Also show a confirmation notice after deletion (currently the modal silently swaps to the sign-in
form, task 22).

### 17. Wrong message when the current password is wrong on Change password
Observed: `user_invalid_credentials` from `updatePassword` renders "Invalid email or password." Fix: pass a
context to `describeError()` (`errors.ts:64`) so password change shows "Current password is incorrect." Make
the current-password field `required` when `passwordUpdate` is set (`authui-account.ts:876`).

### 18. "Current password" is misleading for passwordless accounts
Observed: a phone-only user (no password) changing email is asked for "Current password"; Appwrite accepts
anything typed and makes it the account password. Fix: when `!user.passwordUpdate`, label the field
"Create a password" with a hint that it becomes the sign-in password (`authui-account.ts:691` and the phone
equivalent).

### 19. Avatar shows "+" for phone-only users
Observed: header avatar, user button and signed-in row all render "+" (first char of `+15555550100`).
Fix: in the label/initial helper (`authui-sign-in.ts:499`, account and user-button equivalents) fall back to
the `user` icon (or first digit) when the label is not alphanumeric; show a friendlier label such as the
formatted phone.

### 20. "Send code" link on the code-entry screen is ambiguous and does not resend
It navigates back to the email/phone form (`authui-sign-in.ts:742`) while keeping the previous error. Fix: rename
to "Resend code" and actually call `sendEmailOtp`/`sendPhoneOtp` again with a short cooldown; add a
separate "Use a different email" link.

### 21. SMS code notice uses an envelope icon
`renderCodeEntry()` (`authui-sign-in.ts:731`) always uses `icons.mail`. Use `icons.smartphone` for `phone`.

### 22. Modal keeps the wide account layout when nobody is signed in
Observed: `AuthUI.open("account")` or `<authui-button view="account">` while signed out, and signing out from
inside the account modal, both leave a 600 px dialog containing a 420 px sign-in form aligned left with blank
space on the right. Sign-in success inside that nested panel does not close the modal (`onSuccess`
`authui-modal.ts:141` is bound to the direct child only), and deleting the account inside the modal swaps to the
form with no message.
Fix: in `show()`/render (`authui-modal.ts:112`, `:156`) render `sign-in` whenever `status !== "signed-in"`,
close the modal (or switch view) on `signed-out`, and listen for `authui-success` on the dialog so nested
panels are covered.

### 23. Redirect-return notices show raw server text and are consumed by whichever component renders first
Observed: `?authui=magic-url` with a bad secret shows "Invalid token passed in the request." instead of the
mapped "This link is invalid or has expired."; `?authui=verify-email` with a bad secret likewise. When an inline
`<authui-sign-in>` exists (even inside a hidden `<authui-show>`) it consumes the one-shot notice, so the modal
never opens. `?authui=recovery` without `secret` and `?authui=oauth` without params are ignored silently.
Fix: use `describeError()` in `handleRedirect()` (`store.ts:666`); show an error notice for incomplete
returns; make notices sticky until dismissed rather than consumed on first render, or route them to the modal
only when the redirect was started from it.

### 24. Reset-password screen loses the one-shot token on "Back"
`renderReset()` (`authui-sign-in.ts:679`) drops `recovery` on navigation and the URL was already cleaned. Fix: keep
the pending recovery until it succeeds or the page unloads, and on an expired token offer a "Request a new
link" button that goes to `forgot-password` with the email prefilled when known.

### 25. Inline panels steal focus on page load
`updated()` (`authui-sign-in.ts:66`) focuses the first input on every step change including the initial
render, so a page with an inline panel scrolls to the form and loses the reader's place; two panels fight for
focus. Fix: autofocus only after a user-initiated step change or when `embedded` inside an open modal.

### 26. `signUp: false` is not enforced for direct navigation
`view="sign-up"` or `AuthUI.open("sign-up")` still render the sign-up form. Fix: in `go()`/`renderStep()`
redirect to `sign-in` when `config.signUp === false`.

### 27. Long TOTP secret is dumped inline
Appwrite 2.2.0 returns a 104-character secret; it is rendered inside the hint sentence ("Or enter this key
manually: HVDK…") and wraps into a wall of text (`authui-account.ts:994`). Fix: render the key in its own
`.code` block, grouped in 4-character chunks, with a Copy button.

### 28. Destructive actions have no confirmation
"Regenerate" recovery codes (`authui-account.ts:389`), "Remove" authenticator, "Disconnect" identity and
"Sign out everywhere" run immediately. Add the same two-step confirm used for Delete account, at least for
regenerate and remove.

### 29. "Recovery codes" button label is unclear once codes exist
`has ? t("recoveryCodes") : t("generateRecoveryCodes")` (`authui-account.ts:1060`) yields a noun as a button
label. Use "View recovery codes". Also explain that Appwrite lets codes be read only once after generation
and that viewing requires a recent second factor.

### 30. Enabling MFA with no usable factor gives no warning
The switch (`authui-account.ts:341`) flips to "Enabled" even when no authenticator, verified email or phone
exists, so the account is not actually protected. Show an inline warning and link to "Add authenticator".

### 31. Odd number of OAuth providers leaves an orphan half-width button
With 3 or 13 providers the last button sits alone in the left column (`base.ts:652`,
`authui-sign-in.ts:532`). Fix: `.providers.two > :last-child:nth-child(odd) { grid-column: 1 / -1 }`.

### 32. Legal footer missing on passwordless screens
Terms/Privacy (`authui-sign-in.ts:441`) render on sign-in and sign-up only, not on magic URL, email OTP or
phone screens where an account can also be created. Render it on every screen that can create an account.

### 33. Password value persists when switching between sign-in and sign-up
Typed password is kept across `go()`; clear `password`/`passwordConfirm` on navigation (email may stay).

### 34. Connections footer buttons lack a verb and feedback
Buttons read "Google", "GitHub" (`authui-account.ts:1270`) with no "Connect" label, no busy state, and the
click is not wrapped in `run()` so a failure is an unhandled rejection. Label them "Connect Google", route
through `run()`.

### 35. Sessions empty state reuses the activity string
`noActivity` (`authui-account.ts:1176`, `i18n.ts:90`) is shown for an empty sessions list. Add `noSessions`.

### 36. Update button enabled with an empty required field
Name card: clearing the name keeps "Update" enabled (`authui-account.ts:664`) and the server rejects it. Disable
when the trimmed value is empty or unchanged; same for email and phone.

### 37. Enter key in the phone verification code field does nothing
The code input lives in the phone form whose submit button is disabled while the number is unchanged, and
"Verify code" is `type="button"` (`authui-account.ts:770`, `:799`). Handle Enter in the code field to verify.

### 38. Verification email button has no cooldown
"Verify email" can be clicked repeatedly, each click sends another email and shows the same notice. Disable
for 30 to 60 s after a send and say "Sent. You can resend in 45 s".

### 39. Loading state layout jump
While `status === "loading"` `<authui-account>` renders a bare spinner with no card (`authui-account.ts:463`)
while `<authui-sign-in>` renders a card with a title, so the layout jumps when data arrives. Render the panel
chrome with a spinner inside.

### 40. Broken logo URL shows a broken-image icon with alt text
No `onerror` fallback for `branding.logo`; hide the image on error.

---

## P2: accessibility and i18n

### 41. Dialog has no accessible name
`aria-labelledby="authui-title"` (`authui-modal.ts:160`) points at an ID inside a nested shadow root, which
does not resolve. Set `aria-label` from the current screen title (expose it through the `authui-view` event
or a property) or move the title into the modal's own shadow root.

### 42. Tabs are not keyboard operable per the ARIA pattern
`role="tablist"` (`authui-account.ts:482`) with buttons only; arrow keys do nothing, there is no roving
`tabindex`, no `aria-controls`, no `role="tabpanel"`. Implement the WAI-ARIA tabs pattern.

### 43. User menu is not a keyboard menu
Opens with Enter, but ArrowDown does not move focus into it and items are not focused on open
(`authui-user-button.ts:118`). Focus the first item on open, support Arrow/Home/End, Escape returns focus to
the trigger.

### 44. `<header>` inside the sign-in panel creates a duplicate banner landmark
axe: `landmark-no-duplicate-banner` when the panel is on a page with its own `<header>`
(`authui-sign-in.ts:331`). Use a `<div>` or `role="presentation"`.

### 45. Focus lands on the close button when the modal auto-opens
When the modal opens from a redirect notice no step change happens, so the first input is not focused and the
X button takes focus. Focus the first input (or the alert) on `open`.

### 46. Hardcoded English strings bypass `t()`
"MFA" badge (`authui-account.ts:518`), "QR code" alt (`:992`), "Show password"/"Hide password"
(`authui-sign-in.ts:394`), "Logo" alt, the "d" suffix from task 15. Add string keys.

### 47. Dismissible alert text runs under the X button
`.alert .dismiss` is absolutely positioned; long notices wrap beneath it (`sign-in.styles.ts`). Add
`padding-inline-end: 36px` to dismissible alerts.

### 48. OTP inputs lack constraints
`type="text"` with no `maxlength`, `pattern`, or auto-submit on 6 digits for TOTP/OTP fields. Add
`maxlength="6"` and `pattern="[0-9]*"` where the factor is numeric (keep free text for recovery codes).

### 49. Copy button gives no failure feedback
`onCopyCodes` (`authui-account.ts:395`) swallows clipboard errors; show "Copy failed, select the codes" or
fall back to selecting the text.

---

## Docs corrections

- `docs/content/docs/account-management.mdx:35`: Cloud 2.2.0 has no `/account/logs`; describe the tab as
  conditional on the server version.
- `docs/content/docs/components/modal.mdx:36`: the "Manage account from the inline panel" behaviour does not
  work until task 6 is fixed.
- `docs/content/docs/mfa.mdx`: mention that verifying a new authenticator does not count as a recent challenge
  on the server (viewing recovery codes right after enrolment triggers step-up), unlike preview mode, and that
  Appwrite 2.x lets recovery codes be read only once after generation.

## Verified as working (no task)

Modal open/close (Escape, backdrop, focus trap), close-on-success, `successUrl` navigation, `radius` and
`primary` branding (computed styles checked), dark mode on every screen, magic-URL token redemption and URL
cleanup, `oauth-failed` return on a modal-only page, OAuth redirect URL construction (success/failure carry the
`authui` marker and page query), real TOTP enrolment and challenge, recovery code generation and step-up card,
sessions list with current-device badge, guest conversion, phone OTP with mock numbers, email verification
send, account deletion clears the local session, preview mode parity for all of the above.
