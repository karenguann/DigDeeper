import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";

import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DIG DEEPER",
  description: "A daily semantic evasion game. Miss the geologist's bombs and dig for gems.",
};

export const viewport: Viewport = {
  themeColor: "#140e09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={pixel.className}>{children}</body>
    </html>
  );
}
