import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TipTapped",
  description: "BarMath for Bartenders. Track tips, shifts, and spending.",
  applicationName: "TipTapped",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TipTapped",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#101214",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
