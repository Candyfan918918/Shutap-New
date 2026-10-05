// Canonical production origin for all public routes.
// Used for canonical link tags and og:url. All public route head()
// functions should build absolute URLs as `${SITE_URL}${path}`.
export const SITE_URL = "https://shutap.com";

// Sitewide social share image (1200×630). The physical file lives at
// public/og/shutap-og-v2.png. Any public route's head() should emit this
// via `ogImageMeta()` from `@/lib/seo/meta`.
export const OG_IMAGE = `${SITE_URL}/og/shutap-og-v2.png`;
export const OG_IMAGE_ALT =
  "SHUTAP. Say it funnier. — you have the story, Shutap writes the jokes. For creators, comedians and anyone with a story.";
