import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Nav } from "@/components/layout/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP Incident Triage Portal",
  description: "AI-assisted incident submission, enrichment, and triage for Oracle ERP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}>
        <Nav />
        <main className="mx-auto max-w-content px-6 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
