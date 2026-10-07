// A screenplay page as a PDF, built in the browser with no library.
//
// US Letter, Courier 12 (one of the fourteen fonts every PDF reader carries,
// so nothing is embedded), standard margins and indents:
//   scene heading / action   1.5in from the left, 60 characters wide
//   character                3.7in
//   parenthetical            3.1in, 25 characters
//   dialogue                 2.5in, 35 characters
//   transition               right-aligned to 7.5in
import type { ScreenplayElement } from '@/lib/bits/shared'

const PT = 72
const CHAR_W = 7.2 // Courier 12pt advance
const LINE = 12
const TOP = 792 - PT
const BOTTOM = PT

type Spec = { x: number; width: number; upper?: boolean; right?: boolean }
const SPECS: Record<ScreenplayElement['type'], Spec> = {
  scene_heading: { x: 1.5 * PT, width: 60, upper: true },
  action: { x: 1.5 * PT, width: 60 },
  character: { x: 3.7 * PT, width: 38, upper: true },
  parenthetical: { x: 3.1 * PT, width: 25 },
  dialogue: { x: 2.5 * PT, width: 35 },
  transition: { x: 7.5 * PT, width: 60, upper: true, right: true },
}

/** Courier in WinAnsi: straighten the punctuation a phone types, drop the rest. */
function ascii(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '--')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '')
}

function wrap(text: string, width: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word
      else if (line.length + 1 + word.length <= width) line += ' ' + word
      else {
        out.push(line)
        line = word
      }
      while (line.length > width) {
        out.push(line.slice(0, width))
        line = line.slice(width)
      }
    }
    if (line) out.push(line)
  }
  return out
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** The heavy mark for guest and free files: SHUTAP.COM tiled at -22 degrees
 *  in pale rose under the text, and a rose line across the foot. */
function markOps(): string[] {
  const ops = ['q 0.95 0.84 0.88 rg']
  for (let i = 0; i < 16; i++) {
    const y = -320 + i * 75
    ops.push(`BT /F1 34 Tf 0.927 0.375 -0.375 0.927 ${-60} ${y} Tm (SHUTAP.COM . SHUTAP.COM . SHUTAP.COM . SHUTAP.COM) Tj ET`)
  }
  ops.push('Q')
  ops.push(`q 0.72 0.27 0.42 rg 0 0 612 34 re f Q`)
  ops.push(`q 1 g BT /F1 11 Tf ${(306 - 41 * CHAR_W * 11 / 12 / 2).toFixed(1)} 13 Td (MADE WITH SHUTAP.COM - WRITE YOURS FREE) Tj ET Q`)
  return ops
}

/** Blank line before an element, except inside a speech (character →
 *  parenthetical → dialogue). */
function gapBefore(prev: ScreenplayElement['type'] | null, cur: ScreenplayElement['type']): number {
  if (!prev) return 0
  if (prev === 'character' && (cur === 'dialogue' || cur === 'parenthetical')) return 0
  if (prev === 'parenthetical' && cur === 'dialogue') return 0
  return 1
}

export function screenplayPdf(elements: ScreenplayElement[], title: string, opts: { watermark?: boolean } = {}): Blob {
  const pages: string[][] = [[]]
  let y = TOP
  let prev: ScreenplayElement['type'] | null = null

  const put = (x: number, text: string) => {
    if (y < BOTTOM) {
      pages.push([])
      y = TOP
    }
    pages[pages.length - 1]!.push(`BT /F1 12 Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(text)}) Tj ET`)
    y -= LINE
  }

  for (const el of elements) {
    const spec = SPECS[el.type]
    let text = ascii(el.text)
    if (spec.upper) text = text.toUpperCase()
    if (el.type === 'parenthetical' && !text.startsWith('(')) text = `(${text.replace(/[()]/g, '')})`
    y -= gapBefore(prev, el.type) * LINE
    for (const line of wrap(text, spec.width)) {
      put(spec.right ? spec.x - line.length * CHAR_W : spec.x, line)
    }
    prev = el.type
  }

  // objects: 1 catalog, 2 pages, 3 font, then a page + its content per page
  const objs: string[] = []
  const pageIds: number[] = []
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'
  pages.forEach((ops, i) => {
    const pageId = 4 + i * 2
    const contentId = pageId + 1
    pageIds.push(pageId)
    // page number top right from page 2, as screenplays do
    const num = i > 0 ? [`BT /F1 12 Tf ${(7.5 * PT - 3 * CHAR_W).toFixed(1)} ${(792 - 0.5 * PT).toFixed(1)} Td (${i + 1}.) Tj ET`] : []
    const stream = [...(opts.watermark ? markOps() : []), '0 g', ...num, ...ops].join('\n')
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`
    objs[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = pdf.length
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info << /Title (${esc(ascii(title))}) /Creator (Shutap) >> >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export function pdfFilename(hook: string): string {
  const slug = ascii(hook).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  return `${slug || 'bit'}-screenplay.pdf`
}

/** The bit itself as a plain script page: hook, setup, tags, button. */
export function scriptPdf(v: { hook: string; setup: string; tags: string[]; button: string }, watermark: boolean): Blob {
  const els: ScreenplayElement[] = [
    { type: 'scene_heading', text: 'THE BIT' },
    { type: 'character', text: 'HOOK' },
    { type: 'dialogue', text: v.hook },
    { type: 'character', text: 'SETUP' },
    { type: 'dialogue', text: v.setup },
    ...v.tags.flatMap((t, i) => [
      { type: 'character' as const, text: `TAG ${i + 1}` },
      { type: 'dialogue' as const, text: t },
    ]),
    { type: 'character', text: 'BUTTON' },
    { type: 'dialogue', text: v.button },
  ]
  return screenplayPdf(els, v.hook, { watermark })
}
