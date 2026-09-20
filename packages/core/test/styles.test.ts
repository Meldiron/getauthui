import { describe, expect, it } from "vitest";
import { base } from "../src/styles/base.js";

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
});
