// Bench Sales CRM Web App - Root Layout
// Created by Balaji Koneti
// This component provides the base layout and navigation for the entire application

import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-5xl p-6">
          {/* Header with navigation */}
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Bench Sales CRM</h1>
            <nav className="space-x-4 text-sm">
              <a className="hover:underline" href="/">Home</a>
              <a className="hover:underline" href="/consultants">Consultants</a>
            </nav>
          </header>
          
          {/* Main content area */}
          {children}
        </div>
      </body>
    </html>
  );
}
