import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles/global.css?url";
// Above-the-fold faces, preloaded so first paint does not swap typography.
import soraBoldWoff2 from "@fontsource/sora/files/sora-latin-700-normal.woff2?url";
import soraBlackWoff2 from "@fontsource/sora/files/sora-latin-800-normal.woff2?url";
import newsreaderItalicWoff2 from "@fontsource/newsreader/files/newsreader-latin-400-italic.woff2?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { GlobalHeader } from "@/components/GlobalHeader";
import { WaveDots } from "@/components/motion/WaveDots";
import { NavProgress } from "@/components/NavProgress";
// Loaded with the page, not on demand (Oct 23 2026): an on-demand chunk can
// be gone after a deploy while the page is still open, and that visit's
// tracking was lost. posthog-js itself still loads lazily inside initPostHog.
import * as posthogLib from "@/lib/posthog";
import * as tracking from "@/lib/tracking";

import { useNavigate } from "@/compat/router";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    void posthogLib.phCaptureException(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shutap Humor Amplifier Lab" },
      { name: "author", content: "Shutap" },
      { property: "og:site_name", content: "Shutap" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preload", as: "font", type: "font/woff2", href: soraBoldWoff2, crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: soraBlackWoff2, crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: newsreaderItalicWoff2, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        // Tells Google which image is Shutap's logo (the wordmark, Oct 2026).
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": "https://shutap.com/#org",
          name: "Shutap",
          url: "https://shutap.com",
          logo: "https://shutap.com/favicon-512.png",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": "https://shutap.com/#app",
          name: "Shutap",
          alternateName: "SHUTAP. Say it funnier.",
          applicationCategory: "EntertainmentApplication",
          operatingSystem: "Web",
          url: "https://shutap.com",
          image: "https://shutap.com/og/shutap-og-v4.png",
          description:
            "Shutap is the humor amplifier. Type what happened and Shutap amplifies it into a bit in your voice — hook, setup, tags and a button — with a 5-second video, a caption and hashtags, then runs it as stand-up, lays it out as a skit, or formats it as a one-page sketch. Film it for TikTok, Reels or YouTube Shorts, take it to the stage, or bring it to a toast, a talk or a meeting. Shutap amplifies your humor; it never replaces it. Your stories and jokes stay yours. Identifying details are removed from stories before storage, and Shutap never uses your content to train AI. Shutap makes jokes about situations, never about the person telling the story, and it does not give advice.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description:
              "Free to use. Basic is $7.99/month; Pro is $49.99/month.",
          },
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === '/';

  useEffect(() => {
    // Kick off PostHog import ASAP so bouncy visitors still get page_view
    // + Pageleave. Non-blocking; idempotent via memoized promise.
    void posthogLib.initPostHog();
    let mounted = true
    const run = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { initPostHog } = posthogLib;
      const { recordVisitOnce, syncProfileFromSession, trackEvent } = tracking;
      let lastUserId: string | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          await supabase.auth.signInAnonymously();
          const { data: after } = await supabase.auth.getSession();
          lastUserId = after.session?.user?.id ?? null;
        } else {
          lastUserId = data.session.user?.id ?? null;
        }
        const u = (await supabase.auth.getSession()).data.session?.user;
        // Fire tracking after the session settles so profile ties to the
        // real user id when they're already signed in.
        void initPostHog();
        void recordVisitOnce(window.location.pathname);
        void syncProfileFromSession(u as never);
        void trackEvent("page_view", { path: window.location.pathname });
      } catch (e) {
        console.warn("[auth] anonymous bootstrap failed", e);
      }
      if (!mounted) return;
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        const nextId = session?.user?.id ?? null;
        if (nextId === lastUserId) return;
        lastUserId = nextId;
        const u = session?.user as { is_anonymous?: boolean } | undefined;
        if (event === "SIGNED_IN" && u && !u.is_anonymous) {
          void syncProfileFromSession(session?.user as never, { login: true });
          const provider = (session?.user?.app_metadata as { provider?: string } | undefined)?.provider ?? "email";
          void trackEvent("sign_in", { provider });
        }
        queueMicrotask(() => {
          if (!mounted) return;
          router.invalidate();
          if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
        });
      });
      (RootComponent as unknown as { _unsub?: () => void })._unsub = () => sub.subscription.unsubscribe();
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const handle: number = ric
      ? ric(() => { void run(); }, { timeout: 1500 })
      : (window.setTimeout(() => { void run(); }, 0) as unknown as number);
    // Fire page_view on every route change (initial page_view fires from run() above).
    let lastPath = window.location.pathname;
    const unsubNav = router.subscribe('onResolved', () => {
      const p = window.location.pathname;
      if (p === lastPath) return;
      lastPath = p;
      void tracking.trackEvent('page_view', { path: p });
    });
    return () => {
      mounted = false;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (ric && cic) cic(handle); else window.clearTimeout(handle);
      unsubNav();
      (RootComponent as unknown as { _unsub?: () => void })._unsub?.();
    };
  }, [router, queryClient]);


  return (
    <QueryClientProvider client={queryClient}>
      <NavProgress />
      <WaveDots />
      <GlobalHeader />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />

    </QueryClientProvider>
  );
}
