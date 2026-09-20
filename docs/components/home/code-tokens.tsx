/* Tiny token helpers so hero snippets use the console code palette without a highlighter. */
export const T = {
  tag: (s: string) => <span style={{ color: "var(--code-keyword)" }}>{s}</span>,
  attr: (s: string) => <span style={{ color: "var(--code-property)" }}>{s}</span>,
  str: (s: string) => <span style={{ color: "var(--code-string)" }}>{s}</span>,
  kw: (s: string) => <span style={{ color: "var(--code-module-keyword)" }}>{s}</span>,
  fn: (s: string) => <span style={{ color: "var(--code-function)" }}>{s}</span>,
  cm: (s: string) => <span style={{ color: "var(--code-comment)" }}>{s}</span>,
  pl: (s: string) => <span className="text-fd-foreground">{s}</span>,
};
