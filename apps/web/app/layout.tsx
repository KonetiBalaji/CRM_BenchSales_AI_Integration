import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { SiteHeader } from "../components/site-header";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BenchCRM",
  description: "AI-powered bench sales CRM"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100`}>
        <Providers>
          <SiteHeader />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}


