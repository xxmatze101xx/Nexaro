import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexaro — Unified Inbox for Executives",
  description:
    "One app for all your business communication. AI-powered importance scoring, smart drafts, and unified inbox across Slack, Gmail, Calendar, Teams, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
