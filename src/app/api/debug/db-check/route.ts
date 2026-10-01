import { NextResponse } from "next/server";

// Diagnostic endpoint — Preview only.
// Reports whether DATABASE_URL is set and reachable WITHOUT exposing credentials.
// Returns: { env: string, host: string|null, ping: "ok"|"failed", error?: string }
// Remove or gate behind auth before merging to master.

export async function GET() {
  // VERCEL_ENV is "production" on the main deployment, "preview" on branch previews.
  // NODE_ENV is always "production" on Vercel regardless of environment — cannot use it here.
  if (process.env.VERCEL_ENV === "production" && !process.env.ENABLE_DB_DEBUG) {
    return NextResponse.json({ error: "not available in production" }, { status: 403 });
  }

  const raw = process.env.DATABASE_URL;

  if (!raw) {
    return NextResponse.json({ env: "missing", host: null, ping: "skipped" });
  }

  let host: string | null = null;
  try {
    host = new URL(raw).hostname;
  } catch {
    return NextResponse.json({ env: "set_but_unparseable", host: null, ping: "skipped" });
  }

  // Attempt a live ping using a raw pg connection (bypasses Prisma singleton).
  let ping: "ok" | "failed" = "failed";
  let error: string | undefined;
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: raw, connectionTimeoutMillis: 5000, max: 1 });
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    await pool.end();
    ping = "ok";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Report presence (not values) of every env var the OAuth callback needs.
  const oauthEnv = {
    META_APP_ID:              !!process.env.META_APP_ID,
    META_APP_SECRET:          !!process.env.META_APP_SECRET,
    META_TOKEN_ENCRYPTION_KEY: (process.env.META_TOKEN_ENCRYPTION_KEY ?? "").length,
    META_CONFIG_ID:           !!process.env.META_CONFIG_ID,
    APP_URL:                  process.env.APP_URL ?? "(not set)",
    VERCEL_ENV:               process.env.VERCEL_ENV ?? "(not set)",
    CLERK_SECRET_KEY:         !!process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  return NextResponse.json({ env: "set", host, ping, ...(error ? { error } : {}), oauthEnv });
}
