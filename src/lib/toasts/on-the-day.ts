// Shutap Toasts (Nov 6 2026): helpers for the day itself. The prompter link
// carries the names after the # (a browser never sends that part anywhere);
// rehearse runs stay on this device.
import type { Names } from './shared'

export type RehearseRun = { at: string; seconds: number; target: number; long: string | null }
const RUNS_KEY = 'shutap_toast_runs'

export function readRuns(id: string): RehearseRun[] {
  try { return (JSON.parse(localStorage.getItem(RUNS_KEY) || '{}')[id] as RehearseRun[]) ?? [] } catch { return [] }
}
export function saveRun(id: string, run: RehearseRun): void {
  try { const all = JSON.parse(localStorage.getItem(RUNS_KEY) || '{}'); all[id] = [run, ...(all[id] ?? [])].slice(0, 20); localStorage.setItem(RUNS_KEY, JSON.stringify(all)) } catch { /* noop */ }
}

/** The prompter for another phone: the names ride after the #. */
export function prompterLink(origin: string, id: string, names: Names, opts: { short?: boolean; rehearse?: boolean } = {}): string {
  const h = new URLSearchParams({ f: names.friend, m: names.me, ...(names.partner ? { p: names.partner } : {}) })
  const q = opts.short ? '?short=1' : opts.rehearse ? '?rehearse=1' : ''
  return `${origin}/toasts/prompter/${id}${q}#${h.toString()}`
}

/** Names from the link's # (f, p, m). */
export function namesFromHash(hash: string): Names | null {
  if (!hash) return null
  const q = new URLSearchParams(hash.replace(/^#/, ''))
  const friend = q.get('f')?.trim()
  const me = q.get('m')?.trim()
  return friend && me ? { friend, partner: q.get('p')?.trim() || '', me } : null
}
