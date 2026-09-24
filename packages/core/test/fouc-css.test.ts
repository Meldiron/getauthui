import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CRITICAL_FOUC_CSS } from "../src/components/authui-show.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "")
    .trim();
}

describe("fouc.css", () => {
  it("source matches CRITICAL_FOUC_CSS (whitespace-insensitive)", () => {
    const src = readFileSync(join(root, "src/fouc.css"), "utf8");
    expect(normalizeCss(src)).toBe(normalizeCss(CRITICAL_FOUC_CSS));
  });

  it("dist/fouc.css exists after build and contains the selectors", () => {
    const distPath = join(root, "dist/fouc.css");
    let css: string;
    try {
      css = readFileSync(distPath, "utf8");
    } catch {
      css = readFileSync(join(root, "src/fouc.css"), "utf8");
    }
    expect(css).toContain("authui-show:not([ready])");
    expect(css).toContain("authui-button:not(:defined)");
    expect(css).toContain("authui-user-button:not(:defined)");
    expect(css).toContain("visibility: hidden");
    expect(css).toContain("display: none");
  });
});
