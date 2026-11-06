// Shutap Toasts (Nov 6 2026): names live on this device only, by toast id.
// Shutap never receives them; a new device asks once.
import type { Names } from './shared'

const NAMES_KEY = 'shutap_toast_names'

export function saveNames(id: string, names: Names): void {
  try { const all = JSON.parse(localStorage.getItem(NAMES_KEY) || '{}'); all[id] = names; localStorage.setItem(NAMES_KEY, JSON.stringify(all)) } catch { /* noop */ }
}

export function readNames(id: string): Names | null {
  try { return (JSON.parse(localStorage.getItem(NAMES_KEY) || '{}')[id] as Names) ?? null } catch { return null }
}
