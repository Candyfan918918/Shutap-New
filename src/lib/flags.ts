// Feature flags (Nov 5 2026). Each slice merged dark behind one of these.
// Nov 6 2026: all three are live, so every flag is ON unless the server
// sets SHUTAP_FLAG_<NAME>=0 (a kill switch; never a VITE_ variable: flags
// are read on the server and handed to the page).
//   realtors — Shutap for Realtors (paste a listing, get the kit)
//   ondemand — AI on demand: editable lines, "funnier" per line, locks
//   newnav   — the restructured site: products menu, /bits, /for/*, one pricing page
export const FLAGS = ['realtors', 'ondemand', 'newnav'] as const
export type Flag = (typeof FLAGS)[number]
export type Flags = Record<Flag, boolean>

/** What the page assumes before the server answers: everything on. */
export const NO_FLAGS: Flags = { realtors: true, ondemand: true, newnav: true }

/** Server only: the flags as the environment sets them (on unless =0). */
export function readFlags(env: Record<string, string | undefined> = process.env): Flags {
  const out = { ...NO_FLAGS }
  for (const f of FLAGS) out[f] = env[`SHUTAP_FLAG_${f.toUpperCase()}`] !== '0'
  return out
}
