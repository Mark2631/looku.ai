import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LOOKU — Your style, understood.", template: "%s · LOOKU" },
  description: "Your wardrobe, personal AI stylist, outfit planner and lookbook in one private space.",
  applicationName: "LOOKU",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LOOKU" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "LOOKU — Your style, understood.", description: "A calmer way to get dressed.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#101113", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
