/* Home (Nov 6 2026): the four product lines. One hero, the four product
 * tabs, one section per product with its real screen, what stays true for
 * everyone (trust), guides, and one closing call to action. The write box
 * lives on /bits now; old homepage links that expect it (a ?bit= link,
 * preset controls, #spill/#scan/#joke, a bit waiting for sign-in) are
 * forwarded there before this page shows.
 *
 * Every claim here was checked against the code on Nov 6 2026 (outputs,
 * limits, prices, what the crisis check covers). Change a product, change
 * this page. */
import { useEffect, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { trackEvent } from '@/lib/tracking'
import { Footer } from '@/components/feed/Footer'
import { ShotMotion } from './ShotMotion'
import '@/components/feed/feed.css'
import './product-home.css'

type IconName =
  | 'bits' | 'realtors' | 'toasts' | 'ent' | 'arrow' | 'spark' | 'lock' | 'shield' | 'heart' | 'card' | 'page'
  | 'lines' | 'video' | 'mic' | 'scene' | 'camera' | 'wave' | 'bolt' | 'sign' | 'post' | 'doc' | 'cards'
  | 'phone' | 'clock' | 'timer' | 'gift' | 'pitch' | 'launch' | 'people'

const PATHS: Record<IconName, ReactNode> = {
  bits: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 18.5h3" /><circle cx="12" cy="9" r="2.2" /><path d="M8.8 14c.8-1.2 1.9-1.8 3.2-1.8s2.4.6 3.2 1.8" /></>,
  realtors: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  toasts: <><path d="M5 3h5l-.6 5.2a1.9 1.9 0 0 1-3.8 0z" /><path d="M7.5 10v9M5 21h5" /><path d="M14 3h5l-.6 5.2a1.9 1.9 0 0 1-3.8 0z" /><path d="M16.5 10v9M14 21h5" /></>,
  ent: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 21h8" /><path d="M7.5 12.5v-2M11 12.5V8.5M14.5 12.5v-3M18 12.5V7" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  heart: <path d="M12 20s-7-4.4-9.2-8.7A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5.3C19 15.6 12 20 12 20z" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  page: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h7" /></>,
  lines: <path d="M5 6h14M5 10h14M5 14h10M5 18h7" />,
  video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  scene: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 7l3-4M9 7l3-4M15 7l3-4" /></>,
  camera: <><rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="12.5" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></>,
  wave: <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  sign: <path d="M6 21 9 4h6l3 17M8 13h8" />,
  post: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="M20 15l-5-5-9 10" /></>,
  doc: <><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  cards: <><rect x="3" y="7" width="13" height="10" rx="1.5" /><path d="M8 4h11.5A1.5 1.5 0 0 1 21 5.5V14" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10 7h4M10 10.5h4M10 14h2.5" /></>,
  clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4" /></>,
  timer: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  gift: <><rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12M12 9C10 5 6 5 7 8M12 9c2-4 6-4 5-1" /></>,
  pitch: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  launch: <><path d="M5 15c-1 2-1 4-1 5 1 0 3 0 5-1M14 4c3 0 6 3 6 6l-7 7-6-6z" /><circle cx="15" cy="9" r="1.5" /></>,
  people: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 2 6 5.5" /></>,
}

function Icon({ name, size = 22, color = '#8e1c4c' }: { name: IconName; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

type ProductKey = 'bits' | 'realtors' | 'toasts' | 'enterprise'

type ProductLine = {
  key: ProductKey
  icon: IconName
  name: string
  full: string
  aud: string
  tab: string
  one: string
  h2: [string, string]
  does: string
  steps: string[]
  gets: [IconName, string][]
  price: string
  cta: string
  href: '/bits' | '/realtors' | '/toasts' | '/business'
  shot?: { src: string; url: string; w: number; h: number; alt: string }
  occasions?: { label: string; href: string }[]
}

const PRODUCTS: ProductLine[] = [
  {
    key: 'bits', icon: 'bits', name: 'Bits', full: 'Shutap Bits', aud: 'for creators and comedians', tab: 'creators & comedians',
    one: 'Your voice, your call. Funnier only where you ask.',
    h2: ['Your bit, ', 'funnier.'],
    does: 'A clearer way to build your bit, in your own voice. Shutap only touches a line when you tap “funnier”, and you decide what stays.',
    steps: ['Type your bit, line by line', 'Tap “funnier” on any line', 'Post it, or perform it'],
    gets: [['lines', 'The bit'], ['video', '5-second video'], ['mic', 'Stand-up prompter'], ['page', 'Sketch page'], ['scene', 'Skit']],
    price: 'Free: 1 bit a day, video watermarked · Basic $19.99/mo: 3 a day · Pro $49.99/mo: unlimited',
    cta: 'Write a bit', href: '/bits',
    shot: { src: '/home/bits.jpg', url: 'shutap.com/bits', w: 1200, h: 908, alt: 'The Shutap Bits writer: a hook, setup and tags typed line by line, each with funnier and lock' },
  },
  {
    key: 'realtors', icon: 'realtors', name: 'Realtors', full: 'Shutap for Realtors', aud: 'for agents and brokerages', tab: 'listing videos',
    one: 'Every listing, introduced in your style.',
    h2: ['Your listing, ', 'funnier.'],
    does: 'Introduce every listing your way, in one of four tones: professional, funny, luxury or young. Promoting a property gets easy, and fun enough that people want to watch.',
    steps: ['Paste the listing link', 'Pick your tone', 'Shoot it with the prompter'],
    gets: [['camera', 'Walkthrough'], ['wave', 'Voiceover'], ['bolt', 'Hooks'], ['sign', 'Open house'], ['post', 'Posts'], ['doc', 'MLS copy']],
    price: 'First kit free, marked · one kit $12.99 · Basic: 20 a month · Pro: unlimited',
    cta: 'Paste a listing', href: '/realtors',
    shot: { src: '/home/realtors.jpg', url: 'shutap.com/realtors', w: 1200, h: 708, alt: 'A Shutap for Realtors kit for 1384 Madera Ave, Menlo Park, open on the walkthrough' },
  },
  {
    key: 'toasts', icon: 'toasts', name: 'Toasts', full: 'Shutap Toasts', aud: 'for weddings and holidays', tab: 'weddings & holidays',
    one: 'Ready for life’s big moments.',
    h2: ['Your toast, ', 'funnier.'],
    does: 'Be ready for the moments that matter. Your stories become the toast, then you rehearse it, carry cue cards, read from the prompter and keep a keepsake.',
    steps: ['Pick the occasion', 'Type your stories', 'Edit, lock, give it'],
    gets: [['doc', 'Speech'], ['cards', 'Cue cards'], ['phone', 'Prompter'], ['clock', '60-sec cut'], ['timer', 'Rehearse'], ['gift', 'Keepsake']],
    price: 'First toast free, marked · one toast $12.99 · Basic: 1 a month · Pro: unlimited',
    cta: 'Write a toast', href: '/toasts',
    shot: { src: '/home/toasts.jpg', url: 'shutap.com/toasts', w: 1200, h: 1065, alt: 'The Shutap Toasts form: the occasion, who it is for, and the first story' },
    occasions: [
      { label: 'best man', href: '/toasts/best-man' },
      { label: 'maid of honor', href: '/toasts/maid-of-honor' },
      { label: 'Thanksgiving', href: '/toasts/thanksgiving' },
      { label: 'holiday party', href: '/toasts/office-holiday-party' },
      { label: 'New Year’s', href: '/toasts/new-years' },
    ],
  },
  {
    key: 'enterprise', icon: 'ent', name: 'Enterprise', full: 'Shutap Enterprise', aud: 'for teams', tab: 'decks & meetings',
    one: 'Talks people listen to and remember.',
    h2: ['Your presentation, ', 'funnier.'],
    does: 'People listen to the speaker who makes them laugh. Bring humor to your decks, pitches and meetings, and walk up with more confidence.',
    steps: ['Tell us the talk', 'We scope it and send pricing', 'Your speakers steer every line'],
    gets: [['ent', 'Presentations'], ['pitch', 'Roadshows and pitches'], ['launch', 'Demos and launches'], ['people', 'Meetings']],
    price: 'In development · pricing on request',
    cta: 'Request pricing', href: '/business',
  },
]

const TAB_STYLE = ['grad', 'soft', 'dots', 'deep'] as const
const SECTION_STYLE = ['light', 'dotted', 'deep', 'grad'] as const

const TRUST: [IconName, string, string][] = [
  ['lock', 'Never read by staff', 'What you write is yours. Nobody at Shutap reads it.'],
  ['shield', 'Never trains a model', 'Your words are never used to train anything.'],
  ['heart', 'Help before jokes', 'If what you type in Bits or Toasts points to a crisis, you get a helpline, not a joke.'],
  ['card', 'Payments by Stripe', 'Checkout and billing run on Stripe.'],
]

const GUIDES: [IconName, string, string, string][] = [
  ['toasts', 'toasts', 'How to write a funny best man speech', '/guides/funny-best-man-speech'],
  ['toasts', 'toasts', 'A funny Thanksgiving toast your family will actually listen to', '/guides/funny-thanksgiving-toast'],
  ['realtors', 'realtors', 'How to make funny listing videos that still sell the house', '/guides/how-to-make-funny-listing-videos'],
  ['toasts', 'toasts', 'How to write a funny wedding toast', '/guides/funny-wedding-toast'],
]

function tap(name: string, props: Record<string, unknown>) {
  void trackEvent(name, { surface: 'home', ...props })
}

/** Old homepage links that expected the write box go to /bits, untouched. */
function forwardToBits(): boolean {
  if (typeof window === 'undefined') return false
  const { search, hash } = window.location
  const p = new URLSearchParams(search)
  const boxParam = ['bit', 'audience', 'voice', 'length', 'heat', 'move'].some((k) => p.has(k))
  const boxHash = ['#spill', '#scan', '#joke', '#ask', '#write', '#battle'].includes(hash)
  let waiting = false
  try {
    waiting = ['shutap_bit_pending', 'shutap_pending_write', 'shutap_write_inflight', 'shutap_pending_lock'].some((k) => localStorage.getItem(k) !== null)
  } catch { /* storage blocked */ }
  if (!boxParam && !boxHash && !waiting) return false
  window.location.replace(`/bits${search}${boxHash ? '#bit-write' : hash}`)
  return true
}

export function ProductHome() {
  const { userId, ready } = useCurrentAlias()
  const signedIn = ready && !!userId

  useEffect(() => {
    if (window.location.hash === '#mirror') { window.location.replace('/mirror'); return }
    forwardToBits()
  }, [])

  const startLabel = signedIn ? 'Pick a product' : 'Get started free'
  const startHref = signedIn ? '#products' : '/welcome'

  return (
    <div className="ph">
      <main>
        <section className="ph-wrap ph-hero">
          <Link to="/toasts" className="ph-announce" onClick={() => tap('home_cta', { cta: 'announce', product: 'toasts' })}>
            <b>New</b>Shutap Toasts, for weddings and the holidays <Icon name="arrow" size={14} color="#b8456b" />
          </Link>
          <h1 className="ph-h1">Say it <em>funnier.</em></h1>
          <p className="ph-lede">The humor amplifier for creators, agents, speakers and teams. Your words, only sharper.</p>
          <a href={startHref} className="ph-btn primary" onClick={() => tap('home_cta', { cta: signedIn ? 'pick_product' : 'get_started', where: 'hero' })}>
            {startLabel}
          </a>
          {!signedIn && <span className="ph-micro">Free to start. Sign in with Google, Apple or email.</span>}
        </section>

        <section className="ph-wrap ph-products" id="products" aria-labelledby="ph-products-h">
          <div className="ph-sec-h">
            <span className="ph-eyebrow"><Icon name="spark" size={14} color="#b8456b" />Four products</span>
            <h2 className="ph-h2" id="ph-products-h">One idea: <em>say it funnier.</em></h2>
          </div>
          <div className="ph-tabs">
            {PRODUCTS.map((p, i) => {
              const st = TAB_STYLE[i]
              const light = st === 'grad' || st === 'deep'
              return (
                <Link key={p.key} to={p.href} className={`ph-tab ${st}`} onClick={() => tap('home_product_tab', { product: p.key })}>
                  <span className="ic"><Icon name={p.icon} size={24} color={light ? '#ffffff' : '#b8456b'} /></span>
                  <span className="aud">{p.tab}</span>
                  <b>{p.name}</b>
                  <span className="one">{p.one}</span>
                  <span className="go">Open {p.name} <Icon name="arrow" size={15} color={light ? '#ffffff' : '#8e1c4c'} /></span>
                </Link>
              )
            })}
          </div>
        </section>

        {PRODUCTS.map((p, i) => {
          const st = SECTION_STYLE[i]
          const deep = st === 'deep'
          return (
            <section key={p.key} className={`ph-wrap ph-chapter-wrap${i === 0 ? ' first' : ''}`} aria-labelledby={`ph-${p.key}`}>
              <article className={`ph-chapter ${st}${i % 2 ? ' flip' : ''}`} id={p.key}>
                <div className="in">
                  <div className="txt">
                    <span className="kick"><span className="ic"><Icon name={p.icon} size={18} color={deep ? '#ffffff' : '#b8456b'} /></span>{p.full} · {p.aud}</span>
                    <h2 className="ph-h3" id={`ph-${p.key}`}>{p.h2[0]}<em>{p.h2[1]}</em></h2>
                    <p className="does">{p.does}</p>
                    {p.occasions && (
                      <div className="occ">
                        {p.occasions.map((o) => (
                          <a key={o.href} href={o.href} onClick={() => tap('home_occasion', { product: 'toasts', occasion: o.href })}>{o.label}</a>
                        ))}
                      </div>
                    )}
                    <ol className="steps">
                      {p.steps.map((s, n) => <li key={s}><b>{n + 1}</b>{s}</li>)}
                    </ol>
                    {p.shot && (
                      <div className="gets">
                        {p.gets.map(([ic, t]) => <span key={t} className="get"><Icon name={ic} size={16} color={deep ? '#f6a5c2' : '#b8456b'} />{t}</span>)}
                      </div>
                    )}
                    <p className="price">{p.price}</p>
                    <Link to={p.href} className={`ph-btn sm ${deep ? 'white' : 'primary'}`} onClick={() => tap('home_cta', { cta: p.key, product: p.key, where: 'section' })}>
                      {p.cta} <Icon name="arrow" size={15} color={deep ? '#8e1c4c' : '#ffffff'} />
                    </Link>
                  </div>
                  {p.shot ? (
                    <figure className="shot">
                      <div className="win">
                        <div className="bar" aria-hidden="true"><i /><i /><i /><span><Icon name="lock" size={10} color="#8f7f86" />{p.shot.url}</span></div>
                        <div className="crop">
                          <ShotMotion product={p.key as 'bits' | 'realtors' | 'toasts'}>
                            <img src={p.shot.src} width={p.shot.w} height={p.shot.h} alt={p.shot.alt} loading="lazy" decoding="async" />
                          </ShotMotion>
                        </div>
                      </div>
                      <figcaption>Live today on {p.shot.url}</figcaption>
                    </figure>
                  ) : (
                    <div className="uses">
                      {p.gets.map(([ic, t]) => (
                        <div key={t} className="use"><span className="ic"><Icon name={ic} size={24} /></span><b>{t}</b></div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </section>
          )
        })}

        <section className="ph-wrap ph-block" aria-labelledby="ph-trust-h">
          <div className="ph-trust">
            <div className="ph-sec-h">
              <span className="ph-eyebrow"><Icon name="shield" size={14} color="#b8456b" />Trust</span>
              <h2 className="ph-h2" id="ph-trust-h">Your words <em>stay yours.</em></h2>
              <p className="ph-lede sm">Built for people who say things in public, with rules we don’t bend.</p>
            </div>
            <div className="ph-tgrid">
              {TRUST.map(([ic, t, d]) => (
                <div key={t} className="ph-tcell"><span className="ic"><Icon name={ic} size={20} /></span><b>{t}</b><p>{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="ph-wrap ph-block" aria-labelledby="ph-guides-h">
          <div className="ph-guides-h">
            <div>
              <span className="ph-eyebrow"><Icon name="page" size={14} color="#b8456b" />Guides</span>
              <h2 className="ph-h2 sm" id="ph-guides-h">Learn the <em>moves.</em></h2>
            </div>
            <Link to="/guides" className="ph-textlink">All guides →</Link>
          </div>
          <div className="ph-guides">
            {GUIDES.map(([ic, k, t, h]) => (
              <a key={h} className="ph-guide" href={h} onClick={() => tap('home_guide', { guide: h })}>
                <span className="k"><Icon name={ic} size={15} color="#b8456b" />{k}</span>
                <b>{t}</b>
                <span className="r">Read the guide →</span>
              </a>
            ))}
          </div>
        </section>

        <section className="ph-wrap ph-block last">
          <div className="ph-final">
            <div className="in">
              <h2 className="ph-h2">Say it <em>funnier.</em></h2>
              <p>Bring the story, the listing, the toast or the deck. Start free.</p>
              <a href={startHref} className="ph-btn white" onClick={() => tap('home_cta', { cta: signedIn ? 'pick_product' : 'get_started', where: 'closing' })}>
                {startLabel}
              </a>
            </div>
          </div>
        </section>
      </main>
      <div className="fd" style={{ minHeight: 0 }}>
        <Footer />
      </div>
    </div>
  )
}
