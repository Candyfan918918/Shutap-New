// Canonical production origin for all public routes.
// Used for canonical link tags and og:url. All public route head()
// functions should build absolute URLs as `${SITE_URL}${path}`.
export const SITE_URL = "https://shutap.com";

// Sitewide social share image (1200×630). The physical file lives at
// public/og/shutap-og-v4.png. Any public route's head() should emit this
// via `ogImageMeta()` from `@/lib/seo/meta`.
export const OG_IMAGE = `${SITE_URL}/og/shutap-og-v4.png`;
export const OG_IMAGE_ALT =
  "Shutap. Say it funnier. Your humor, amplified. Type what happened and get the video, the caption and the bit, in your voice. shutap.com";
