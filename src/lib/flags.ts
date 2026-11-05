// Feature flags (Nov 5 2026). Each new slice merges dark behind one of these
// and is turned on by setting SHUTAP_FLAG_<NAME>=1 on the server (never a
// VITE_ variable: flags are read on the server and handed to the page).
//   realtors — Shutap for Realtors (paste a listing, get the kit)
//   ondemand — AI on demand: editable lines, "funnier" per line, locks
//   newnav   — the restructured site: products menu, /bits, /for/*, one pricing page
export const FLAGS = ['realtors', 'ondemand', 'newnav'] as const
export type Flag = (typeof FLAGS)[number]
export type Flags = Record<Flag, boolean>

export const NO_FLAGS: Flags = { realtors: false, ondemand: false, newnav: false }

/** Server only: the flags as the environment sets them. */
export function readFlags(env: Record<string, string | undefined> = process.env): Flags {
  const out = { ...NO_FLAGS }
  for (const f of FLAGS) out[f] = env[`SHUTAP_FLAG_${f.toUpperCase()}`] === '1'
  return out
}
