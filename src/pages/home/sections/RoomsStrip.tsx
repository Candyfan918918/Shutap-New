/* Section: RoomsStrip — byte-for-byte port of /tmp/bundle/template.html
 * (lines 838-861). Consumes SHUTAP_SEED.rooms in the same shape and order
 * the previous renderRoomsMarkup helper did (first 8, doubled → 16 tiles).
 * All data-* hooks preserved so mountImmersive's drag/auto-drift keep
 * working unchanged. */
import { SHUTAP_SEED } from '@/data/seed'
import type { NewestRoom } from '@/lib/newest-rooms.functions'

function ageLabel(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function RoomsStrip({ newestRooms = [] }: { newestRooms?: NewestRoom[] } = {}) {
  const live = newestRooms.slice(0, 8).map((r) => ({
    id: r.id, emoji: r.emoji, alias: r.alias, hours: ageLabel(r.created_at),
    title: r.title, sitting: r.sitting, relates: 0, href: `/stream#room-${r.id}`,
  }))
  const padCount = Math.max(0, 8 - live.length)
  const seed = (SHUTAP_SEED.rooms || []).slice(0, padCount).map((r, i) => ({
    id: `seed-${i}`,
    emoji: r.emoji, alias: r.alias, hours: r.hours, title: r.title,
    sitting: (r as unknown as { sitting?: number }).sitting ?? 0,
    relates: (r as unknown as { relates?: number }).relates ?? 0,
    href: '/stream',
  }))
  const combined = [...live, ...seed]
  const list = combined.concat(combined)
  return (
    <section data-screen-label="Rooms strip" style={{ position: 'relative', background: '#ffffff', padding: 'clamp(80px,11vh,130px) 0 clamp(56px,8vh,90px)', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 30px 26px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <h2 data-rv="swipe-l" data-words="" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(28px,3.6vw,54px)', letterSpacing: '-.04em', margin: 0, color: '#0b080f' }}>
          rooms open <em style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, color: '#17131a' }}>right now.</em>
        </h2>
        <a href="/stream" data-link="/stream" data-hover="" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '16px' }}>all rooms →</a>
      </div>
      <div data-strip="" style={{ display: 'flex', gap: '18px', overflowX: 'auto', padding: '6px 30px 22px', cursor: 'grab', userSelect: 'none' }}>
        {list.map((r, i) => (
          <a
            key={`${r.id}-${i}`}
            href={r.href}
            data-link={r.href}
            data-hover=""
            data-reactive=""
            draggable={false}
            style={{ flex: 'none', width: '340px', background: '#fff', border: '1px solid rgba(11,8,15,.08)', borderRadius: '22px', padding: '24px', color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'transform .25s,box-shadow .25s', boxShadow: '0 6px 18px -12px rgba(20,16,22,.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: '16px', flex: 'none' }}>{r.emoji}</span>
              <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '13.5px', color: '#6f666c' }}>{r.alias}</span>
              <span style={{ marginLeft: 'auto', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '12px', color: '#6f666c' }}>{r.hours}</span>
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '17px', lineHeight: 1.3, letterSpacing: '-.01em', color: '#0b080f', flex: 1 }}>{r.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '13px', color: '#443c42' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
                {r.sitting} sitting in
              </span>
              <span>🫂 {r.relates} relate</span>
              <span style={{ marginLeft: 'auto', color: '#17131a', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontStyle: 'normal', fontSize: '12.5px' }}>enter →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
