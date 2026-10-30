/* The call to action on guide and funniest pages: a banner that sends the
 * reader to the homepage writer, with the story box focused.
 *
 * Oct 22 2026: this used to be a text box that carried the reader's story
 * over to the homepage, but the hand-off did not reliably arrive and the box
 * looked like it did nothing. A plain link always works. */
import { Link } from '@tanstack/react-router'
import { presetSearch, type BitControls } from '@/lib/bits/shared'

/** "storyteller · 60s · for live" — what a preset button will set. */
export function presetLabel(preset: Partial<BitControls>): string {
  const bits: string[] = []
  if (preset.voice) bits.push(preset.voice)
  if (preset.length) bits.push(preset.length === '2m' ? '2 min' : preset.length)
  if (preset.heat) bits.push(`wild ${preset.heat}`)
  if (preset.audience && preset.audience !== 'social') bits.push(`for ${preset.audience}`)
  return bits.join(' · ')
}

export function TryItBox({
  page,
  heading = 'Turn your own story into a bit',
  position = 'bottom',
  preset,
  anchor = false,
}: {
  page: string
  heading?: string
  /** open the writer with these controls set; the story box stays empty */
  preset?: Partial<BitControls>
  /** where on the page the banner sits; sent with the click event */
  position?: 'top' | 'bottom'
  /** the writer is on this page: scroll up to it instead of leaving */
  anchor?: boolean
}) {
  const track = () => {
    void import('@/lib/tracking')
      .then((m) => m.trackEvent('seo_cta_clicked', { page, position, kind: anchor ? 'anchor' : preset ? 'preset' : 'banner', ...(preset ?? {}) }))
      .catch(() => {})
  }

  return (
    <section
      aria-label="Write a bit"
      style={{
        margin: position === 'top' ? '0 0 44px' : '8px 0 36px',
        padding: '20px 22px',
        borderRadius: 18,
        background: '#ffffff',
        border: '1px solid rgba(11,8,15,.10)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <div style={{ display: 'grid', gap: 4, minWidth: 0, flex: '1 1 220px' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#17131a', lineHeight: 1.3 }}>{heading}</h2>
        <p style={{ margin: 0, fontSize: 15, color: '#443c42', lineHeight: 1.45 }}>
          Write what happened. Get the video, the caption, the bit. Free.
          {preset && presetLabel(preset) ? ` Opens set to ${presetLabel(preset)}; change anything before you write.` : ''}
        </p>
      </div>
      {anchor ? (
        <a
          href="#bit-write"
          onClick={(e) => {
            e.preventDefault()
            track()
            document.getElementById('bit-write')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            window.setTimeout(() => (document.getElementById('bit-story') as HTMLTextAreaElement | null)?.focus(), 500)
          }}
          style={{
            flex: '0 0 auto',
            background: '#b8456b',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 17,
            padding: '12px 22px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          Say it funnier ↑
        </a>
      ) : (
      <Link
        to="/"
        search={(preset ? presetSearch(preset) : undefined) as never}
        hash="joke"
        onClick={track}
        style={{
          flex: '0 0 auto',
          background: '#b8456b',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 17,
          padding: '12px 22px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        Say it funnier →
      </Link>
      )}
    </section>
  )
}
