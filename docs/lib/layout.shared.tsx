import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-mono font-semibold text-[15px] tracking-tight">
          <span className="text-fd-muted-foreground">&lt;</span>
          authui
          <span className="text-fd-muted-foreground"> /&gt;</span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      { text: "Docs", url: "/docs", active: "url" },
      { text: "Guides", url: "/docs/guides", active: "nested-url" },
      { text: "Playground", url: "/playground" },
    ],
  };
}
