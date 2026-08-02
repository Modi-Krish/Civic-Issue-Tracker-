import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#EDEBE4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: "Civic Issue Tracker",
    template: "%s | Civic Issue Tracker",
  },
  description: "Report, track, and resolve civic issues — road damage, water leakage, electricity faults, and sanitation problems in your city.",
  keywords: ["civic", "issue tracker", "city management", "report pothole", "community"],
  authors: [{ name: "CivicTracker Team" }],
  openGraph: {
    title: "Civic Issue Tracker",
    description: "Report, track, and resolve civic issues in your city.",
    url: "https://civictracker.com",
    siteName: "CivicTracker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Civic Issue Tracker",
    description: "Report, track, and resolve civic issues in your city.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
