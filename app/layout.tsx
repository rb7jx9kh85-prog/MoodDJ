import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Background from "@/components/Background";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Mood DJ — Describe a vibe. Get the perfect playlist.",
  description:
    "Mood DJ turns any mood, scene or feeling into a real Spotify playlist using AI. Describe a vibe, get the perfect playlist.",
  applicationName: "Mood DJ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mood DJ",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      // SVG first choice for browsers that support it — stays crisp at any size.
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Mood DJ",
    description: "Describe a vibe. Get the perfect playlist.",
    type: "website",
    url: appUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#1DB954",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <Background />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
