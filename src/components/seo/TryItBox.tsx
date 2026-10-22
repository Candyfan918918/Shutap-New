/* The call to action on guide and funniest pages: a banner that sends the
 * reader to the homepage writer, with the story box focused.
 *
 * Oct 22 2026: this used to be a text box that carried the reader's story
 * over to the homepage, but the hand-off did not reliably arrive and the box
 * looked like it did nothing. A plain link always works. */
import { Link } from '@tanstack/react-router'

export function TryItBox({
  page,
  heading = 'Turn your own story into a bit',
  position = 'bottom',
}: {
  page: string
  heading?: string
  /** where on the page the banner sits; sent with the click event */
  position?: 'top' | 'bottom'
}) {
  const track = () => {
    void import('@/lib/tracking')
      .then((m) => m.trackEvent('seo_cta_clicked', { page, position, kind: 'banner' }))
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
          Write what happened. Get a bit: hook, setup, tags and button.
        </p>
      </div>
      <Link
        to="/"
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
        Create your free joke now →
      </Link>
    </section>
  )
}
