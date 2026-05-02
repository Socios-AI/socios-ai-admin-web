import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ToastProvider";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Sócios AI · Admin",
  description: "Painel administrativo do ecossistema Sócios AI.",
  // icons: filesystem convention drives (app/favicon.ico, app/icon.png, app/apple-icon.png).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#8df78d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <ToastProvider />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
