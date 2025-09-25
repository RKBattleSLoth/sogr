import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Graph - AI-Powered Social Network Management",
  description: "Intelligent social life information management system powered by AI. Organize, search, and visualize your social connections.",
  keywords: ["Social Graph", "AI", "Network Management", "Relationship Management", "Social Intelligence"],
  authors: [{ name: "Social Graph Team" }],
  openGraph: {
    title: "Social Graph - AI-Powered Social Network Management",
    description: "Intelligent social life information management system",
    url: "https://chat.z.ai",
    siteName: "Social Graph",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Graph - AI-Powered Social Network Management",
    description: "Intelligent social life information management system",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
