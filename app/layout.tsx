import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PWARegister } from "./pwa-register";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: {
    default: "Veriq Property — Know Before You Go",
    template: "%s | Veriq Property",
  },
  description:
    "Veriq Property is a trust-focused property intelligence platform. View verified listings, unlock detailed property reports, and compare agent trust scores before you inspect.",
  keywords: [
    "property intelligence",
    "real estate Nigeria",
    "property listings Port Harcourt",
    "verified property",
    "agent trust score",
    "property rental Nigeria",
  ],
  authors: [{ name: "Veriq Property" }],
  creator: "Veriq Property",
  publisher: "Veriq Property",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://veriqproperty.com",
    siteName: "Veriq Property",
    title: "Veriq Property — Know Before You Go",
    description:
      "Make smarter property decisions before physical inspections. Verified listings, trust scores, and detailed property intelligence.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Veriq Property" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veriq Property — Know Before You Go",
    description:
      "Make smarter property decisions before physical inspections.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  metadataBase: new URL("https://veriqproperty.com"),
};

export const viewport: Viewport = {
  themeColor: "#070B14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Veriq Property" />
      </head>
      <body className="bg-white text-navy-900 antialiased">
        <AuthProvider>
          <ToastProvider>
            <PWARegister />
            <Navbar />
            {children}
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
