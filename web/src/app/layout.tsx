import type { Metadata } from "next";
import { Suspense } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/motion/page-transition";
import { TxReturnHandler } from "@/components/wallet/tx-return-handler";
import { NetworkMismatchBanner } from "@/components/wallet/network-banner";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteTitle = "NearMyst — Mystery packs on NEAR testnet";
const siteDescription =
  "Buy mystery packs, open them for token rewards, and create machines on NEAR testnet. Demo with test tokens — not real money.";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s · NearMyst",
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: "NearMyst",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-overlay focus:px-3 focus:py-2 focus:text-sm focus:text-primary"
        >
          Skip to content
        </a>
        <WalletProvider>
          <MotionProvider>
            <Suspense fallback={null}>
              <TxReturnHandler />
            </Suspense>
            <NetworkMismatchBanner />
            <Header />
            <main
              id="main"
              className="mx-auto min-h-[70vh] max-w-container px-4 py-8 pb-16 md:px-6 md:py-10"
            >
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            <Toaster
              theme="dark"
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    "border border-border bg-overlay text-primary shadow-overlay",
                },
              }}
            />
          </MotionProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
