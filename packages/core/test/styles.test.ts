import { describe, expect, it } from "vitest";
import { base } from "../src/styles/base.js";
import { tokens } from "../src/styles/tokens.js";

describe("shared layout styles", () => {
  it("keeps tabs from shrinking and starts them at the leading edge", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.tab\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(cssText).toMatch(/\.tabs\s*\{[^}]*justify-content:\s*flex-start/s);
  });

  it("lets flex rows shrink so long emails can ellipsis", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.inline\s*\{[^}]*min-width:\s*0/s);
    expect(cssText).toMatch(/\.inline\s*\{[^}]*flex:\s*1/s);
  });

  it("stretches an odd trailing OAuth provider across both columns", () => {
    const cssText = String(base);
    expect(cssText).toMatch(
      /\.providers\.two\s*>\s*:last-child:nth-child\(odd\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s
    );
  });

  it("keeps error alert body on the full error foreground for contrast", () => {
    const cssText = String(base);
    expect(cssText).toMatch(
      /\.alert-error\s+\.alert-body\s*\{[^}]*color:\s*var\(--authui-error-foreground\)/s
    );
    expect(cssText).not.toMatch(
      /\.alert-error\s+\.alert-body\s*\{[^}]*color-mix\([^)]*transparent/s
    );
  });

  it("lays out the password label and forgot link as siblings", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.field-header\s*\{[^}]*justify-content:\s*space-between/s);
  });

  it("keeps Forgot visually in the header via field-with-forgot grid areas", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.field-with-forgot\s*\{[^}]*grid-template-areas:/s);
    expect(cssText).toMatch(
      /\.field-with-forgot\s*>\s*\.field-forgot\s*\{[^}]*grid-area:\s*forgot/s
    );
  });

  it("lays out 3+ OAuth providers as an accordion row", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.providers\.accordion\s*\{[^}]*display:\s*flex/s);
    expect(cssText).toMatch(
      /\.providers\.accordion\s*>\s*\.provider-slot\.is-expanded\s*\{[^}]*flex-grow:\s*1/s
    );
  });

  it("styles empty states with an icon well and dashed card", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.empty-well\s*\{[^}]*border:\s*1px\s+dashed/s);
    expect(cssText).toMatch(/\.empty-icon\s*\{[^}]*border-radius:\s*999px/s);
  });

  it("gives danger cards a muted footer for confirm actions", () => {
    const cssText = String(base);
    expect(cssText).toMatch(
      /\.card-footer\s*\{[^}]*border-top:\s*1px\s+solid\s+var\(--authui-border\)/s
    );
    expect(cssText).toMatch(
      /\.card-footer\s*\{[^}]*background:\s*color-mix\(in\s+oklab,\s*var\(--authui-muted\)/s
    );
  });
});

describe("design tokens", () => {
  it("uses a dark enough light-theme error foreground for AA on the error bg", () => {
    const cssText = String(tokens);
    expect(cssText).toMatch(/--authui-error-foreground:\s*#b91c1c/);
  });

  it("raises the light focus ring for WCAG non-text contrast on white", () => {
    const cssText = String(tokens);
    // Light host block: ring must not stay near #e5e5e5 / oklch(0.898…)
    expect(cssText).toMatch(/:host\s*\{[^}]*--authui-ring:\s*#71717a/s);
    // Dark ring from 0.1.13 must not regress
    expect(cssText).toMatch(/:host\(\[data-theme="dark"\]\)\s*\{[^}]*--authui-ring:\s*#a1a1aa/s);
  });
});

describe("sign-in panel overflow", () => {
  it("lets embedded panel overflow so input focus rings are not clipped", async () => {
    const { signInStyles } = await import("../src/components/sign-in.styles.js");
    const cssText = String(signInStyles);
    expect(cssText).toMatch(/\.panel\.embedded\s*\{[^}]*overflow:\s*visible/s);
  });
});
