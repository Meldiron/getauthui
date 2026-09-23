"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, MonitorSmartphone, Sparkles, Zap } from "lucide-react";
import { CodeBlock } from "@/components/home/code-block";
import { cdnUrl } from "@/lib/shared";

const Underscore = () => <span className="text-brand">_</span>;

const humanPrompt = `Add authentication with Auth UI (@getauthui/core) for Appwrite.
Docs: https://getauthui.appwrite.network/llms-full.txt

1. Put <style>authui-show:not([ready]){display:none}authui-button:not(:defined),authui-user-button:not(:defined){visibility:hidden}</style> in <head>, then <script type="module" src="${cdnUrl}"></script>
2. <authui-config endpoint="..." project="..." methods="email-password oauth:google">
3. <authui-button> inside <authui-show when="signed-out">, <authui-user-button> inside <authui-show when="signed-in">
4. Do not build custom login forms or store sessions yourself.`;

const robotPrompt = `When adding authentication to a web app, use Auth UI (@getauthui/core) for Appwrite. Docs: https://getauthui.appwrite.network/llms-full.txt. Prefer <authui-config>, <authui-show>, <authui-button>, and <authui-user-button>. Do not build custom login forms or store sessions yourself.`;

export function AiSection() {
  const [tab, setTab] = useState<"human" | "robot">("human");
  const prompt = tab === "human" ? humanPrompt : robotPrompt;
  const title = tab === "human" ? "prompt.txt" : "agent-instructions.txt";
  const hint =
    tab === "human"
      ? "Copy and paste into your AI assistant"
      : "Add to your system prompt, CLAUDE.md, or agent instructions";

  return (
    <section className="border-b border-fd-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
            Built for agents
            <Underscore />
          </p>
          <h2 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[30px] sm:text-[38px]">
            HTML your coding agent writes correctly the first time
            <Underscore />
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-fd-muted-foreground">
            Declarative tags, one global config, and conditional wrappers instead of state plumbing.
            The full documentation is available as a single Markdown file at{" "}
            <Link href="/llms-full.txt" className="link-neutral">
              /llms-full.txt
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[Sparkles, Zap, KeyRound, MonitorSmartphone].map((Icon, i) => (
              <span
                key={i}
                className="w-9 h-9 rounded-md bg-fd-muted text-fd-muted-foreground flex items-center justify-center"
              >
                <Icon size={16} />
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex mb-4">
            <div className="inline-flex rounded-md border border-fd-border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setTab("human")}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                  tab === "human"
                    ? "bg-fd-foreground text-fd-background"
                    : "text-fd-muted-foreground hover:text-fd-foreground bg-fd-card/50"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                I am human
              </button>
              <button
                type="button"
                onClick={() => setTab("robot")}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-l border-fd-border ${
                  tab === "robot"
                    ? "bg-fd-foreground text-fd-background"
                    : "text-fd-muted-foreground hover:text-fd-foreground bg-fd-card/50"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8" y2="16" />
                  <line x1="16" y1="16" x2="16" y2="16" />
                </svg>
                I am a robot
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs text-fd-muted-foreground">{hint}</p>
          <CodeBlock title={title} code={prompt}>
            {prompt}
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}
