import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";
import { isAdminRole } from "@/lib/admin-helpers";
import LoginForm from "@/app/login/LoginForm";

export default async function LoginPage() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const sessionUser = await getSessionUser(raw);
  if (sessionUser) {
    redirect(isAdminRole(sessionUser.role) ? "/admin" : "/app");
  }

  // Load configurable content from DB; fall back to defaults if not set
  let heading = "Welcome back";
  let description = "Sign in to your Messaivo workspace.";
  let logoUrl: string | null = null;

  try {
    const [content, branding] = await Promise.all([
      prisma.siteContent.findUnique({ where: { id: "singleton" }, select: { loginHeading: true, loginDescription: true } }),
      prisma.siteBranding.findUnique({ where: { id: "singleton" }, select: { logoUrl: true } }),
    ]);
    if (content?.loginHeading)    heading     = content.loginHeading;
    if (content?.loginDescription) description = content.loginDescription;
    if (branding?.logoUrl)         logoUrl     = branding.logoUrl;
  } catch {
    // DB unavailable — fall back to defaults
  }

  return <LoginForm heading={heading} description={description} logoUrl={logoUrl} />;
}
