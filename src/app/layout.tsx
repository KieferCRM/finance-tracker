import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TipTab",
  description: "BarMath for Bartenders. Track tips, shifts, and spending.",
  applicationName: "TipTab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TipTab",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#101214",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
