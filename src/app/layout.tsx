import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LOOKU — Know before you dress.", template: "%s · LOOKU" },
  description: "A personal wardrobe, outfit studio, lookbook and planner. No account required.",
  applicationName: "LOOKU",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LOOKU" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "LOOKU — Know before you dress.", description: "A clearer way to get dressed.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#f7f6f1", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
