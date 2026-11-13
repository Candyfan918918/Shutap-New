/* The top of /realtors (Nov 12 2026, design approved by Candy): the sample
 * kit (real product output, sample-kit.ts) as four outputs side by side at the
 * same size: the walkthrough to film, shoot mode running with a delivery cue
 * on each line, the social posts typed onto a 9:16 reel the agent films, and
 * the open-house kit. Under them: what else every kit has, and the facts
 * Shutap read from the listing (address and price hidden, as everywhere on
 * /realtors). On a phone the four swipe, shoot mode first. Every word shown
 * is from the sample kit. */
import { useEffect, useState } from 'react'
import { SAMPLE_KIT, SAMPLE_LISTING } from '@/lib/realtors/sample-kit'
import { PAUSE_MS, isPauseCue } from '@/lib/bits/cues'
import { trackEvent } from '@/lib/tracking'

const track = (name: string, props: Record<string, unknown> = {}) => { void trackEvent(name, { product: 'realtors', page: 'realtors', ...props }) }
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const WPS = 2.4

function Walkthrough() {
  const shots = SAMPLE_KIT.walkthrough.shots
  const shown = shots.slice(0, 4)
  return (
    <div className="ro-walk">
      {shown.map((s, i) => (
        <div key={i} className="sh">
          <span className="t"><span className="s">{s.seconds}s</span><b>{s.where}</b></span>
          <span className="a">{s.action}</span>
        </div>
      ))}
      <span className="more">+ {shots.length - shown.length} more shots · {shots.length} in all · 15s and 60s cuts</span>
    </div>
  )
}

/** shoot mode: the walkthrough's lines at talking pace, the cue above each */
function Shoot() {
  const shots = SAMPLE_KIT.walkthrough.shots
  const [i, setI] = useState(0)
  const [on, setOn] = useState(true)
  const [cues, setCues] = useState(true)
  useEffect(() => {
    if (!on || reduceMotion()) return
    const words = shots[i]!.line.split(/\s+/).length
    const hold = shots[i]!.delivery && isPauseCue(shots[i]!.delivery) ? PAUSE_MS : 0
    const t = window.setTimeout(() => setI((x) => (x + 1) % shots.length), Math.max(2200, (words / WPS) * 1000 + 700) + hold)
    return () => window.clearTimeout(t)
  }, [on, i, shots])
  const s = shots[i]!
  return (
    <div className="ro-prompt">
      <span className="h">shoot mode · shot {i + 1} of {shots.length} · {s.where}</span>
      <span className="g" aria-hidden />
      <span className="dim">{i > 0 ? shots[i - 1]!.line : ''}</span>
      {cues && s.delivery && <span className="cue">{s.delivery}</span>}
      <span className="lit">{s.line}</span>
      <span className="dim">{i < shots.length - 1 ? shots[i + 1]!.line : ''}</span>
      <span className="b">
        <button type="button" className="go" onClick={() => { setOn((v) => !v); track('sample_prompter_toggle', { on: !on }) }}>{on ? 'pause' : 'play'}</button>
        <button type="button" className={cues ? 'cu on' : 'cu'} aria-pressed={cues} onClick={() => { setCues((v) => !v); track('sample_cues_toggled', { on: !cues }) }}>cues {cues ? 'on' : 'off'}</button>
      </span>
    </div>
  )
}

const REEL_POSTS = ['just listed · tiktok', 'price improvement', 'pending', 'sold']
const HEAD: Record<string, string> = { 'just listed · tiktok': 'JUST LISTED', 'price improvement': 'PRICE IMPROVEMENT', pending: 'PENDING', sold: 'SOLD' }

/** the posts, typed onto a 9:16 reel the agent films themselves */
const POSTS = REEL_POSTS.map((l) => SAMPLE_KIT.posts.find((p) => p.label === l)).filter((p): p is { label: string; text: string } => !!p)

