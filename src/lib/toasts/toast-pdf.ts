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
  const objs: string[] = []
  const pageIds: number[] = []
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  d.pages.forEach((ops, i) => {
    const pageId = 5 + i * 2
    pageIds.push(pageId)
    const foot = [
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${M} ${(M - 8).toFixed(1)} Td (${esc(ascii(`${title} - ${docName}${marked ? ' - shutap.com' : ''}`))}) Tj ET Q`,
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${(W - M - 40).toFixed(1)} ${(M - 8).toFixed(1)} Td (${i + 1} of ${d.pages.length}) Tj ET Q`,
    ]
    const stream = [...(marked ? markOps() : []), '0 g', ...ops, ...foot].join('\n')
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`
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
