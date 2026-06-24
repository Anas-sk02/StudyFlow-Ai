import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RegisterSW } from "@/components/pwa/register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyFlow AI",
  description: "AI-powered study planner and collaboration platform",
  manifest: "/manifest.webmanifest",
  applicationName: "StudyFlow AI",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StudyFlow AI" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9ecf2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
                try {
                  var accent = localStorage.getItem('accent');
                  var map = {
                    indigo:['#4f46e5','rgba(79,70,229,0.16)'], violet:['#7c3aed','rgba(124,58,237,0.16)'],
                    emerald:['#059669','rgba(5,150,105,0.16)'], rose:['#e11d48','rgba(225,29,72,0.16)'],
                    amber:['#d97706','rgba(217,119,6,0.16)'], sky:['#0284c7','rgba(2,132,199,0.16)']
                  };
                  if (accent && map[accent]) {
                    document.documentElement.style.setProperty('--primary', map[accent][0]);
                    document.documentElement.style.setProperty('--ring', map[accent][1]);
                  }
                } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased">
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
