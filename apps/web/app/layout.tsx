import type { Metadata } from "next";
import type React from "react";
import { Inter } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:
    "Soulaan Co-op | Building Generational Wealth Through Economic Cooperation",
  description:
    "Join the Soulaan Co-op and transform everyday spending into community wealth. Use Unity Coin (UC) and SoulaaniCoin (SC) to keep money circulating in Black communities while earning rewards and voting power.",
  keywords: [
    "Black economic empowerment",
    "community wealth building",
    "cooperative economics",
    "Unity Coin",
    "SoulaaniCoin",
    "DAO",
    "cryptocurrency",
    "Black-owned businesses",
    "economic justice",
    "generational wealth",
    "community investment",
    "financial inclusion",
  ],
  authors: [{ name: "Soulaan Co-op" }],
  creator: "Soulaan Co-op",
  publisher: "Soulaan Co-op",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://soulaan.coop",
    siteName: "Soulaan Co-op",
    title:
      "Soulaan Co-op | Building Generational Wealth Through Economic Cooperation",
    description:
      "Transform everyday spending into community wealth. Join the economic revolution that keeps money circulating in Black communities.",
    images: [
      {
        url: "/images/soulaan-og-image.png",
        width: 1200,
        height: 630,
        alt: "Soulaan Co-op - Building Generational Wealth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Soulaan Co-op | Building Generational Wealth Through Economic Cooperation",
    description:
      "Transform everyday spending into community wealth. Join the economic revolution that keeps money circulating in Black communities.",
    images: ["/images/soulaan-og-image.png"],
    creator: "@SoulaanCoop",
    site: "@SoulaanCoop",
  },
  alternates: {
    canonical: "https://soulaan.coop",
  },
  category: "finance",
  classification: "Business",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "theme-color": "#1e293b",
  },
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Additional SEO meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="msapplication-TileColor" content="#1e293b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Structured Data for Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Soulaan Co-op",
              description:
                "A community-driven economic initiative designed to empower Black Americans by transforming everyday financial activities into avenues for wealth-building and governance.",
              url: "https://soulaan.coop",
              logo: "https://soulaan.coop/images/soulaan-flag.jpg",
              foundingDate: "2024",
              sameAs: [
                "https://github.com/soulaan-coop",
                "https://twitter.com/SoulaanCoop",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "hello@soulaan.coop",
              },
              areaServed: "United States",
              knowsAbout: [
                "Economic Empowerment",
                "Community Wealth Building",
                "Cooperative Economics",
                "Cryptocurrency",
                "DAO Governance",
              ],
            }),
          }}
        />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}