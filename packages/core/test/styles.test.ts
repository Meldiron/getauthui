import { describe, expect, it } from "vitest";
import { base } from "../src/styles/base.js";

describe("shared tab styles", () => {
  it("keeps tabs from shrinking and starts them at the leading edge", () => {
    const cssText = String(base);
    expect(cssText).toMatch(/\.tab\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(cssText).toMatch(/\.tabs\s*\{[^}]*justify-content:\s*flex-start/s);
  });
});
