"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders the real <authui-sign-in> component in preview mode so visitors can
 * walk through every flow without a backend.
 */
export function LiveDemo({
  theme = "auto",
  primary,
}: {
  theme?: "light" | "dark" | "auto";
  primary?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@getauthui/core").then(({ authStore }) => {
      if (cancelled) return;
      authStore.configure({
        endpoint: "https://cloud.appwrite.io/v1",
        project: "authui-demo",
        methods: {
          emailPassword: true,
          emailOtp: true,
          anonymous: true,
          oauth: ["google", "github", "apple"],
        },
        branding: { name: "Acme", theme, primary },
        legal: { termsUrl: "#", privacyUrl: "#" },
        preview: true,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [theme, primary]);

  return (
    <div ref={ref} className="w-full flex justify-center min-h-[520px] items-start">
      {ready ? (
        <authui-sign-in style={{ width: "100%", maxWidth: 400 }} />
      ) : (
        <div className="w-full max-w-[400px] h-[520px] rounded-xl border border-fd-border animate-pulse bg-fd-muted/30" />
      )}
    </div>
  );
}