function Reel() {
  const posts = POSTS
  const [st, setSt] = useState({ pi: 0, c: 0 })
  useEffect(() => {
    if (!posts.length) return
    if (reduceMotion()) { setSt({ pi: 0, c: 9999 }); return }
    const id = window.setInterval(() => {
      setSt((x) => (x.c < posts[x.pi]!.text.length + 40 ? { pi: x.pi, c: x.c + 2 } : { pi: (x.pi + 1) % posts.length, c: 0 }))
    }, 55)
    return () => window.clearInterval(id)
  }, [posts])
  const { pi, c } = st
  const p = posts[pi]
  if (!p) return null
  const label = p.label.replace('tiktok', 'TikTok')
  return (
    <div className="ro-reel-wrap">
      <div className="ro-reel" aria-label={`${label} post on a 9:16 reel`}>
        <span className="tag l">9:16 · your reel</span>
        <span className="tag r">{label}</span>
        <span className="hd"><b>{HEAD[p.label] ?? p.label.toUpperCase()}</b><span>{SAMPLE_LISTING.city}</span></span>
        <span className="ic" aria-hidden>
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <svg viewBox="0 0 24 24"><path d="M4 12v8h16v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>
        </span>
        <span className="cap"><b>@your.handle</b><span>{p.text.slice(0, c)}<i aria-hidden /></span></span>
      </div>
    </div>
  )
}

function OpenHouse() {
  const oh = SAMPLE_KIT.open_house
  const sign = oh.find((x) => x.label === 'sign line')?.text ?? ''
  const story = oh.find((x) => x.label === 'story · 3 frames')
  const thanks = oh.find((x) => x.label === 'thank-you text')
  return (
    <div className="ro-oh">
      <span className="sign"><b>OPEN HOUSE</b><span>{sign}</span><small>sign line</small></span>
      {story && <span className="card"><b>{story.label}</b><span>{story.text}</span></span>}
      {thanks && <span className="card"><b>{thanks.label}</b><span>{thanks.text}</span></span>}
      <span className="more">{oh.length} pieces · {oh.map((x) => x.label.replace(' · 3 frames', '')).join(' · ')}</span>
    </div>
  )
}

export function RealtorOutputs() {
  const L = SAMPLE_LISTING
  const facts = [
    L.city, `${L.beds} bed`, `${L.baths} bath`, `${L.sqft?.toLocaleString('en-US')} sq ft`, `built ${L.year_built}`, `lot ${L.lot_sqft?.toLocaleString('en-US')} sq ft`,
    'gas range', 'insert fireplace', 'double pane windows', 'waterproof floors', `HOA ${L.hoa}`, `taxes ${L.taxes}`,
  ].filter(Boolean)
  const tile = (id: string, title: string, use: string, foot: string, body: React.ReactNode, lead = false) => (
    <div className={`ro-tile${lead ? ' lead' : ''}`} data-tile={id} onPointerDown={() => track('sample_tile_open', { output: id, how: 'tap' })}>
      <span className="ro-h"><b>{title}</b><span>{use}</span></span>
      <div className="ro-body">{body}</div>
      <span className="ro-foot">{foot}</span>
    </div>
  )
  return (
    <section className="ro" aria-label="A realistic demo of a kit made in-house">
      <div className="ro-row">
        {tile('walkthrough', 'Walkthrough to film', 'to shoot', 'Shot by shot: where to stand, what to do, what to say.', <Walkthrough />)}
        {tile('shoot', 'Shoot mode', 'to rehearse & film', 'Teleprompter with a cue on how to say each line.', <Shoot />, true)}
        {tile('posts', 'Social posts', 'to post', `The caption, typed as you’d post it on your own 9:16 reel (you film it). ${SAMPLE_KIT.posts.length} posts, just listed to sold.`, <Reel />)}
        {tile('open_house', 'Open-house kit', 'for the weekend', 'Invite, story, sign line, reminder, thank-you text.', <OpenHouse />)}
      </div>
      <p className="ro-also">
        <span>Also in every kit: <b>the voiceover</b> ({SAMPLE_KIT.voiceover.length} lines) · <b>{SAMPLE_KIT.hooks.length} hooks</b> for the first 2 seconds · <b>MLS copy</b>, no jokes</span>
        <span className="mu">{L.beds}-bed, {L.city} · funny tone · fair-housing checked</span>
      </p>
      <div className="ro-facts">
        <span className="lb">What Shutap read from the listing</span>
        {facts.map((f) => <span key={f} className="f">{f}</span>)}
        <span className="mu">· address and price hidden</span>
      </div>
    </section>
  )
}
