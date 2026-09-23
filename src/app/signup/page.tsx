import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SignupForm from "@/app/signup/SignupForm";

export default async function SignupPage() {
  const { userId: clerkId, sessionStatus } = await auth();
  // Only redirect a fully signed-in user; pending (social sign-up in progress) stays here to complete.
  if (clerkId && sessionStatus !== "pending") redirect("/app");

  let heading = "Create your account";
  let description = "Start managing customer conversations with Messaivo.";
  let logoUrl: string | null = null;

  try {
    const [content, branding] = await Promise.all([
      prisma.siteContent.findUnique({ where: { id: "singleton" }, select: { signupHeading: true, signupDescription: true } }),
      prisma.siteBranding.findUnique({ where: { id: "singleton" }, select: { logoUrl: true } }),
    ]);
    if (content?.signupHeading)    heading     = content.signupHeading;
    if (content?.signupDescription) description = content.signupDescription;
    if (branding?.logoUrl)          logoUrl     = branding.logoUrl;
  } catch {
    // Fall back to defaults
  }

  return <SignupForm heading={heading} description={description} logoUrl={logoUrl} />;
}
