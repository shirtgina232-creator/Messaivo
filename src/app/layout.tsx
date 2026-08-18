import type { Metadata } from "next";
import { cache } from "react";
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
  const title = branding?.browserTitle ?? "Messaivo — Customer Conversations, Organized";
  return {
    title,
    description:
      "Connect your Facebook Pages, manage Messenger conversations, organize your audience, and streamline customer messaging from one intelligent workspace.",
    keywords: ["customer messaging", "CRM", "Facebook Messenger", "inbox management"],
    icons: {
      icon: branding?.faviconUrl
        ? [{ url: branding.faviconUrl }]
        : [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    openGraph: {
      title,
      description: "Bring your customer messaging workflow into one powerful workspace.",
      type: "website",
      url: "https://messaivo.com",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Manage customer conversations from one intelligent workspace.",
    },
    other: {
      "facebook-domain-verification": "j52wczag8fj2t0e1vz3hmhgaot0kr",
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
        </body>
      </html>
    </ClerkProvider>
  );
}
