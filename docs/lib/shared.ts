import { createGetUrl } from "fumadocs-core/source";

export const appName = "Auth UI";
export const siteUrl = "https://getauthui.appwrite.network";
export const docsRoute = "/docs";
export const docsContentRoute = "/llms.mdx/docs";

export const gitConfig = {
  user: "Meldiron",
  repo: "getauthui",
  branch: "main",
};

export const cdnUrl = "https://unpkg.com/@getauthui/core";

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];
  return { segments, url: getContentUrl(segments, page.locale) };
}
