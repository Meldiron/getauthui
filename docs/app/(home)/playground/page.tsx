import type { Metadata } from "next";
import { Playground } from "@/components/home/playground";

export const metadata: Metadata = {
  title: "Playground",
  description: "Try Auth UI against your own Appwrite project and tune the theme live.",
};

export default function PlaygroundPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fd-muted-foreground">
            Playground<span className="text-brand">_</span>
          </p>
          <h1 className="font-display mt-4 text-balance font-normal leading-none tracking-tight text-[32px] sm:text-[44px]">
            Point it at your project<span className="text-brand">_</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-fd-muted-foreground">
            Every screen below is the real component. It starts in preview mode, where any email,
            password or code is accepted and nothing is sent anywhere, so you can walk through sign
            in, MFA and the account screen freely. Switch preview off to run it against your own
            project. In that case add{" "}
            <code className="font-mono text-[13px] px-1.5 py-0.5 rounded-md border border-fd-border bg-fd-muted/50">
              getauthui.appwrite.network
            </code>{" "}
            as a Web platform first.
          </p>
        </div>
      </section>
      <Playground />
    </main>
  );
}
