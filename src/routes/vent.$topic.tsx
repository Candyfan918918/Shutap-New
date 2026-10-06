/* Programmatic SEO topic pages at /vent/:topic (legacy slug, kept for
 * indexed URLs). Copy is about turning the topic into jokes. Reads example
 * rooms from the existing seed source. Emits FAQPage + QAPage JSON-LD.
 * No writes, no schema changes. */
import { ogImageMeta } from "@/lib/seo/meta";
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { SHUTAP_SEED } from '@/data/seed'
import type { Room } from '@/data/types'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { findVentTopic, VENT_TOPICS, type VentTopic } from '@/lib/seo/venting-topics'
import { HomeFooter } from '@/pages/home/HomePage'
import { Words, Reveal } from '@/components/motion'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

const SORA = "'Sora',system-ui,sans-serif"
const NEWS = "'Newsreader',Georgia,serif"

function isSeedRoom(r: Room): boolean {
  // Rooms in this path come from SHUTAP_SEED — treat as seed unless the row
  // explicitly says is_seed=false. Real rooms will set is_seed=false.
  return r.is_seed !== false
}
function roomsForTopic(slug: string): Room[] {
  return (SHUTAP_SEED.rooms || []).filter((r) => (r.category || '').toLowerCase() === slug).slice(0, 8)
}
// Map legacy topic slugs to the /rooms topic filter where one exists.
function roomsHref(slug: string): string {
  if (slug === 'family') return '/rooms?topic=family'
  if (slug === 'work') return '/rooms?topic=work'
  return '/rooms'
}
function countsByTopic(): Record<string, number> {
  const map: Record<string, number> = {}
  for (const r of SHUTAP_SEED.rooms || []) {
    const k = (r.category || '').toLowerCase()
    if (!k) continue
    map[k] = (map[k] || 0) + 1
  }
  return map
}

export const Route = createFileRoute('/vent/$topic')({
  loader: ({ params }) => {
    const topic = findVentTopic(params.topic)
    if (!topic) throw notFound()
    const rooms = roomsForTopic(params.topic)
    const sittingNow = rooms.reduce((n, r) => n + (r.sitting ?? 0), 0)
    return { topic, rooms, sittingNow, counts: countsByTopic() }
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: 'Jokes — Shutap' }, { name: 'robots', content: 'noindex' }] }
    }
    const t = loaderData.topic
    const url = `${SITE_URL}/vent/${t.slug}`
    const title = `Jokes about ${t.label} — AI joke generator | Shutap`
    const desc = t.intro
    const faqItems = FAQ_ITEMS(t)
    // QAPage JSON-LD is only emitted when we have REAL (non-seed) rooms for
    // the topic. Seed-sourced rooms must never appear in structured Q&A data.
    const realRooms = loaderData.rooms.filter((r) => !isSeedRoom(r))
    const qaMain = realRooms[0]
    return {
      meta: [
        { title },
        { name: 'description', content: desc },
        { property: 'og:title', content: title },
        { property: 'og:description', content: desc },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: url },
        ...ogImageMeta(),
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        },
        ...(qaMain
          ? [{
              type: 'application/ld+json',
              children: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'QAPage',
                mainEntity: {
                  '@type': 'Question',
                  name: qaMain.title,
                  text: (qaMain.body || '').slice(0, 500),
                  answerCount: realRooms.length,
                  suggestedAnswer: realRooms.slice(1, 5).map((r) => ({
                    '@type': 'Answer',
                    text: (r.body || '').slice(0, 500),
                    url: `${SITE_URL}/stream#room-${encodeURIComponent(r.id)}`,
                  })),
                },
              }),
            }]
          : []),
        breadcrumbScript([{ name: `Jokes about ${t.label}`, path: `/vent/${t.slug}` }]),
      ],
    }
  },
  component: VentTopicPage,
  notFoundComponent: TopicNotFound,
})

function TopicNotFound() {
  return (
    <div style={{ minHeight: '60vh', background: '#ffffff', padding: 60, textAlign: 'center', fontFamily: NEWS, fontStyle: 'italic', color: '#383136' }}>
      We don't have a page for that topic.{' '}
      <Link to="/" style={{ color: '#17131a' }}>Write jokes about it →</Link>
    </div>
  )
}

function FAQ_ITEMS(t: VentTopic): Array<{ q: string; a: string }> {
  return [
    { q: 'How does it work?', a: `Paste what happened with ${t.label}. Shutap writes three jokes: the take, the clapback and the roast. Download them for TikTok, Reels or the stage, or post the best one to a room.` },
    t.topicQuestion,
    { q: 'Is it pseudonymous?', a: 'Yes. You post under a pseudonym, never your real name. Names and places are removed before anything is saved.' },
    { q: 'Is this a crisis service?', a: 'No. Shutap writes jokes. It is not therapy, advice or a crisis service. In an emergency, call or text 988 (US) or visit findahelpline.com.' },
    { q: 'Does it cost anything?', a: 'No. Guests see one joke. Sign in free to see all three.' },
  ]
}

