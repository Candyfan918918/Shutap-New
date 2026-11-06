// The kit as text (Nov 6 2026): what a copy, a voiceover .txt and the PDF
// put on the clipboard or the page. Safe in the browser. Free files carry
// the mark: every copied output ends with " — shutap.com".
import { OUTPUT_LABEL, OUTPUTS, type Kit, type Listing, type Output } from './listing'

export const MARK = ' — shutap.com'

/** One output as plain text, lines in reading order. */
export function outputText(kit: Kit, o: Output): string {
  switch (o) {
    case 'walkthrough':
      return [
        ...kit.walkthrough.shots.map((s, i) => `${i + 1}. ${s.where} · ${s.seconds}s\n${s.action}\n"${s.line}"`),
        kit.walkthrough.cut15 ? `15s cut: ${kit.walkthrough.cut15}` : '',
        kit.walkthrough.cut60 ? `60s cut: ${kit.walkthrough.cut60}` : '',
      ].filter(Boolean).join('\n\n')
    case 'voiceover':
      return kit.voiceover.map((v) => v.text).join('\n\n')
    case 'hooks':
      return kit.hooks.map((h) => `"${h.line}"${h.move ? ` (${h.move})` : ''}`).join('\n')
    case 'open_house':
      return kit.open_house.map((x) => `${x.label}\n${x.text}`).join('\n\n')
    case 'posts':
      return kit.posts.map((x) => `${x.label}\n${x.text}`).join('\n\n')
    case 'straight':
      return kit.straight
  }
}

/** The text that goes on the clipboard: marked on Free. */
export function copyText(kit: Kit, o: Output, marked: boolean): string {
  const t = outputText(kit, o)
  return marked ? t + MARK : t
}

/** The voiceover as a .txt for text-to-voice: one paragraph per segment. */
export function voiceoverTxt(kit: Kit, marked: boolean): string {
  return kit.voiceover.map((v) => v.text).join('\n\n') + (marked ? '\n\n' + MARK.trim() : '') + '\n'
}

export function kitTitle(l: Listing): string {
  return [l.address, l.city].filter(Boolean).join(' · ') || 'the listing'
}

export function fileStem(l: Listing): string {
  return (l.address ?? 'listing').replace(/[^A-Za-z0-9 ]+/g, '').trim().replace(/\s+/g, ' ').slice(0, 40) || 'listing'
}

export const OUTPUT_ORDER: Output[] = [...OUTPUTS]
export { OUTPUT_LABEL }
