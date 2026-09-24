/**
 * OAuth relay page — strips the cross-origin Referer left by Facebook's redirect.
 *
 * After the Meta OAuth callback redirects here, the browser's Referer is still
 * "www.facebook.com".  If we went directly to /app/pages, Clerk middleware would
 * see a cross-origin Referer + sec-fetch-dest:document and fire
 * shouldForceHandshakeForCrossDomain, which fails and returns the user as
 * signed-out.
 *
 * By landing here first (excluded from Clerk middleware), then doing a JS
 * window.location.replace(), the subsequent /app/pages request carries
 * Referer: www.messaivo.com (same-origin) and Clerk validates the session
 * token normally.
 */
export default async function RelayPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  // Reject anything that is not a relative path (prevents open redirects)
  const safe =
    typeof to === "string" && to.startsWith("/") && !to.startsWith("//")
      ? to
      : "/app/pages";

  return (
    <>
      {/* JS redirect: fires immediately, sets same-origin Referer for next request */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(safe)})`,
        }}
      />
      {/* Fallback for the rare case JS is disabled */}
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${safe}`} />
      </noscript>
    </>
  );
}
