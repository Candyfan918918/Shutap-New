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

// Real punctuation, not hyphens: Helvetica's WinAnsi encoding has the
// curly quotes, both dashes, the ellipsis, the middle dot and a no-break
// space, so they print as themselves (Nov 8 2026: "plates—china" had
// printed as "plates-china"). Only ‖ and ↑ aren't in it: they become || and ^.
const WIN: Record<string, string> = { '‘': '\\221', '’': '\\222', '“': '\\223', '”': '\\224', '–': '\\226', '—': '\\227', '…': '\\205', '·': '\\267', '\u00a0': '\\240', '•': '\\225' }
function ascii(s: string): string {
  return s.replace(/‖/g, '||').replace(/↑/g, '^').replace(/[^\x20-\x7e‘’“”–—…·•\u00a0]/g, '')
}
/** A no-break space: the delivery marks stay on the line with the last word. */
const NB = '\u00a0'
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[‘’“”–—…·•\u00a0]/g, (c) => WIN[c] ?? '')

/** Lines that fit: Helvetica runs about half the type size a character,
 *  bold a little wider. Breaks only at ordinary spaces, never at a no-break
 *  space, so "(wait) ^ glasses up" never ends up alone on a line. */
function wrap(text: string, size: number, width: number, bold = false): string[] {
  const max = Math.max(10, Math.floor(width / (size * (bold ? 0.55 : 0.5))))
  const out: string[] = []
  let line = ''
  for (const word of text.split(/[ \t\n]+/).filter(Boolean)) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= max) line += ' ' + word
    else { out.push(line); line = word }
    while (line.length > max) {
      const cut = line.lastIndexOf(NB, max)
      const at = cut > 0 ? cut : max
      out.push(line.slice(0, at)); line = line.slice(cut > 0 ? at + 1 : at)
    }
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
    for (const line of wrap(ascii(s), size, o.width ?? W - 2 * M, o.bold)) {
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

/** In a page's ops: draw the free toast's watermark here, not under everything. */
const MARK_HERE = '%%MARK%%'

function markOps(): string[] {
  const ops = ['q 0.95 0.84 0.88 rg']
  for (let i = 0; i < 16; i++) ops.push(`BT /F2 34 Tf 0.927 0.375 -0.375 0.927 -60 ${-320 + i * 75} Tm (SHUTAP.COM \\267 SHUTAP.COM \\267 SHUTAP.COM \\267 SHUTAP.COM) Tj ET`)
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
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${M} ${(M - 8).toFixed(1)} Td (${esc(ascii(`${title} · ${docName}${marked ? ' · shutap.com' : ''}`))}) Tj ET Q`,
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${(W - M - 40).toFixed(1)} ${(M - 8).toFixed(1)} Td (${i + 1} of ${d.pages.length}) Tj ET Q`,
    ]
    const inline = ops.indexOf(MARK_HERE)
    const body = inline >= 0 ? [...ops.slice(0, inline), ...(marked ? markOps() : []), ...ops.slice(inline + 1)] : [...(marked ? markOps() : []), ...ops]
    const stream = ['0 g', ...body, ...(footer ? foot : [])].join('\n')
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
  d.text(`shutap toasts · ${OCCASION[t.occasion].label}`, 10, { bold: true, color: '0.76 0.13 0.42 rg', gapAfter: 10 })
  d.text(title, 26, { bold: true, color: '0.56 0.11 0.30 rg', gapAfter: 4 })
  d.text(`${t.label ?? 'the speech'} · ${TONE_LABEL[t.tone]} · ${clock(secs)} at a relaxed 140 words a minute (target ${clock(t.length)})`, 10, { color: '0.40 0.37 0.39 rg', gapAfter: 4 })
  d.text('|| pause  ·  (wait) let them laugh  ·  ^ glasses up: raise your glass', 9.5, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
  d.rule()
  const times = lineTimes(t.lines)
  let section = ''
  t.lines.forEach((l, i) => {
    const sec = fromPlaceholders(l.section, t.names)
    const marks = `${l.pause ? `${NB}||` : ''}${l.laugh ? `${NB}(wait)` : ''}${l.glass ? `${NB}^${NB}glasses${NB}up` : ''}`
    const said = fromPlaceholders(l.text, t.names) + marks
    const note = l.note ? fromPlaceholders(l.note, t.names) : ''
    // keep a line, its note and its section label on one page (Nov 8 2026: a note had split onto the next page)
    const tall = wrap(ascii(said), 15, TEXT_W).length * 15 * 1.35 + (note ? wrap(ascii(note), 10, TEXT_W).length * 10 * 1.35 + 1 : 0) + 9
    const head = sec && sec !== section ? 8.5 * 1.35 + 2 : 0
    d.need(tall + head)
    if (head) {
      d.text(sec.toUpperCase(), 8.5, { bold: true, color: '0.56 0.54 0.55 rg', x: M + GUTTER, gapAfter: 2 })
      section = sec
    }
    d.at(clock(times[i]!), 10, M, '0.76 0.13 0.42 rg', true)
    d.text(said, 15, { x: M + GUTTER, width: TEXT_W, gapAfter: note ? 1 : 9 })
    if (note) d.text(note, 10, { color: '0.61 0.21 0.35 rg', x: M + GUTTER, width: TEXT_W, gapAfter: 9 })
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

export type CueCardsIn = { occasion: Occasion; cards: { title: string; keys: string[]; land: string }[]; names: Partial<Names>; marked: boolean; /** the one true thing, so its card says "say it word for word" */ trueThing?: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9{}]+/g, ' ').trim()

/** Cue cards (Nov 8 2026, the design on the /toasts pages): four index cards
 *  a page, cut on the dashes. Cream card, faint blue rules, "n · TITLE" in
 *  wine, the cue words, then the line to land in bold. The card that holds
 *  the one true thing says "say it word for word". The free toast's
 *  watermark runs over the cards and under the words. */
export function cueCardsPdf(t: CueCardsIn): Blob {
  const title = toastTitle(t.occasion, t.names)
  const what = `${OCCASION[t.occasion].label} toast`
  const pages: string[][] = []
  const cw = W / 2
  const ch = H / 2
  const inset = 18
  const pad = 18
  const cardW = cw - 2 * inset
  const cardH = ch - 2 * inset
  const width = cardW - 2 * pad
  const truth = t.trueThing ? norm(t.trueThing) : ''
  const fills: string[][] = []
  const words: string[][] = []
  t.cards.forEach((c, i) => {
    if (i % 4 === 0) {
      fills.push([`q 0.73 0.66 0.69 RG 0.6 w [4 3] 0 d ${cw} 18 m ${cw} ${H - 18} l S 18 ${ch} m ${W - 18} ${ch} l S Q`])
      words.push([])
    }
    const f = fills[fills.length - 1]!
    const ops = words[words.length - 1]!
    const col = i % 2
    const row = Math.floor((i % 4) / 2)
    const cx = col * cw + inset
    const cy = H - row * ch - inset - cardH // bottom of the card
    // the card: cream, faint blue rules, a thin tan edge
    f.push(`q 1 0.992 0.965 rg ${cx} ${cy} ${cardW} ${cardH} re f Q`)
    const rules: string[] = []
    for (let ry = cy + cardH - 20; ry > cy + 6; ry -= 20) rules.push(`${cx + 1} ${ry.toFixed(1)} m ${cx + cardW - 1} ${ry.toFixed(1)} l`)
    f.push(`q 0.86 0.89 0.96 RG 0.6 w ${rules.join(' ')} S Q`)
    f.push(`q 0.85 0.81 0.72 RG 0.8 w ${cx} ${cy} ${cardW} ${cardH} re S Q`)
    const x = cx + pad
    let y = cy + cardH - pad
    const put = (s: string, size: number, font: 'F1' | 'F2', color: string, lead = size * 1.3, gap = 0) => {
      for (const line of wrap(ascii(s), size, width, font === 'F2')) {
        ops.push(`BT ${color} /${font} ${size} Tf ${x.toFixed(1)} ${(y - size * 0.92).toFixed(1)} Td (${esc(line)}) Tj ET`)
        y -= lead
      }
      y -= gap
    }
    put(`${i + 1} · ${fromPlaceholders(c.title, t.names).toUpperCase()}`, 11, 'F2', '0.56 0.11 0.30 rg', 20)
    for (const k of c.keys) put(`· ${fromPlaceholders(k, t.names)}`, 13, 'F1', '0.23 0.20 0.21 rg', 20)
    y -= 8
    ops.push(`q 0.94 0.87 0.90 RG 1.5 w ${x} ${y.toFixed(1)} m ${x + width} ${y.toFixed(1)} l S Q`)
    y -= 10
    const isTrue = !!truth && (norm(c.land) === truth || norm(c.land).includes(truth))
    put(isTrue ? 'SAY IT WORD FOR WORD' : 'LAND IT', 8.5, 'F2', '0.61 0.21 0.35 rg', 12, 2)
    put(fromPlaceholders(c.land, t.names), 15, 'F2', '0.10 0.08 0.09 rg', 19.5)
    ops.push(`BT 0.54 0.51 0.53 rg /F1 8 Tf ${x.toFixed(1)} ${(cy + 12).toFixed(1)} Td (${esc(ascii(`${what} · card ${i + 1} of ${t.cards.length}${t.marked ? ' · shutap.com' : ''}`))}) Tj ET`)
  })
  const pages2 = fills.map((f, i) => [...f, MARK_HERE, ...words[i]!])
  if (!pages2.length) pages2.push([])
  // no page footer: each card carries its own, and a page footer would sit inside the bottom cards
  return renderPages(pages2, title, t.marked, 'cue cards', false)
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
