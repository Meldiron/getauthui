import { css } from "lit";

/**
 * Shared component styles. Class names mirror the shadcn primitives used in the
 * console (button variants, input, label, alert, badge, tabs, separator) so the
 * widget reads as part of the same system.
 */
export const base = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host {
    font-family: var(--authui-font);
    color: var(--authui-foreground);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: start;
    min-width: 0;
    max-width: 100%;
  }

  [hidden] {
    display: none !important;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ── Typography ── */
  .title {
    font-size: 18px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0;
    color: var(--authui-foreground);
  }
  .description {
    font-size: 13px;
    color: var(--authui-muted-foreground);
    margin: 6px 0 0;
  }
  .eyebrow {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--authui-muted-foreground);
  }
  .muted {
    color: var(--authui-muted-foreground);
  }
  .small {
    font-size: 13px;
  }
  .mono {
    font-family: var(--authui-font-mono);
  }

  /* ── Button ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
    border-radius: var(--authui-radius-md);
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    height: 36px;
    padding: 0 16px;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background-color 150ms,
      color 150ms,
      border-color 150ms,
      box-shadow 150ms,
      opacity 150ms;
    outline: none;
    flex-shrink: 0;
    text-decoration: none;
    position: relative;
  }
  .btn:focus-visible {
    border-color: var(--authui-ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
  }
  .btn:disabled,
  .btn[aria-disabled="true"] {
    pointer-events: none;
    opacity: 0.5;
  }
  .btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    pointer-events: none;
  }
  .btn-primary {
    background: var(--authui-primary);
    color: var(--authui-primary-foreground);
  }
  .btn-primary:hover {
    background: color-mix(in oklab, var(--authui-primary) 90%, transparent);
  }
  .btn-brand {
    background: var(--authui-brand);
    color: var(--authui-brand-foreground);
  }
  .btn-brand:hover {
    opacity: 0.9;
  }
  .btn-outline {
    border-color: var(--authui-border);
    background: transparent;
    color: var(--authui-foreground);
  }
  .btn-outline:hover {
    background: var(--authui-accent);
    color: var(--authui-accent-foreground);
  }
  .btn-secondary {
    background: var(--authui-secondary);
    color: var(--authui-secondary-foreground);
  }
  .btn-secondary:hover {
    background: color-mix(in oklab, var(--authui-secondary) 80%, transparent);
  }
  .btn-ghost {
    background: transparent;
    color: var(--authui-muted-foreground);
  }
  .btn-ghost:hover {
    background: var(--authui-accent);
    color: var(--authui-foreground);
  }
  .btn-destructive {
    background: var(--authui-destructive);
    color: #fff;
  }
  .btn-destructive:hover {
    background: color-mix(in oklab, var(--authui-destructive) 90%, transparent);
  }
  .btn-link {
    height: auto;
    padding: 0;
    border: 0;
    background: none;
    font-weight: 500;
    color: color-mix(in oklab, var(--authui-foreground) 85%, transparent);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-color: color-mix(in oklab, var(--authui-muted-foreground) 38%, transparent);
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    border-radius: 2px;
  }
  .btn-link:hover {
    color: var(--authui-foreground);
    text-decoration-color: color-mix(in oklab, var(--authui-muted-foreground) 58%, transparent);
  }
  .btn-sm {
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
  }
  .btn-lg {
    height: 40px;
    padding: 0 24px;
  }
  .btn-icon {
    width: 36px;
    height: 36px;
    padding: 0;
  }
  .btn-block {
    width: 100%;
  }

  /* ── Form ── */
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  /* Forgot after password in DOM (tab order); grid keeps it visually beside the label */
  .field-with-forgot {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "label forgot"
      "input input"
      "meta meta";
    column-gap: 8px;
    row-gap: 6px;
    align-items: center;
  }
  .field-with-forgot > .label {
    grid-area: label;
  }
  .field-with-forgot > .field-forgot {
    grid-area: forgot;
    justify-self: end;
  }
  .field-with-forgot > .input-wrap {
    grid-area: input;
  }
  .field-with-forgot > .hint,
  .field-with-forgot > .strength {
    grid-area: meta;
  }
  .label {
    font-size: 14px;
    line-height: 1;
    font-weight: 500;
    user-select: none;
  }
  .input {
    font: inherit;
    /* 16px avoids iOS Safari auto-zoom on focus */
    font-size: 16px;
    height: 36px;
    width: 100%;
    min-width: 0;
    border-radius: var(--authui-radius-md);
    border: 1px solid var(--authui-input);
    background: transparent;
    color: var(--authui-foreground);
    padding: 4px 12px;
    outline: none;
    transition:
      border-color 150ms,
      box-shadow 150ms;
  }
  :host([data-theme="dark"]) .input {
    background: color-mix(in oklab, var(--authui-input) 30%, transparent);
  }
  .input::placeholder {
    color: var(--authui-muted-foreground);
  }
  .input:focus-visible {
    border-color: var(--authui-ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
  }
  .input[aria-invalid="true"] {
    border-color: var(--authui-destructive);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-destructive) 20%, transparent);
  }
  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-wrap .input {
    padding-inline-end: 40px;
  }
  .input-wrap .btn-icon {
    position: absolute;
    inset-inline-end: 2px;
    width: 32px;
    height: 32px;
    color: var(--authui-muted-foreground);
  }
  .input-otp {
    letter-spacing: 0.4em;
    text-align: center;
    font-family: var(--authui-font-mono);
    font-size: 18px;
    height: 44px;
  }

  /* Vibes-style segmented OTP (3 + sep + 3) */
  .otp {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 52px;
  }
  .otp-group {
    display: flex;
    flex: 1;
    gap: 6px;
    min-width: 0;
  }
  .otp-slot {
    flex: 1;
    min-width: 0;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--authui-input);
    border-radius: var(--authui-radius-md);
    background: var(--authui-background);
    color: var(--authui-foreground);
    font-family: var(--authui-font-mono);
    font-size: 22px;
    font-weight: 600;
    line-height: 1;
    box-shadow: var(--authui-shadow-xs);
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background-color 120ms ease;
  }
  .otp-slot-active {
    border-color: var(--authui-ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 40%, transparent);
  }
  .otp-invalid .otp-slot {
    border-color: var(--authui-destructive);
  }
  .otp-invalid .otp-slot-active {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-destructive) 35%, transparent);
  }
  .otp-sep {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 12px;
  }
  .otp-sep span {
    display: block;
    width: 8px;
    height: 2px;
    border-radius: 1px;
    background: var(--authui-muted-foreground);
    opacity: 0.7;
  }
  .otp-native {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    margin: 0;
    border: 0;
    padding: 0;
    caret-color: transparent;
    color: transparent;
    background: transparent;
    cursor: text;
    z-index: 1;
  }
  .otp-disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  @media (max-width: 380px) {
    .otp-slot {
      height: 44px;
      font-size: 18px;
    }
  }
  .hint {
    font-size: 12px;
    color: var(--authui-muted-foreground);
    margin: 0;
  }
  .strength {
    display: grid;
    gap: 6px;
    margin-top: 6px;
  }
  .strength-meter {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    height: 4px;
  }
  .strength-meter span {
    border-radius: 999px;
    background: var(--authui-muted);
    transition: background-color 120ms ease;
  }
  /* destructive-foreground matches light destructive and stays visible on dark card */
  .strength-meter[data-level="1"] span:nth-child(-n + 1) {
    background: var(--authui-destructive-foreground);
  }
  .strength-meter[data-level="2"] span:nth-child(-n + 2) {
    background: var(--authui-warning-foreground);
  }
  .strength-meter[data-level="3"] span:nth-child(-n + 3) {
    background: var(--authui-warning-foreground);
  }
  .strength-meter[data-level="4"] span {
    background: var(--authui-success);
  }
  .strength-label {
    font-size: 12px;
    color: var(--authui-muted-foreground);
    margin: 0;
  }
  .phone-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
    min-width: 0;
  }
  .phone-country {
    flex: 0 0 auto;
    width: auto;
    max-width: 42%;
    min-width: 7.5rem;
    padding-inline-end: 28px;
  }
  .phone-national {
    flex: 1 1 auto;
    min-width: 0;
  }
  :host([data-theme="dark"]) .strength-meter span {
    background: var(--authui-border);
  }
  :host([data-theme="dark"]) .strength-meter[data-level="1"] span:nth-child(-n + 1) {
    background: var(--authui-destructive-foreground);
  }
  :host([data-theme="dark"]) .strength-meter[data-level="2"] span:nth-child(-n + 2),
  :host([data-theme="dark"]) .strength-meter[data-level="3"] span:nth-child(-n + 3) {
    background: var(--authui-warning-foreground);
  }
  :host([data-theme="dark"]) .strength-meter[data-level="4"] span {
    background: var(--authui-success);
  }

  .btn.last-used {
    border-color: var(--authui-brand);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--authui-brand) 35%, transparent);
  }
  .last-used-badge {
    display: inline-flex;
    align-items: center;
    margin-inline-start: auto;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--authui-brand);
    background: color-mix(in oklab, var(--authui-brand) 12%, transparent);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Alert ── */
  .alert:has(.dismiss) {
    padding-inline-end: 36px;
  }
  .alert {
    position: relative;
    width: 100%;
    border-radius: var(--authui-radius-lg);
    border: 1px solid var(--authui-border);
    padding: 12px 16px;
    font-size: 13px;
    display: grid;
    grid-template-columns: 16px 1fr;
    column-gap: 12px;
    row-gap: 2px;
    align-items: start;
    background: var(--authui-card);
    color: var(--authui-card-foreground);
  }
  .alert svg {
    width: 16px;
    height: 16px;
    margin-top: 2px;
  }
  .alert-title {
    grid-column: 2;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .alert-body {
    grid-column: 2;
    color: var(--authui-muted-foreground);
    line-height: 1.55;
  }
  .alert-error {
    color: var(--authui-error-foreground);
    border-color: color-mix(in oklab, var(--authui-error-foreground) 30%, transparent);
    background: var(--authui-error-bg);
  }
  .alert-error .alert-body {
    color: var(--authui-error-foreground);
  }
  .alert-success {
    color: var(--authui-success-foreground);
    border-color: color-mix(in oklab, var(--authui-success-foreground) 30%, transparent);
    background: var(--authui-success-bg);
  }
  .alert-success .alert-body {
    color: color-mix(in oklab, var(--authui-success-foreground) 90%, transparent);
  }
  .alert-info {
    background: var(--authui-info-bg);
  }
  .alert-warning {
    color: var(--authui-warning-foreground);
    border-color: color-mix(in oklab, var(--authui-warning-foreground) 30%, transparent);
    background: var(--authui-warning-bg);
  }

  /* ── Badge ── */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: var(--authui-radius-md);
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    width: fit-content;
  }
  .badge svg {
    width: 12px;
    height: 12px;
  }
  .badge-success {
    background: var(--authui-success-bg);
    color: var(--authui-success-foreground);
  }
  .badge-error {
    background: var(--authui-error-bg);
    color: var(--authui-error-foreground);
  }
  .badge-warning {
    background: var(--authui-warning-bg);
    color: var(--authui-warning-foreground);
  }
  .badge-info {
    background: var(--authui-info-bg);
    color: var(--authui-info-foreground);
  }
  .badge-outline {
    background: color-mix(in oklab, var(--authui-muted) 60%, transparent);
    color: color-mix(in oklab, var(--authui-foreground) 80%, transparent);
  }

  /* ── Separator ── */
  .separator {
    height: 1px;
    width: 100%;
    background: var(--authui-border);
    flex-shrink: 0;
  }
  .separator-text {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--authui-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .separator-text::before,
  .separator-text::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--authui-border);
  }

  /* ── Tabs ── */
  .tabs {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    border-radius: var(--authui-radius-lg);
    background: color-mix(in oklab, var(--authui-muted) 50%, transparent);
    color: var(--authui-muted-foreground);
    padding: 3px;
    gap: 2px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    /* Subtle right-edge fade as overflow cue at narrow widths */
    -webkit-mask-image: linear-gradient(
      to right,
      #000 0%,
      #000 calc(100% - 28px),
      transparent 100%
    );
    mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 28px), transparent 100%);
  }
  :host([data-theme="dark"]) .tabs {
    background: color-mix(in oklab, var(--authui-muted) 80%, transparent);
  }
  .tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 100%;
    min-height: 38px;
    flex: 0 0 auto;
    padding: 8px 12px;
    border-radius: var(--authui-radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--authui-muted-foreground);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 150ms,
      background-color 150ms,
      box-shadow 150ms;
  }
  .tab:hover {
    color: var(--authui-foreground);
  }
  .tab[aria-selected="true"] {
    background: var(--authui-background);
    color: var(--authui-foreground);
    border-color: var(--authui-input);
  }
  .tab:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
  }

  /* ── Settings card (console "Settings Card Structure") ── */
  .card {
    border-radius: var(--authui-radius-xl);
    border: 1px solid var(--authui-border);
    background: color-mix(in oklab, var(--authui-card) 50%, transparent);
    overflow: hidden;
  }
  .card-header {
    padding: 16px 24px;
  }
  .card-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: var(--authui-foreground);
  }
  .card-description {
    font-size: 13px;
    color: var(--authui-muted-foreground);
    margin: 8px 0 0;
  }
  .card-body {
    padding: 16px 24px;
    border-top: 1px solid var(--authui-border);
  }
  .card-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--authui-border);
    background: color-mix(in oklab, var(--authui-muted) 30%, transparent);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .card-danger {
    border-color: color-mix(in oklab, var(--authui-destructive) 40%, transparent);
  }

  /* ── Lists / rows ── */
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
  }
  .row + .row {
    border-top: 1px solid var(--authui-border);
  }
  .row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .row-title {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .row-title svg {
    width: 16px;
    height: 16px;
    color: var(--authui-muted-foreground);
    flex-shrink: 0;
  }
  .row-sub {
    font-size: 12px;
    color: var(--authui-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* ── Misc ── */
  .stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .stack-sm {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .inline {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
    flex: 1;
  }
  .between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .center {
    text-align: center;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid color-mix(in oklab, currentColor 30%, transparent);
    border-top-color: currentColor;
    animation: authui-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes authui-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--authui-muted);
    color: var(--authui-muted-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
    overflow: hidden;
    text-transform: uppercase;
  }
  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .logo {
    display: block;
    max-height: 40px;
    max-width: 160px;
    margin: 0 auto 16px;
  }
  .code {
    font-family: var(--authui-font-mono);
    font-size: 13px;
    border-radius: var(--authui-radius-md);
    border: 1px solid var(--authui-border);
    background: color-mix(in oklab, var(--authui-muted) 50%, transparent);
    padding: 2px 6px;
    color: color-mix(in oklab, var(--authui-foreground) 85%, transparent);
    word-break: break-all;
    user-select: all;
  }
  .codes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .qr {
    display: block;
    width: 168px;
    height: 168px;
    margin: 0 auto;
    border-radius: var(--authui-radius-md);
    border: 1px solid var(--authui-border);
    background: #fff;
    padding: 8px;
  }
  .legal {
    font-size: 12px;
    color: var(--authui-muted-foreground);
    text-align: center;
    margin: 0;
    line-height: 1.6;
  }
  .legal a {
    color: inherit;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 3px;
  }
  .legal a:hover {
    color: var(--authui-foreground);
  }
  .legal-accept {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 12px;
    color: var(--authui-muted-foreground);
    line-height: 1.5;
    text-align: start;
    cursor: pointer;
    user-select: none;
  }
  .legal-accept input {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    accent-color: var(--authui-brand);
    cursor: pointer;
  }
  .legal-accept a {
    color: inherit;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 3px;
  }
  .legal-accept a:hover {
    color: var(--authui-foreground);
  }
  .links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--authui-muted-foreground);
    flex-wrap: wrap;
  }
  .providers {
    display: grid;
    gap: 8px;
  }
  .providers.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .providers.two > :last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
  .providers .btn svg {
    width: 18px;
    height: 18px;
  }
  /* Compact icon-only OAuth row (oauthLayout: icon / horizontal). */
  .providers.icon {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .providers.icon .btn {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
    position: relative;
  }
  .providers.icon .btn svg {
    width: 18px;
    height: 18px;
  }
  .providers.icon .last-used-badge,
  .providers.icon .oauth-last-used-pill {
    display: none;
  }
  .providers.icon .oauth-last-used-dot {
    top: 4px;
    inset-inline-end: 4px;
  }
  /* OAuth accordion: last-used (or focused) expands; others stay icon-compact. */
  .providers.accordion {
    display: flex;
    width: 100%;
    gap: 8px;
  }
  .providers.accordion > .provider-slot {
    position: relative;
    flex: 0 1 2.25rem;
    min-width: 2.25rem;
    overflow: visible;
    transition: flex-grow 480ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .providers.accordion > .provider-slot.is-expanded {
    flex-grow: 1;
  }
  .providers.accordion .btn {
    position: relative;
    width: 100%;
    min-width: 0;
    justify-content: center;
    gap: 0;
    padding-inline: 0;
    overflow: hidden;
  }
  .providers.accordion .btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  .provider-label {
    display: grid;
    min-width: 0;
    grid-template-columns: 0fr;
    transition: grid-template-columns 480ms cubic-bezier(0.22, 1, 0.36, 1) 160ms;
  }
  .provider-label > span {
    min-width: 0;
    overflow: hidden;
  }
  .provider-label-text {
    display: block;
    white-space: nowrap;
    padding-inline-start: 6px;
    opacity: 0;
    transition: opacity 160ms ease;
  }
  .providers.accordion > .provider-slot.is-expanded .provider-label {
    grid-template-columns: 1fr;
    transition: grid-template-columns 480ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .providers.accordion > .provider-slot.is-expanded .provider-label-text {
    opacity: 1;
    transition: opacity 240ms ease 320ms;
  }
  .oauth-last-used {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }
  .oauth-last-used-dot,
  .oauth-last-used-pill {
    position: absolute;
    transition: opacity 180ms ease;
  }
  .oauth-last-used-dot {
    top: -3px;
    inset-inline-end: -3px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--authui-brand);
    box-shadow: 0 0 0 2px var(--authui-card);
    opacity: 1;
  }
  .oauth-last-used-pill {
    top: -8px;
    inset-inline-start: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--authui-border);
    background: var(--authui-foreground);
    color: var(--authui-background);
    font-size: 10px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
  }
  .providers.accordion > .provider-slot.is-expanded .oauth-last-used-dot {
    opacity: 0;
  }
  .providers.accordion > .provider-slot.is-expanded .oauth-last-used-pill {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .providers.accordion > .provider-slot,
    .provider-label,
    .provider-label-text,
    .oauth-last-used-dot,
    .oauth-last-used-pill {
      transition: none;
    }
  }
  .empty {
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: var(--authui-muted-foreground);
  }
  .empty-well {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 28px 16px;
    border: 1px dashed var(--authui-border);
    border-radius: var(--authui-radius-xl);
    background: color-mix(in oklab, var(--authui-card) 50%, transparent);
  }
  .empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: var(--authui-muted);
    color: var(--authui-muted-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .empty-icon svg {
    width: 20px;
    height: 20px;
  }
  .empty-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--authui-foreground);
  }
  .empty-desc {
    margin: 0;
    font-size: 13px;
    color: var(--authui-muted-foreground);
    max-width: 280px;
  }
  .choice {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--authui-radius-lg);
    border: 1px solid var(--authui-border);
    background: transparent;
    color: var(--authui-foreground);
    font: inherit;
    text-align: start;
    cursor: pointer;
    transition:
      background-color 150ms,
      border-color 150ms;
  }
  .choice:hover {
    background: var(--authui-accent);
  }
  .choice:focus-visible {
    outline: none;
    border-color: var(--authui-ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
  }
  .choice svg {
    width: 18px;
    height: 18px;
    color: var(--authui-muted-foreground);
    flex-shrink: 0;
  }
  .choice-title {
    font-weight: 500;
    font-size: 14px;
  }
  .choice-sub {
    font-size: 12px;
    color: var(--authui-muted-foreground);
  }
  .switch {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: var(--authui-input);
    cursor: pointer;
    transition: background-color 150ms;
    flex-shrink: 0;
    padding: 0;
  }
  .switch[aria-checked="true"] {
    background: var(--authui-primary);
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 2px;
    inset-inline-start: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--authui-background);
    transition: transform 150ms;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .switch[aria-checked="true"]::after {
    transform: translateX(16px);
  }
  .switch:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
  }
  .switch:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation-duration: 0.01ms !important;
    }
  }
`;
