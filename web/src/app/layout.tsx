import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fraunces, Source_Sans_3, DM_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/motion/page-transition";
import { SiteBackdrop } from "@/components/motion/site-backdrop";
import { HashScroll } from "@/components/motion/hash-scroll";
import { TxReturnHandler } from "@/components/wallet/tx-return-handler";
import { NetworkMismatchBanner } from "@/components/wallet/network-banner";
import "./globals.css";

/* Lottery night: Fraunces display + Source Sans body; mono = DM Mono */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
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
    site: "@Near_Myst",
    creator: "@Near_Myst",
  },
  icons: {
    icon: [{ url: "/brand/logo-v2.png", type: "image/png" }],
    apple: [{ url: "/brand/logo-v2.png", type: "image/png" }],
  },
  other: {
    "page-type": "software",
    "site-kind": "gaming",
    "color-scheme": "dark",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0A08",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-type="software"
      data-radius="soft"
      data-buttons="block"
      data-motion="on"
      data-ground="sky"
      className={`${fraunces.variable} ${sourceSans.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-overlay focus:px-3 focus:py-2 focus:text-sm focus:text-primary"
        >
          Skip to content
        </a>
        <WalletProvider>
          <MotionProvider>
            <Suspense fallback={null}>
              <TxReturnHandler />
            </Suspense>
            <HashScroll />
            <NetworkMismatchBanner />
            <SiteBackdrop />
            <div className="relative z-[1]">
              <Header />
              <main id="main" className="min-h-[70vh]">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
            </div>
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
