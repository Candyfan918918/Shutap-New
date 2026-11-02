// Reload onto the current build when an open tab still points at files a
// deploy removed. Shared by the router and the root error boundary.
const STALE_KEY = "shutap_stale_reload_at"
/** Reloads onto the new build, at most once a minute. Returns false when
 *  it won't (too soon, or storage blocked so it can't remember). */
export function reloadOntoNewBuild(): boolean {
  if (typeof window === "undefined") return false
  try {
    const last = Number(sessionStorage.getItem(STALE_KEY) || 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(STALE_KEY, String(Date.now()))
  } catch {
    return false // storage blocked: no way to remember the reload, so don't risk a loop
  }
  window.location.reload()
  return true
}

/** The router's own symptom of a page file a deploy removed: it reads a
 *  route's component off nothing (Oct 26–27 "notFoundComponent", Nov 1
 *  "component"). Same cure as a failed import: reload onto the new build. */
export function isStaleRouteError(msg: string): boolean {
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Cannot read properties of undefined \(reading '(notFoundComponent|component|errorComponent|pendingComponent|options)'\)/i.test(msg)
}

