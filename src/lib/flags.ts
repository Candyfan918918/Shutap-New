// Feature flags (Nov 5 2026). Each slice merged dark behind one of these.
// Nov 6 2026: realtors, ondemand and newnav are live, so those are ON
// unless the server sets SHUTAP_FLAG_<NAME>=0 (a kill switch; never a
// VITE_ variable: flags are read on the server and handed to the page).
// toasts is the one flag that starts OFF: it stays dark until the server
// sets SHUTAP_FLAG_TOASTS=1 (launch is turning it on).
//   realtors — Shutap for Realtors (paste a listing, get the kit)
//   ondemand — AI on demand: editable lines, "funnier" per line, locks
//   newnav   — the restructured site: products menu, /bits, /for/*, one pricing page
//   toasts   — Shutap Toasts (the form → the speech; admins see it while dark)
export const FLAGS = ['realtors', 'ondemand', 'newnav', 'toasts'] as const
export type Flag = (typeof FLAGS)[number]
export type Flags = Record<Flag, boolean>

/** Flags that are off until the server turns them on. */
const DEFAULT_OFF: readonly Flag[] = ['toasts']

/** What the page assumes before the server answers. */
export const NO_FLAGS: Flags = { realtors: true, ondemand: true, newnav: true, toasts: false }

/** Server only: the flags as the environment sets them. A live flag is on
 *  unless =0; a dark one is off unless =1 (or true). */
export function readFlags(env: Record<string, string | undefined> = process.env): Flags {
  const out = { ...NO_FLAGS }
  for (const f of FLAGS) {
    const v = env[`SHUTAP_FLAG_${f.toUpperCase()}`]
    out[f] = DEFAULT_OFF.includes(f) ? v === '1' || v === 'true' : v !== '0'
  }
  return out
}
