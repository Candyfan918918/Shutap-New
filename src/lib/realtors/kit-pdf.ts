// The kit as one PDF (Nov 6 2026), built in the browser with no library.
// US Letter. A cover with the listing's facts and what's inside, then one
// output per page (the walkthrough may run on). Helvetica and
// Helvetica-Bold, two of the fourteen fonts every reader carries, so
// nothing is embedded. Free: SHUTAP.COM tiled under the text and the mark
// on every output.
import { TONE_LABEL, listingFacts, type Kit, type Listing, type ListingControls, type Output } from './listing'
import { MARK, OUTPUT_LABEL, OUTPUT_ORDER, kitTitle } from './kit-text'

const W = 612
const H = 792
const M = 54 // 0.75in margins
const TOP = H - M
const BOTTOM = M + 30
const TEXT_W = W - 2 * M

/** Helvetica in WinAnsi: straighten the punctuation a phone types, drop the rest. */
function ascii(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/·/g, '-').replace(/[^\x20-\x7e]/g, '')
}
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** Helvetica advance widths are not uniform; 0.5em is a fair average for
 *  mixed text, so lines wrap a little early rather than ever running off. */
function wrap(text: string, size: number, width = TEXT_W): string[] {
  const perChar = size * 0.5
  const max = Math.max(10, Math.floor(width / perChar))
  const out: string[] = []
  for (const para of text.split(/\n/)) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word
      else if (line.length + 1 + word.length <= max) line += ' ' + word
      else { out.push(line); line = word }
      while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max) }
    }
    out.push(line)
  }
  return out
}

function markOps(): string[] {
  const ops = ['q 0.95 0.84 0.88 rg']
  for (let i = 0; i < 16; i++) {
    const y = -320 + i * 75
    ops.push(`BT /F2 34 Tf 0.927 0.375 -0.375 0.927 -60 ${y} Tm (SHUTAP.COM . SHUTAP.COM . SHUTAP.COM . SHUTAP.COM) Tj ET`)
  }
  ops.push('Q')
  return ops
}

type Page = string[]

