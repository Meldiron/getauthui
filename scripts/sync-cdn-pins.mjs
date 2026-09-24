#!/usr/bin/env node
/**
 * Sync every hard-coded @getauthui/core CDN / install pin to packages/core version.
 *
 * Source of truth: packages/core/package.json "version".
 * Also updates docs/lib/shared.ts cdnUrl and the authui-creator skill tip.
 * Rewrites leftover cdn.jsdelivr.net/npm/@getauthui/core@ pins to unpkg.com.
 *
 * Run after bumping the package version (agent:publish-* does this automatically).
 * Humans: bump packages/core, then `pnpm sync:cdn-pins`, then publish / commit.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version)) {
  console.error(`Invalid version in packages/core/package.json: ${version}`);
  process.exit(1);
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "out", ".next", "coverage", ".source"]);

const TEXT_EXT = new Set([".md", ".mdx", ".ts", ".tsx", ".js", ".mjs", ".jsx", ".html", ".json"]);

/** Paths we never rewrite (audit notes, lockfiles, package manifests' own version field handled separately). */
function shouldSkipFile(abs) {
  const rel = relative(root, abs).replace(/\\/g, "/");
  if (rel === "packages/core/package.json") return true;
  if (rel === "pnpm-lock.yaml" || rel === "package-lock.json") return true;
  if (rel.startsWith("DX-") || rel === "GROK.md" || rel === "UX-AUDIT-TASKS.md") return true;
  return false;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

const pinRe = /@getauthui\/core@\d+\.\d+\.\d+(-[\w.-]+)?/g;
const tipRe = /Pin the CDN version \(`@\d+\.\d+\.\d+(-[\w.-]+)?` or newer\)/g;
const cdnUrlRe =
  /export const cdnUrl = "https:\/\/unpkg\.com\/@getauthui\/core@\d+\.\d+\.\d+(-[\w.-]+)?";/;

let changed = 0;
for (const abs of walk(root)) {
  if (shouldSkipFile(abs)) continue;
  const ext = abs.includes(".") ? abs.slice(abs.lastIndexOf(".")) : "";
  if (!TEXT_EXT.has(ext) && !abs.endsWith("SKILL.md")) continue;

  let text = readFileSync(abs, "utf8");
  const before = text;

  text = text.replace(pinRe, `@getauthui/core@${version}`);
  // Canonical CDN host is unpkg (see docs/lib/shared.ts). Rewrite leftover jsDelivr pins.
  text = text.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@getauthui\/core@/g,
    "https://unpkg.com/@getauthui/core@"
  );
  text = text.replace(tipRe, `Pin the CDN version (\`@${version}\` or newer)`);
  if (relative(root, abs).replace(/\\/g, "/") === "docs/lib/shared.ts") {
    text = text.replace(
      cdnUrlRe,
      `export const cdnUrl = "https://unpkg.com/@getauthui/core@${version}";`
    );
  }

  if (text !== before) {
    writeFileSync(abs, text);
    changed += 1;
    console.log(`updated ${relative(root, abs)}`);
  }
}

console.log(
  changed === 0
    ? `CDN pins already at @${version}`
    : `Synced ${changed} file(s) to @getauthui/core@${version}`
);
