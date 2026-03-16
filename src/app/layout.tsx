import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalErrorHandler } from "@/components/global-error-handler";

export const metadata: Metadata = {
  title: "Nexaro",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('nexaro-dark-mode');if(m==='true')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <GlobalErrorHandler />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
