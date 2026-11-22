// Shutap for small business: everything under the first screen (Nov 21
// 2026). How it works, what you get, how a business gets more views on its
// videos (the platforms' own words, sourced), about, questions. Plain
// server-rendered text so search engines and assistants can read it. The
// words live in src/lib/shops/page-copy.ts.
import { Link } from '@tanstack/react-router'
import { trackEvent } from '@/lib/tracking'
import { PLANS, usd } from '@/lib/pricing'
import { SHOP_VIDEO_CAPS } from '@/lib/entitlements'
import { SB_ABOUT, SB_FAQ, SB_GET, SB_SOURCES, SB_STEPS, SB_VIEWS, SB_VIEWS_INTRO } from '@/lib/shops/page-copy'

const ev = (name: string, props: Record<string, unknown> = {}) => { void trackEvent(name, { product: 'smallbusiness', ...props }) }

export function SmallBusinessInfo({ onStart }: { onStart: () => void }) {
  const start = (where: string) => { ev('sb_info_cta', { where }); onStart() }
  return (
    <div className="sbi">
      <section id="how" aria-labelledby="sbi-how">
        <p className="sbi-eye">HOW TO USE IT</p>
        <h2 id="sbi-how">From “something happened” to a video, in three steps</h2>
        <ol className="sbi-steps">
          {SB_STEPS.map((s, i) => <li key={s.title}><b aria-hidden>{i + 1}</b><div><h3>{s.title}</h3><p>{s.body}</p></div></li>)}
        </ol>
        <button type="button" className="sbi-btn" onClick={() => start('how')}>Make my first video</button>
      </section>

      <section aria-labelledby="sbi-get">
        <p className="sbi-eye">WHAT YOU GET</p>
        <h2 id="sbi-get">One finished video, ready to post</h2>
        <ul className="sbi-list">{SB_GET.map((g) => <li key={g}>{g}</li>)}</ul>
      </section>

      <section id="views" aria-labelledby="sbi-views">
        <p className="sbi-eye">MORE VIEWS</p>
        <h2 id="sbi-views">How a small business gets more views on its videos</h2>
        <p className="sbi-lead">{SB_VIEWS_INTRO}</p>
        <div className="sbi-cards">
          {SB_VIEWS.map((v) => <article key={v.title}><h3>{v.title}</h3><p>{v.says}</p><p className="so">{v.so}</p></article>)}
        </div>
        <p className="sbi-src">Sources: {SB_SOURCES.map((s, i) => <span key={s.href}>{i > 0 && '; '}<a href={s.href} target="_blank" rel="noopener noreferrer">{s.name}</a> ({s.date})</span>)}.</p>
      </section>

      <section id="about" aria-labelledby="sbi-about">
        <p className="sbi-eye">ABOUT IT</p>
        <h2 id="sbi-about">The creative team your small business doesn’t have</h2>
        {SB_ABOUT.map((p) => <p key={p.slice(0, 24)} className="sbi-lead">{p}</p>)}
      </section>

      <section aria-labelledby="sbi-price">
        <p className="sbi-eye">PRICE</p>
        <h2 id="sbi-price">Start free. Stay if it works.</h2>
        <div className="sbi-plans">
          <div><h3>Free</h3><p className="amt">$0</p><p>Your first {SHOP_VIDEO_CAPS.free} videos</p></div>
          <div><h3>Basic</h3><p className="amt">{usd(PLANS.basic.amount)}<span> / month</span></p><p>{SHOP_VIDEO_CAPS.basic} new video every day, one business</p></div>
        </div>
        <p className="sbi-src">The same Basic plan covers every Shutap product. <Link to="/pricing" onClick={() => ev('sb_info_link', { to: 'pricing' })}>See pricing</Link>.</p>
      </section>

      <section id="faq" aria-labelledby="sbi-faq">
        <p className="sbi-eye">QUESTIONS</p>
        <h2 id="sbi-faq">Questions owners ask</h2>
        <div className="sbi-faq">
          {SB_FAQ.map((x) => (
            <details key={x.q} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) ev('sb_info_faq', { q: x.q.slice(0, 60) }) }}>
              <summary>{x.q}<span aria-hidden>+</span></summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>
        <button type="button" className="sbi-btn" onClick={() => start('faq')}>Make my first video</button>
        <p className="sbi-src">Humor is attention. · 18+ · Your videos stay yours. · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
      </section>
    </div>
  )
}
