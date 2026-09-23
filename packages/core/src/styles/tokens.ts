import { css } from "lit";

/**
 * Design tokens ported from the Appwrite Console v4 design system (shadcn "new-york", zinc base).
 * Every token is a CSS custom property on :host so developers can override any of them
 * from the page, e.g. `authui-modal { --authui-primary: #fd366e; }`.
 */
export const tokens = css`
  :host {
    /* Light theme (matches :root in the console) */
    --authui-background: oklch(1 0 0);
    --authui-foreground: oklch(0.141 0.005 285.823);
    --authui-card: oklch(1 0 0);
    --authui-card-foreground: oklch(0.141 0.005 285.823);
    --authui-popover: oklch(1 0 0);
    --authui-popover-foreground: oklch(0.141 0.005 285.823);
    --authui-primary: oklch(0.21 0.006 285.885);
    --authui-primary-foreground: oklch(0.985 0 0);
    --authui-secondary: oklch(0.967 0.001 286.375);
    --authui-secondary-foreground: oklch(0.21 0.006 285.885);
    --authui-muted: oklch(0.967 0.001 286.375);
    --authui-muted-foreground: oklch(0.552 0.016 285.938);
    --authui-accent: oklch(0.967 0.001 286.375);
    --authui-accent-foreground: oklch(0.21 0.006 285.885);
    --authui-destructive: oklch(0.577 0.245 27.325);
    --authui-destructive-foreground: oklch(0.577 0.245 27.325);
    /* Soft zinc borders (Console / shadcn new-york); hierarchy via surfaces */
    --authui-border: oklch(0.91 0.004 286.32);
    --authui-input: oklch(0.88 0.004 286.32);
    /* Raised on white for WCAG 1.4.11 / 2.4.7 (~3:1+) UI contrast; zinc-500 */
    --authui-ring: #71717a;
    --authui-brand: #fd366e;
    --authui-brand-foreground: #ffffff;
    --authui-success: oklch(0.696 0.17 162.48);
    --authui-success-foreground: #047857;
    --authui-success-bg: rgba(16, 185, 129, 0.1);
    --authui-warning-foreground: #b45309;
    --authui-warning-bg: rgba(245, 158, 11, 0.1);
    --authui-error-foreground: #b91c1c;
    --authui-error-bg: rgba(239, 68, 68, 0.1);
    --authui-info-foreground: #475569;
    --authui-info-bg: rgba(100, 116, 139, 0.1);
    --authui-overlay: rgba(0, 0, 0, 0.5);

    --authui-radius: 0.625rem;
    --authui-radius-sm: calc(var(--authui-radius) - 4px);
    --authui-radius-md: calc(var(--authui-radius) - 2px);
    --authui-radius-lg: var(--authui-radius);
    --authui-radius-xl: calc(var(--authui-radius) + 4px);

    --authui-font:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans",
      "Droid Sans", "Helvetica Neue", sans-serif;
    --authui-font-mono: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;

    --authui-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --authui-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --authui-z: 110;
  }

  :host([data-theme="dark"]) {
    --authui-background: #141417;
    --authui-foreground: oklch(0.985 0 0);
    --authui-card: #1c1c20;
    --authui-card-foreground: oklch(0.985 0 0);
    --authui-popover: #1c1c20;
    --authui-popover-foreground: oklch(0.985 0 0);
    --authui-primary: oklch(0.985 0 0);
    --authui-primary-foreground: oklch(0.21 0.006 285.885);
    --authui-secondary: #27272b;
    --authui-secondary-foreground: oklch(0.985 0 0);
    --authui-muted: #27272b;
    --authui-muted-foreground: oklch(0.72 0.015 286.067);
    --authui-accent: #27272b;
    --authui-accent-foreground: oklch(0.985 0 0);
    --authui-destructive: oklch(0.396 0.141 25.723);
    --authui-destructive-foreground: oklch(0.637 0.237 25.331);
    /* Soft borders (Vercel / shadcn zinc dark): white alpha, not zinc-500 chrome */
    --authui-border: oklch(1 0 0 / 10%);
    --authui-input: oklch(1 0 0 / 15%);
    /* Focus ring stays high-contrast for WCAG 1.4.11 / 2.4.7 */
    --authui-ring: #a1a1aa;
    --authui-success-foreground: #34d399;
    --authui-warning-foreground: #fbbf24;
    --authui-error-foreground: #f87171;
    --authui-info-foreground: #94a3b8;
    --authui-overlay: rgba(0, 0, 0, 0.6);
    --authui-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
    color-scheme: dark;
  }
`;
