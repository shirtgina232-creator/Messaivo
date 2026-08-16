import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth protection is handled in src/app/app/layout.tsx via auth.protect()
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|.*\\.png$).*)",
  ],
};
