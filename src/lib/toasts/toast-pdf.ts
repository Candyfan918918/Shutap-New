// Shutap Toasts (Nov 6 2026): the speech as a PDF, built in the browser with
// no library (same approach as the realtor kit PDF). US Letter, large type
// so it reads from a podium, the clock in the margin, pause / laugh / glass
// marks. Helvetica + Helvetica-Bold (no fonts embedded). The free toast
// carries SHUTAP.COM tiled under the text and "— shutap.com" on every page.
import { OCCASION, TONE_LABEL, fromPlaceholders, toastSeconds, type Names, type Occasion, type Tone, type ToastLine } from './shared'
import { MARK, clock, lineTimes, toastTitle } from './toast-text'

const W = 612
const H = 792
const M = 60
const TOP = H - M
const BOTTOM = M + 30
const GUTTER = 52 // the clock column
const TEXT_W = W - 2 * M - GUTTER

function ascii(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/·/g, '-').replace(/‖/g, '||').replace(/↑/g, '^').replace(/[^\x20-\x7e]/g, '')
}
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

function wrap(text: string, size: number, width: number): string[] {
  const max = Math.max(10, Math.floor(width / (size * 0.5)))
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= max) line += ' ' + word
    else { out.push(line); line = word }
    while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max) }
  }
  if (line) out.push(line)
  return out
}

class Doc {
  pages: string[][] = [[]]
  y = TOP
  get page(): string[] { return this.pages[this.pages.length - 1]! }
  need(h: number) { if (this.y - h < BOTTOM) { this.pages.push([]); this.y = TOP } }
  text(s: string, size: number, o: { bold?: boolean; color?: string; x?: number; width?: number; gapAfter?: number } = {}) {
    const lead = size * 1.35
    for (const line of wrap(ascii(s), size, o.width ?? W - 2 * M)) {
      this.need(lead)
      this.page.push(`BT ${o.color ?? '0 g'} /${o.bold ? 'F2' : 'F1'} ${size} Tf ${(o.x ?? M).toFixed(1)} ${(this.y - size * 0.92).toFixed(1)} Td (${esc(line)}) Tj ET`)
      this.y -= lead
    }
    this.y -= o.gapAfter ?? 0
  }
  /** text at a fixed spot on the current line, without moving down */
  at(s: string, size: number, x: number, color: string, bold = false) {
    this.page.push(`BT ${color} /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${(this.y - size * 0.92).toFixed(1)} Td (${esc(ascii(s))}) Tj ET`)
  }
  rule() { this.need(12); this.page.push(`q 0.90 0.78 0.83 RG 0.6 w ${M} ${this.y.toFixed(1)} m ${W - M} ${this.y.toFixed(1)} l S Q`); this.y -= 12 }
}

function markOps(): string[] {
  const ops = ['q 0.95 0.84 0.88 rg']
  for (let i = 0; i < 16; i++) ops.push(`BT /F2 34 Tf 0.927 0.375 -0.375 0.927 -60 ${-320 + i * 75} Tm (SHUTAP.COM . SHUTAP.COM . SHUTAP.COM . SHUTAP.COM) Tj ET`)
  ops.push('Q')
  return ops
}

function render(d: Doc, title: string, marked: boolean, docName: string): Blob {
  return renderPages(d.pages, title, marked, docName)
}

/** Any set of pages (lists of PDF drawing ops) as one PDF. F1 Helvetica,
 *  F2 Helvetica-Bold, F3 Helvetica-Oblique. */
