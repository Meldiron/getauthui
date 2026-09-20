import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { siteUrl } from "@/lib/shared";
import "./global.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | Auth UI",
    default: "Auth UI - Drop-in authentication for Appwrite",
  },
  description:
    "One script tag. Every Appwrite sign-in method, MFA, sessions and account management as web components that run on your own domain.",
  openGraph: {
    type: "website",
    siteName: "Auth UI",
    url: siteUrl,
    title: "Auth UI - Drop-in authentication for Appwrite",
    description:
      "One script tag. Every Appwrite sign-in method, MFA, sessions and account management as web components that run on your own domain.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auth UI - Drop-in authentication for Appwrite",
    description:
      "Every Appwrite sign-in method, MFA, sessions and account management. One script tag.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.svg" },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="author" type="text/plain" href="/llms.txt" />
      </head>
      <body className="flex flex-col min-h-dvh">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
