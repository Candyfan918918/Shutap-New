// JokeNet ⇄ spreadsheet text. Reads rows pasted from Excel (tab-separated)
// or a CSV file, and writes the CSV export. No dependency: Excel's clipboard
// is TSV and its "Save as CSV" is RFC 4180.

export type SheetRow = {
  id?: number
  situation: string
  joke: string
  rating?: number | null
  archetype?: string | null
  move?: string | null
  mechanism?: string | null
  tone?: string | null
  heat?: number | null
  target?: string | null
  slot?: string | null
  voice?: string | null
  source?: string
  license?: 'own' | 'CC-BY' | 'CC0' | 'unclear'
  notes?: string | null
  posted_on?: string | null
  sent?: boolean
}

const TEXT = ['situation', 'joke', 'archetype', 'move', 'mechanism', 'tone', 'target', 'slot', 'voice', 'source', 'notes', 'posted_on'] as const
const LICENSES = ['own', 'CC-BY', 'CC0', 'unclear'] as const
const ALIASES: Record<string, string> = { story: 'situation', line: 'joke', bit: 'joke', score: 'rating', stars: 'rating' }

/** Split delimited text into cells, quotes respected. */
export function splitCells(text: string, delim: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) out.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) out.push(row)
  return out
}

export function parseSheet(text: string): { rows: SheetRow[]; columns: string[]; dropped: number } {
  const clean = text.replace(/^﻿/, '')
  const first = clean.split(/\r?\n/, 1)[0] ?? ''
  const delim = first.includes('\t') ? '\t' : ','
  const cells = splitCells(clean, delim)
  if (!cells.length) return { rows: [], columns: [], dropped: 0 }
  const head = cells[0]!.map((h) => {
    const k = h.trim().toLowerCase().replace(/[^a-z_]+/g, '_').replace(/^_|_$/g, '')
    return ALIASES[k] ?? k
  })
  const hasHeader = head.includes('situation') && head.includes('joke')
  const cols = hasHeader ? head : ['situation', 'joke', 'rating']
  const body = hasHeader ? cells.slice(1) : cells
  const rows: SheetRow[] = []
  let dropped = 0
  for (const r of body) {
    const get = (k: string) => {
      const i = cols.indexOf(k)
      const v = i >= 0 ? (r[i] ?? '').trim() : ''
      return v && v.toLowerCase() !== 'none' ? v : ''
    }
    const situation = get('situation')
    const joke = get('joke')
    if (!situation || !joke) { dropped++; continue }
    const row: SheetRow = { situation, joke }
    for (const k of TEXT) {
      if (k === 'situation' || k === 'joke') continue
      const v = get(k)
      if (v) (row as Record<string, unknown>)[k] = v
    }
    const rating = Number.parseInt(get('rating'), 10)
    if (rating >= 1 && rating <= 5) row.rating = rating
    const heat = Number.parseInt(get('heat'), 10)
    if (heat >= 1 && heat <= 3) row.heat = heat
    const id = Number.parseInt(get('id'), 10)
    if (id > 0) row.id = id
    const lic = get('license')
    row.license = (LICENSES as readonly string[]).includes(lic) ? (lic as SheetRow['license']) : undefined
    if (!row.license) delete row.license
    const sent = get('sent').toLowerCase()
    if (sent === 'yes' || sent === 'true') row.sent = true
    if (sent === 'no' || sent === 'false') row.sent = false
    rows.push(row)
  }
  return { rows, columns: cols.filter((c) => c), dropped }
}

const EXPORT_COLS = ['id', 'situation', 'joke', 'rating', 'slot', 'archetype', 'target', 'tone', 'heat', 'move', 'mechanism', 'voice', 'source', 'license', 'sent', 'wins', 'losses', 'added_on', 'posted_on', 'notes', 'founder', 'archived_at'] as const

export function toCsv(rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [EXPORT_COLS.join(','), ...rows.map((r) => EXPORT_COLS.map((c) => esc(r[c])).join(','))].join('\r\n') + '\r\n'
}
