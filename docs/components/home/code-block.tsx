"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  code,
  title,
  children,
  className = "",
}: {
  code: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div
      className={`relative group rounded-xl border border-fd-border bg-fd-card/50 overflow-hidden text-left ${className}`}
    >
      {title ? (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-fd-border bg-fd-muted/30">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fd-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-fd-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-fd-border" />
          </div>
          <span className="text-[12px] text-fd-muted-foreground font-mono ml-2">{title}</span>
        </div>
      ) : null}
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 p-1.5 rounded-md border border-fd-border bg-fd-background transition-all text-xs z-10 cursor-pointer ${
          copied
            ? "opacity-100 text-emerald-500"
            : "opacity-0 group-hover:opacity-100 text-fd-muted-foreground hover:text-fd-foreground"
        } ${title ? "top-[46px]" : ""}`}
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre className="p-5 text-[13px] overflow-x-auto font-mono leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}
