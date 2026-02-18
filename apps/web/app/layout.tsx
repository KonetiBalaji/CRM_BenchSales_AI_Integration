import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SiteHeader } from '@/components/site-header';
import { Sidebar } from '@/components/sidebar';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BenchCRM - AI-Powered Bench Sales Platform',
  description: 'Enterprise-grade bench sales CRM with AI matching',
  icons: {
    icon: '/favicon.ico',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL} />
        
        {/* OpenTelemetry RUM */}
        <Script
          src="/otel-init.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1">
              <SiteHeader />
              <main className="container mx-auto px-4 py-6">
                {children}
              </main>
            </div>
          </div>
        </Providers>
        
        {/* Web Vitals */}
        <Script id="web-vitals" strategy="afterInteractive">
          {`
            import { reportWebVitals } from '@/lib/performance/web-vitals';
            reportWebVitals();
          `}
        </Script>
      </body>
    </html>
  );
}
