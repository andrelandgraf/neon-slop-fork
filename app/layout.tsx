import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neon Console (Slop Fork)",
  description:
    "An open clone of the Neon Postgres console — projects, branches, monitoring, SQL editor, tables, and settings on top of the public Neon API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
