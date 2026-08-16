import { prisma } from "@/lib/db";
import ThemeForm from "./_components/ThemeForm";

const DEFAULTS = {
  brandName:          "Messaivo",
  logoUrl:            null,
  primaryColor:       "#6C63FF",
  secondaryColor:     "#8B85FF",
  accentColor:        "#22D3EE",
  backgroundColor:    "#07090D",
  surfaceColor:       "#101722",
  borderColor:        "rgba(255,255,255,0.08)",
  textColor:          "#F5F7FA",
  mutedTextColor:     "#8B95A7",
  fontFamily:         "Geist",
  buttonStyle:        "rounded",
  borderRadius:       "8",
  landingHeading:     "Customer Conversations, Organized",
  landingDescription: "Connect your Facebook Pages, manage Messenger conversations, organize your audience, and streamline customer messaging from one intelligent workspace.",
  ctaText:            "Get started free",
  announcementText:   null,
  footerContent:      null,
};

export default async function AdminThemePage() {
  const theme = await prisma.siteTheme.findUnique({ where: { id: "singleton" } });

  const initial = theme
    ? {
        brandName:          theme.brandName,
        logoUrl:            theme.logoUrl,
        primaryColor:       theme.primaryColor,
        secondaryColor:     theme.secondaryColor,
        accentColor:        theme.accentColor,
        backgroundColor:    theme.backgroundColor,
        surfaceColor:       theme.surfaceColor,
        borderColor:        theme.borderColor,
        textColor:          theme.textColor,
        mutedTextColor:     theme.mutedTextColor,
        fontFamily:         theme.fontFamily,
        buttonStyle:        theme.buttonStyle,
        borderRadius:       theme.borderRadius,
        landingHeading:     theme.landingHeading,
        landingDescription: theme.landingDescription,
        ctaText:            theme.ctaText,
        announcementText:   theme.announcementText,
        footerContent:      theme.footerContent,
      }
    : DEFAULTS;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Website Theme</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          Customize the look, brand, and content of the public landing page. Changes are stored in the database.
        </p>
      </div>
      <ThemeForm initial={initial} defaults={DEFAULTS} />
    </div>
  );
}
