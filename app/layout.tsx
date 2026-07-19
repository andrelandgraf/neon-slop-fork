import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Neon Console (Slop Fork)",
  description:
    "An open clone of the Neon Postgres console — projects, branches, monitoring, SQL editor, tables, and settings on top of the public Neon API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
