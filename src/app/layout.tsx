import type { Metadata } from "next";
import { cache } from "react";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { prisma } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Memoised per-request so generateMetadata and the render share one DB round-trip
const getSiteData = cache(async () => {
  try {
    const [theme, branding] = await Promise.all([
      prisma.siteTheme.findUnique({ where: { id: "singleton" } }),
      prisma.siteBranding.findUnique({ where: { id: "singleton" } }),
    ]);
    return { theme, branding };
  } catch {
    return { theme: null, branding: null };
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getSiteData();
  const siteName = "Messaivo";
  const defaultTitle = "Messaivo — Facebook Messenger CRM for Business";
  const title = branding?.browserTitle ?? defaultTitle;
  const description =
    "Messaivo is a Facebook Messenger CRM that helps businesses manage customer conversations, organize contacts, send permitted broadcasts, and collaborate as a team — all from one workspace.";
  return {
    title: {
      default: title,
      template: `%s — ${siteName}`,
    },
    description,
    keywords: [
      "Facebook Messenger CRM",
      "customer messaging platform",
      "Messenger inbox management",
      "Facebook Page inbox",
      "customer conversation management",
      "Messenger broadcast tool",
      "Facebook business messaging",
      "customer support CRM",
      "audience management",
      "message templates",
    ],
    authors: [{ name: siteName, url: "https://messaivo.com" }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL("https://messaivo.com"),
    alternates: { canonical: "/" },
    icons: {
      icon: branding?.faviconUrl
        ? [{ url: branding.faviconUrl }]
        : [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    openGraph: {
      siteName,
      title,
      description,
      type: "website",
      url: "https://messaivo.com",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      site: "@messaivo",
      title,
      description,
    },
    other: {
      "facebook-domain-verification": "j52wczag8fjl2t0e1vz3hmhgaot0kr",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getSiteData();

  // Override CSS variables with admin-configured theme values.
  // Only non-null/non-empty values override the defaults from globals.css.
  const overrides: string[] = [];
  if (theme) {
    if (theme.backgroundColor) overrides.push(`--bg: ${theme.backgroundColor};`);
    if (theme.surfaceColor)    overrides.push(`--card: ${theme.surfaceColor};`);
    if (theme.textColor)       overrides.push(`--text: ${theme.textColor};`);
    if (theme.mutedTextColor)  overrides.push(`--muted: ${theme.mutedTextColor};`);
    if (theme.borderColor)     overrides.push(`--border: ${theme.borderColor};`);
    if (theme.primaryColor)    overrides.push(`--color-primary: ${theme.primaryColor};`);
    if (theme.accentColor)     overrides.push(`--color-accent: ${theme.accentColor};`);
  }
  const themeStyle = overrides.length > 0
    ? `:root[data-theme="dark"] { ${overrides.join(" ")} }`
    : "";

  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="dark"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body
          className="min-h-full flex flex-col"
          style={{ background: "var(--bg)", color: "var(--text)" }}
          suppressHydrationWarning
        >
          {themeStyle && (
            <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
          )}
          <ThemeProvider>{children}</ThemeProvider>
          <Script
            id="schema-org"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "Messaivo",
                  url: "https://messaivo.com",
                  logo: "https://messaivo.com/favicon.svg",
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "hello@messaivo.com",
                    contactType: "customer support",
                  },
                  sameAs: [],
                },
                {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "Messaivo",
                  url: "https://messaivo.com",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: "https://messaivo.com/?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  name: "Messaivo",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  url: "https://messaivo.com",
                  description:
                    "Messaivo is a Facebook Messenger CRM for businesses. It provides a unified inbox for Messenger conversations, audience management, message templates, permitted broadcasts, and team collaboration tools.",
                  offers: [
                    {
                      "@type": "Offer",
                      name: "Starter",
                      price: "19",
                      priceCurrency: "USD",
                      billingIncrement: "P1M",
                    },
                    {
                      "@type": "Offer",
                      name: "Professional",
                      price: "49",
                      priceCurrency: "USD",
                      billingIncrement: "P1M",
                    },
                    {
                      "@type": "Offer",
                      name: "Business",
                      price: "99",
                      priceCurrency: "USD",
                      billingIncrement: "P1M",
                    },
                  ],
                },
              ]),
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