class Doc {
  pages: Page[] = [[]]
  y = TOP
  constructor(private marked: boolean) {}
  get page(): Page { return this.pages[this.pages.length - 1]! }
  newPage() { this.pages.push([]); this.y = TOP }
  need(h: number) { if (this.y - h < BOTTOM) this.newPage() }
  text(s: string, size: number, opts: { bold?: boolean; color?: string; x?: number; gapAfter?: number; width?: number } = {}) {
    const lines = wrap(ascii(s), size, opts.width)
    const lead = size * 1.35
    for (const line of lines) {
      this.need(lead)
      this.page.push(`BT ${opts.color ?? '0 g'} /${opts.bold ? 'F2' : 'F1'} ${size} Tf ${(opts.x ?? M).toFixed(1)} ${this.y.toFixed(1)} Td (${esc(line)}) Tj ET`)
      this.y -= lead
    }
    this.y -= opts.gapAfter ?? 0
  }
  rule() { this.need(10); this.page.push(`q 0.90 0.78 0.83 RG 0.6 w ${M} ${this.y.toFixed(1)} m ${W - M} ${this.y.toFixed(1)} l S Q`); this.y -= 10 }
  gap(h: number) { this.y -= h }
  label(s: string) { this.text(s.toUpperCase(), 8.5, { bold: true, color: '0.56 0.54 0.55 rg', gapAfter: 1 }) }
  heading(s: string) { this.text(s, 20, { bold: true, color: '0.56 0.11 0.30 rg', gapAfter: 4 }) }
  mark() { if (this.marked) this.text(MARK.trim(), 9, { color: '0.76 0.13 0.42 rg' }) }
  footer(i: number, n: number, title: string) {
    return [
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${M} ${(M - 6).toFixed(1)} Td (${esc(ascii(title))} - the kit - shutap.com/realtors) Tj ET Q`,
      `q 0.56 0.54 0.55 rg BT /F1 8.5 Tf ${(W - M - 40).toFixed(1)} ${(M - 6).toFixed(1)} Td (${i + 1} of ${n}) Tj ET Q`,
    ]
  }
}

function coverPage(d: Doc, l: Listing, c: ListingControls, k: Kit) {
  d.text('shutap - for realtors', 10, { bold: true, color: '0.76 0.13 0.42 rg', gapAfter: 14 })
  d.text(kitTitle(l), 26, { bold: true, color: '0.56 0.11 0.30 rg', gapAfter: 2 })
  d.text('the kit', 16, { color: '0.30 0.27 0.29 rg', gapAfter: 10 })
  d.text(`tone: ${TONE_LABEL[c.tone]} (one tone per kit) - roast the house ${c.roast_house ? 'on' : 'off'} - roast the neighborhood ${c.roast_neighborhood ? 'on' : 'off'}${c.must_say.length ? ' - must say: ' + c.must_say.join(', ') : ''} - made ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 9.5, { color: '0.56 0.54 0.55 rg', gapAfter: 12 })
  d.label('the facts, as the listing states them')
  d.text(listingFacts(l).join('  -  '), 11, { gapAfter: 6 })
  if (l.note) { d.label('the one thing about it'); d.text(l.note, 11, { gapAfter: 6 }) }
  d.gap(8)
  d.label('in this kit')
  OUTPUT_ORDER.forEach((o, i) => d.text(`${i + 1} - ${OUTPUT_LABEL[o]}`, 12, { gapAfter: 1 }))
  d.gap(10)
  d.text(`${k.walkthrough.shots.length} shots - ${k.hooks.length} hooks - ${k.posts.length} posts - ${k.open_house.length} open-house pieces. Every section starts on its own page. Text is selectable; copy what you need.`, 10, { color: '0.30 0.27 0.29 rg' })
  d.gap(6)
  d.text('Fair-housing check on every line. Nothing added beyond what the listing says and what you typed.', 10, { color: '0.30 0.27 0.29 rg' })
}

function outputPage(d: Doc, k: Kit, o: Output, n: number) {
  d.newPage()
  d.label(`${n} of 6`)
  d.heading(OUTPUT_LABEL[o])
  d.rule()
  switch (o) {
    case 'walkthrough':
      d.text(`${k.walkthrough.shots.length} shots - one take on a phone - say the line, then move`, 10, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
      k.walkthrough.shots.forEach((s, i) => {
        d.need(50)
        d.text(`${i + 1}  ${s.where}  -  ${s.seconds}s`, 10, { bold: true, color: '0.76 0.13 0.42 rg', gapAfter: 1 })
        if (s.action) d.text(s.action, 10.5, { color: '0.30 0.27 0.29 rg', gapAfter: 1 })
        d.text(`"${s.line}"`, 12.5, { gapAfter: 8 })
      })
      if (k.walkthrough.cut15) d.text(`15s cut: ${k.walkthrough.cut15}`, 10, { color: '0.30 0.27 0.29 rg', gapAfter: 2 })
      if (k.walkthrough.cut60) d.text(`60s cut: ${k.walkthrough.cut60}`, 10, { color: '0.30 0.27 0.29 rg' })
      break
    case 'voiceover':
      d.text('read it, or paste it into text-to-voice', 10, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
      k.voiceover.forEach((v) => { d.need(36); if (v.label) d.text(`[${v.label}]`, 9, { bold: true, color: '0.56 0.54 0.55 rg', gapAfter: 1 }); d.text(v.text, 12.5, { gapAfter: 8 }) })
      break
    case 'hooks':
      d.text('first two seconds, on screen and spoken', 10, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
      k.hooks.forEach((h) => { d.need(36); d.text(`"${h.line}"`, 14, { gapAfter: 1 }); if (h.move) d.text(h.move, 9.5, { color: '0.56 0.54 0.55 rg', gapAfter: 10 }) })
      break
    case 'open_house':
    case 'posts':
      (o === 'posts' ? k.posts : k.open_house).forEach((x) => { d.need(40); d.text(x.label, 9, { bold: true, color: '0.56 0.54 0.55 rg', gapAfter: 1 }); d.text(x.text, 12, { gapAfter: 10 }) })
      break
    case 'straight':
      d.text('the MLS-ready description, no jokes', 10, { color: '0.56 0.54 0.55 rg', gapAfter: 8 })
      d.text(k.straight, 12)
      break
  }
  d.gap(6)
  d.mark()
}

export function kitPdf(kit: Kit, listing: Listing, controls: ListingControls, opts: { marked?: boolean } = {}): Blob {
  const d = new Doc(!!opts.marked)
  coverPage(d, listing, controls, kit)
  OUTPUT_ORDER.forEach((o, i) => outputPage(d, kit, o, i + 1))
  const title = kitTitle(listing)
  const objs: string[] = []
  const pageIds: number[] = []
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  d.pages.forEach((ops, i) => {
    const pageId = 5 + i * 2
    const contentId = pageId + 1
    pageIds.push(pageId)
    const stream = [...(opts.marked ? markOps() : []), '0 g', ...ops, ...d.footer(i, d.pages.length, title)].join('\n')
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    objs[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objs.length; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n` }
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info << /Title (${esc(ascii(title + ' - the kit'))}) /Creator (Shutap) >> >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
