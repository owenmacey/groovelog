import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Toaster } from "sonner";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Groovelog",
    template: "%s — Groovelog",
  },
  description: "Rate albums. Write reviews. Share your taste.",
  icons: { icon: "/logo.png" },
  openGraph: {
    type: "website",
    siteName: "Groovelog",
    title: "Groovelog",
    description: "Rate albums. Write reviews. Share your taste.",
    url: BASE_URL,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Groovelog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Groovelog",
    description: "Rate albums. Write reviews. Share your taste.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}