function VentTopicPage() {
  const { topic, rooms } = Route.useLoaderData()
  const faq = FAQ_ITEMS(topic)

  return (
    <div style={{ background: '#ffffff', color: '#0b080f', minHeight: '100vh', fontFamily: "'Sora',system-ui,sans-serif" }}>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '46px 22px 60px' }}>
        <Breadcrumbs trail={[{ name: `Jokes about ${topic.label}`, path: `/vent/${topic.slug}` }]} />

        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: '#2b2630', marginBottom: 10 }}>
          joke generator · {topic.label}
        </div>
        <h1 style={{ fontFamily: SORA, fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', letterSpacing: '-.03em', lineHeight: 1.05, margin: '0 0 18px' }}>
          {topic.h1}
        </h1>
        <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 18.5, color: '#383136', lineHeight: 1.6, maxWidth: '52ch', margin: '0 0 22px' }}>
          {topic.intro}
        </p>
        {rooms.some(isSeedRoom) && (
          <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 14, color: '#6f666c', margin: '0 0 22px', maxWidth: '52ch' }}>
            The situations below are examples of the kind of thing people paste in.
          </p>
        )}

        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 12.5, color: '#17131a', marginBottom: 26, display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '.05em' }}>
          <Link to="/" style={{ color: '#17131a' }}>Write jokes about it →</Link>
        </div>

        {/* Topic chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {VENT_TOPICS.map((t) => {
            const active = t.slug === topic.slug
            return (
              <Link
                key={t.slug}
                to="/vent/$topic"
                params={{ topic: t.slug }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: active ? '#0b080f' : '#fff',
                  color: active ? '#fff' : '#383136',
                  border: '.5px solid ' + (active ? '#0b080f' : 'rgba(11,8,15,.12)'),
                  fontFamily: SORA,
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </div>

        {/* Example situations */}
        {rooms.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {rooms.map((r: Room) => (
              <Reveal key={r.id} fx="pop">
                <VentRoomCard room={r} seed={isSeedRoom(r)} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: NEWS, fontStyle: 'italic', color: '#6f666c' }}>
            No examples here yet. <Link to="/" style={{ color: '#17131a' }}>Paste yours →</Link>
          </p>
        )}

        {/* FAQ */}
        <div style={{ marginTop: 56 }}>
          <Words as="div" style={{ fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: '#2b2630', marginBottom: 12 }}>
            Common questions
          </Words>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f, i) => (
              <details key={i} style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 12, padding: '14px 16px' }}>
                <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none', fontFamily: SORA, fontWeight: 700, fontSize: 15, color: '#0b080f' }}>
                  <span>{f.q}</span>
                  <span aria-hidden style={{ color: '#17131a', fontSize: 20 }}>+</span>
                </summary>
                <div style={{ marginTop: 10, fontFamily: NEWS, fontStyle: 'italic', fontSize: 15, color: '#383136', lineHeight: 1.55 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 56, background: '#100c14', color: '#fdfbf9', borderRadius: 24, padding: '46px 30px', textAlign: 'center' }}>
          <Words as="h2" style={{ fontFamily: SORA, fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.03em', margin: '0 0 12px' }}>Say it funnier.</Words>
          <p style={{ fontFamily: NEWS, fontStyle: 'italic', color: '#bdb8bb', fontSize: 16, margin: '0 0 22px' }}>
            Paste what happened with {topic.label}. Get three jokes. Post the best one.
          </p>
          <Link to="/" style={{ display: 'inline-block', background: 'linear-gradient(155deg,#d6d0d4,#2b2630 55%,#17131a)', color: '#fff', textDecoration: 'none', padding: '14px 26px', borderRadius: 999, fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>
            Turn yours into a joke →
          </Link>
          <div style={{ marginTop: 16 }}>
            <a href={roomsHref(topic.slug)} style={{ color: '#bdb8bb', fontFamily: NEWS, fontStyle: 'italic', fontSize: 15 }}>
              or see what people posted in rooms →
            </a>
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  )
}

function VentRoomCard({ room, seed = false }: { room: Room; seed?: boolean }) {
  const snippet = (room.body || '').replace(/\s+/g, ' ').trim().slice(0, 180) + ((room.body || '').length > 180 ? '…' : '')
  return (
    <article style={{ background: '#fff', borderRadius: 18, padding: 20, border: '.5px solid rgba(11,8,15,.06)', boxShadow: '0 10px 28px -22px rgba(20,16,22,.28)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {seed && (
        <span style={{ alignSelf: 'flex-start', fontFamily: SORA, fontWeight: 700, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#6f666c', background: '#fdfbf9', padding: '3px 8px', borderRadius: 999 }}>
          example
        </span>
      )}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#fdfbf9,#2b2630)', fontSize: 18 }}>{room.emoji}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 13, color: '#383136' }}>{room.alias}</span>
          <span style={{ fontFamily: 'Sora', fontSize: 11, color: '#6f666c' }}>{room.hours}</span>
        </div>
      </header>
      <h3 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', lineHeight: 1.35, margin: 0, color: '#0b080f' }}>
        {room.title}
      </h3>
      <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 14.5, color: '#383136', lineHeight: 1.55, margin: 0 }}>{snippet}</p>
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: SORA, fontWeight: 600, fontSize: 12, color: '#443c42' }}>
        <span />
        <Link to="/" style={{ color: '#17131a', fontFamily: NEWS, fontStyle: 'italic', textDecoration: 'none' }}>
          Write jokes about yours →
        </Link>
      </footer>
    </article>
  )
}
