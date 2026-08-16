import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // Use process.env directly with a fallback so `prisma generate` works
    // during CI/build even before DATABASE_URL is injected by the platform.
    url: process.env.DATABASE_URL ?? "",
  },
});
