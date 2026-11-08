/* The Shutap Toasts box on a funniest page about a toast or speech (Nov 6
 * 2026): sends the reader to the toast form, already set to the occasion.
 * Copy follows the toasts landing pages: the stories stay the reader's own,
 * Shutap builds the toast around them. */
import { Link } from '@tanstack/react-router'
import type { PageProduct } from '@/lib/seo/product-for'

type Toasts = Extract<PageProduct, { kind: 'toasts' }>

export function ToastsEmbed({ page, target }: { page: string; target: Toasts }) {
  const track = () => {
    void import('@/lib/tracking')
      .then((m) => m.trackEvent('seo_cta_clicked', { page, product: 'toasts', kind: 'toast_form', href: target.href, occasion: target.search?.occasion ?? null }))
      .catch(() => {})
  }
  return (
    <section
      id="bit-write"
      aria-label="Shutap Toasts"
      style={{
        padding: '22px 24px',
        borderRadius: 18,
        background: '#ffffff',
        border: '1px solid rgba(11,8,15,.10)',
        boxShadow: '0 12px 30px -24px rgba(20,16,22,.3)',
        display: 'grid',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#b8456b' }}>
        shutap toasts · first toast free
      </p>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#17131a', lineHeight: 1.3 }}>
        Giving a {target.occasionLabel}? Make it funnier.
      </h2>
      <p style={{ margin: 0, fontSize: 15, color: '#443c42', lineHeight: 1.5 }}>
        Type the stories about them, in your words. Shutap builds the toast around them, with pause marks, a running clock, cue cards and a phone prompter. It never makes up a story.
      </p>
      <div>
        <Link
          to={target.href as never}
          search={target.search as never}
          onClick={track}
          style={{
            display: 'inline-block',
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
          Write my toast →
        </Link>
      </div>
    </section>
  )
}
