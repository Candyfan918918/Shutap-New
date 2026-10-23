import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setRouterRef } from "./lib/router-ref";


export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page as soon as a link is hovered or touched, and keep
    // that early load for 30s so the click itself is instant.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  // Only expose on the client — the server creates a router per request and
  // must never share instances across requests.
  if (typeof window !== "undefined") {
    setRouterRef(router as unknown as Parameters<typeof setRouterRef>[0]);
    installStaleBuildReload();
  }

  return router;
};

/* A tab opened before a deploy still points at the old build's files, which
   the deploy removed, so the next page it opens fails to load ("Importing a
   module script failed") and the click does nothing. Reload once onto the new
   build instead. At most once a minute, so a real outage can't loop. */
let staleReloadInstalled = false
function installStaleBuildReload() {
  if (staleReloadInstalled) return
  staleReloadInstalled = true
  const KEY = "shutap_stale_reload_at"
  /** Reloads onto the new build, at most once a minute. Returns false when
   *  it won't (too soon, or storage blocked so it can't remember). */
  const reload = (): boolean => {
    try {
      const last = Number(sessionStorage.getItem(KEY) || 0)
      if (Date.now() - last < 60_000) return false
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      return false // storage blocked: no way to remember the reload, so don't risk a loop
    }
    window.location.reload()
    return true
  }
  window.addEventListener("vite:preloadError", (e) => {
    // Only swallow the error when the page is actually reloading. Swallowing
    // it otherwise makes the import resolve to nothing, and the caller breaks
    // on an empty module (Oct 22: "Cannot destructure 'recordVisitOnce'").
    if (reload()) e.preventDefault()
  })
  const stale = (msg: string) =>
    /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg)
  window.addEventListener("unhandledrejection", (e) => {
    const r = (e as PromiseRejectionEvent).reason
    if (stale(r instanceof Error ? r.message : String(r ?? ""))) reload()
  })
}