function renderPages(pages: string[][], title: string, marked: boolean, docName: string, footer = true): Blob {
  const objs: string[] = []
  const pageIds: number[] = []
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>'
  const d = { pages }
  d.pages.forEach((ops, i) => {
    const pageId = 6 + i * 2
    pageIds.push(pageId)
    const foot = [
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${M} ${(M - 8).toFixed(1)} Td (${esc(ascii(`${title} - ${docName}${marked ? ' - shutap.com' : ''}`))}) Tj ET Q`,
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${(W - M - 40).toFixed(1)} ${(M - 8).toFixed(1)} Td (${i + 1} of ${d.pages.length}) Tj ET Q`,
    ]
    const stream = [...(marked ? markOps() : []), '0 g', ...ops, ...(footer ? foot : [])].join('\n')
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageId + 1} 0 R >>`
    objs[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objs.length; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n` }
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info << /Title (${esc(ascii(`${title} - ${docName}`))}) /Creator (Shutap) >> >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export type SpeechPdfIn = { occasion: Occasion; tone: Tone; length: number; lines: ToastLine[]; names: Partial<Names>; marked: boolean; label?: string }

/** The speech, ready to read from: clock in the margin, marks, big type. */
export function speechPdf(t: SpeechPdfIn): Blob {
  const d = new Doc()
  const title = toastTitle(t.occasion, t.names)
  const secs = toastSeconds(t.lines)
  d.text(`shutap toasts - ${OCCASION[t.occasion].label}`, 10, { bold: true, color: '0.76 0.13 0.42 rg', gapAfter: 10 })
  d.text(title, 26, { bold: true, color: '0.56 0.11 0.30 rg', gapAfter: 4 })
  d.text(`${t.label ?? 'the speech'} - ${TONE_LABEL[t.tone]} - ${clock(secs)} at a relaxed 140 words a minute (target ${clock(t.length)})`, 10, { color: '0.40 0.37 0.39 rg', gapAfter: 4 })
  d.text('|| = pause    (wait) = let them laugh    ^ = glasses up', 9.5, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
  d.rule()
  const times = lineTimes(t.lines)
  let section = ''
  t.lines.forEach((l, i) => {
    const sec = fromPlaceholders(l.section, t.names)
    if (sec && sec !== section) {
      d.need(46)
      d.text(sec.toUpperCase(), 8.5, { bold: true, color: '0.56 0.54 0.55 rg', x: M + GUTTER, gapAfter: 2 })
      section = sec
    }
    d.need(24)
    d.at(clock(times[i]!), 10, M, '0.76 0.13 0.42 rg', true)
    const marks = `${l.pause ? ' ||' : ''}${l.laugh ? ' (wait)' : ''}${l.glass ? ' ^ glasses up' : ''}`
    d.text(fromPlaceholders(l.text, t.names) + marks, 15, { x: M + GUTTER, width: TEXT_W, gapAfter: l.note ? 1 : 9 })
    if (l.note) d.text(fromPlaceholders(l.note, t.names), 10, { color: '0.61 0.21 0.35 rg', x: M + GUTTER, width: TEXT_W, gapAfter: 9 })
  })
  if (t.marked) { d.text(MARK, 11, { color: '0.76 0.13 0.42 rg', x: M + GUTTER }) }
  return render(d, title, t.marked, t.label ?? 'the speech')
}

/** Save a PDF the person can open, print or send. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function pdfName(occasion: Occasion, names: Partial<Names>, what: string): string {
  return `${toastTitle(occasion, names).replace(/^For /, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-${what}.pdf`
}

/* ───────────────────────── cue cards: 4 a page, cut on the dashes ───────────────────────── */

export type CueCardsIn = { occasion: Occasion; cards: { title: string; keys: string[]; land: string }[]; names: Partial<Names>; marked: boolean }

/** One card per section group: the number, the title, what comes next,
 *  then the line to land, bold; the last card's line written out in full. */
export function cueCardsPdf(t: CueCardsIn): Blob {
  const title = toastTitle(t.occasion, t.names)
  const pages: string[][] = []
  const cw = W / 2
  const ch = H / 2
  const pad = 30
  t.cards.forEach((c, i) => {
    if (i % 4 === 0) {
      // the cut lines: dashed, through the middle both ways
      pages.push([`q 0.73 0.66 0.69 RG 0.6 w [4 3] 0 d ${cw} 18 m ${cw} ${H - 18} l S 18 ${ch} m ${W - 18} ${ch} l S Q`])
    }
    const ops = pages[pages.length - 1]!
    const col = i % 2
    const row = Math.floor((i % 4) / 2)
    const x = col * cw + pad
    let y = H - row * ch - pad
    const width = cw - 2 * pad
    const put = (s: string, size: number, font: 'F1' | 'F2' | 'F3', color: string, gap = 0) => {
      for (const line of wrap(ascii(s), size, width)) {
        ops.push(`BT ${color} /${font} ${size} Tf ${x.toFixed(1)} ${(y - size * 0.92).toFixed(1)} Td (${esc(line)}) Tj ET`)
        y -= size * 1.3
      }
      y -= gap
    }
    const last = i === t.cards.length - 1
    put(`${i + 1}`, 26, 'F2', '0.72 0.27 0.42 rg', 4)
    put(fromPlaceholders(c.title, t.names).toUpperCase(), 9.5, 'F2', '0.43 0.39 0.41 rg', 10)
    for (const k of c.keys) put(`- ${fromPlaceholders(k, t.names)}`, 13, 'F1', '0.23 0.20 0.21 rg', 3)
    y = Math.min(y - 8, H - row * ch - ch * 0.55)
    ops.push(`q 0.96 0.91 0.93 RG 1.5 w ${x} ${y.toFixed(1)} m ${x + width} ${y.toFixed(1)} l S Q`)
    y -= 12
    put(last ? 'SAY IT WORD FOR WORD' : 'LAND IT', 8.5, 'F2', '0.61 0.21 0.35 rg', 4)
    put(fromPlaceholders(c.land, t.names), 15, 'F2', '0.10 0.08 0.09 rg', 4)
    if (t.marked) put(MARK, 8.5, 'F1', '0.76 0.13 0.42 rg')
  })
  if (!pages.length) pages.push([])
  return renderPages(pages, title, t.marked, 'cue cards')
}

/* ───────────────────────── the keepsake: one page to give them ───────────────────────── */

export type KeepsakeIn = { occasion: Occasion; lines: ToastLine[]; names: Partial<Names>; marked: boolean }

const KEEPSAKE_LABEL: Partial<Record<Occasion, string>> = { best_man: "the best man's toast", maid_of_honor: "the maid of honor's toast", parent: 'a toast from the family', retirement: 'a retirement toast', birthday: 'a birthday toast' }

/** The speech as they'd want to keep it: prose, no stage marks, the true
 *  thing set apart, room for a handwritten note and a signature. */
export function keepsakePdf(t: KeepsakeIn): Blob {
  const d = new Doc()
  const title = toastTitle(t.occasion, t.names)
  const center = (s: string, size: number, font: 'F1' | 'F2' | 'F3', color: string, gap = 0) => {
    for (const line of wrap(ascii(s), size, W - 2 * M)) {
      d.need(size * 1.35)
      const x = (W - line.length * size * 0.5) / 2
      d.page.push(`BT ${color} /${font} ${size} Tf ${Math.max(M, x).toFixed(1)} ${(d.y - size * 0.92).toFixed(1)} Td (${esc(line)}) Tj ET`)
      d.y -= size * 1.35
    }
    d.y -= gap
  }
  d.y -= 20
  center((KEEPSAKE_LABEL[t.occasion] ?? 'a toast').toUpperCase(), 9, 'F2', '0.61 0.21 0.35 rg', 8)
  center(title, 30, 'F3', '0.56 0.11 0.30 rg', 6)
  center('date ____________________', 9, 'F1', '0.56 0.54 0.55 rg', 18)
  // paragraphs: a story and its tags read as one
  const base = (s: string) => s.split(' · ')[0]!.trim()
  const paras: { text: string; true_thing: boolean; sec?: string }[] = []
  for (const l of t.lines) {
    const text = fromPlaceholders(l.text, t.names).replace(/\s*‖\s*/g, ' ').trim()
    if (l.source === 'true_thing') { paras.push({ text, true_thing: true }); continue }
    const prev = paras[paras.length - 1]
    const sec = base(l.section)
    if (prev && !prev.true_thing && prev.sec === sec) prev.text += ` ${text}`
    else paras.push({ text, true_thing: false, sec })
  }
  for (const p of paras) {
    if (p.true_thing) { d.y -= 4; center(p.text, 15, 'F3', '0.56 0.11 0.30 rg', 10) }
    else d.text(p.text, 11.5, { color: '0.10 0.08 0.09 rg', gapAfter: 7 })
  }
  d.need(150)
  d.y -= 10
  d.rule()
  d.text('A FEW WORDS FOR YOU', 8.5, { bold: true, color: '0.61 0.21 0.35 rg', gapAfter: 6 })
  for (let i = 0; i < 3; i++) { d.y -= 22; d.page.push(`q 0.72 0.66 0.68 RG 0.6 w ${M} ${d.y.toFixed(1)} m ${W - M} ${d.y.toFixed(1)} l S Q`) }
  d.y -= 24
  d.text('Best wishes,', 14, { color: '0.23 0.20 0.21 rg', gapAfter: 26 })
  d.page.push(`q 0.72 0.66 0.68 RG 0.6 w ${M} ${d.y.toFixed(1)} m ${M + 220} ${d.y.toFixed(1)} l S Q`)
  d.y -= 8
  d.text(`signed - ${fromPlaceholders('{me}', t.names)}${t.occasion === 'best_man' ? ', best man' : t.occasion === 'maid_of_honor' ? ', maid of honor' : ''}`, 8.5, { bold: true, color: '0.61 0.21 0.35 rg' })
  if (t.marked) { d.y -= 6; d.text(MARK, 9, { color: '0.76 0.13 0.42 rg' }) }
  return renderPages(d.pages, title, t.marked, 'keepsake', false)
}
