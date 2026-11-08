/* Motion on the homepage product screenshots (Nov 6 2026). Nothing here is
 * drawn: each effect only covers part of the real screenshot and uncovers it,
 * so what the visitor sees typed or generated is exactly the product's own
 * screen. Positions are percentages of the screenshot, measured from the
 * capture (scripts in the PR). Plays only while on screen; with reduced
 * motion the screenshot shows complete and still. */
import { useEffect, useRef, type CSSProperties } from 'react'

type Box = { left: number; top: number; width: number; height: number }
const pct = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` })

/** `then`: another line follows, so this line's caret leaves when it's done */
type Typing = { kind: 'type'; box: Box; chars: number; from: number; to: number; then?: boolean }
type Writing = { kind: 'write'; box: Box; until: number; label?: string }
type ShotEffect = Typing | Writing

type ShotMotionSpec = { seconds: number; effects: ShotEffect[] }

/** Bits: the hook is typed, then tag 1 is written by "funnier". */
const BITS: ShotMotionSpec = {
  seconds: 10,
  effects: [
    { kind: 'type', box: { left: 5.14, top: 19.1, width: 53.8, height: 4.8 }, chars: 48, from: 4, to: 30 },
    { kind: 'write', box: { left: 5.14, top: 60.6, width: 56.6, height: 4.8 }, until: 52, label: '✦ funnier: writing three ways' },
  ],
}

/** Toasts: story 1 is typed, two lines. */
const TOASTS: ShotMotionSpec = {
  seconds: 9,
  effects: [
    { kind: 'type', box: { left: 5.35, top: 88.15, width: 67.8, height: 3.8 }, chars: 60, from: 6, to: 40, then: true },
    { kind: 'type', box: { left: 5.35, top: 91.95, width: 21, height: 3.8 }, chars: 18, from: 41, to: 52 },
  ],
}

/** Realtors (Nov 8 2026, the new /realtors first screen): the listing link
 *  is typed into the paste box beside the real sample kit. */
const REALTORS: ShotMotionSpec = {
  seconds: 7,
  effects: [
    { kind: 'type', box: { left: 7.83, top: 66.82, width: 20.8, height: 5.04 }, chars: 25, from: 8, to: 45 },
  ],
}

const SHOT_MOTION: Record<'bits' | 'realtors' | 'toasts', ShotMotionSpec> = { bits: BITS, toasts: TOASTS, realtors: REALTORS }

/** Keyframes for one effect, as a CSS string (percent of the loop). */
function keyframes(name: string, e: ShotEffect): string {
  if (e.kind === 'type') {
    return `@keyframes ${name}{0%,${e.from}%{transform:translateX(0);animation-timing-function:steps(${e.chars},end)}${e.to}%,94%{transform:translateX(${e.then ? '100%' : 'calc(100% - 2px)'});animation-timing-function:steps(1,end)}97%,100%{transform:translateX(0)}}`
  }
  return `@keyframes ${name}{0%,${e.until}%{opacity:1}${e.until + 4}%,94%{opacity:0}97%,100%{opacity:1}}`
}

export function ShotMotion({ product, children }: { product: 'bits' | 'realtors' | 'toasts'; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const spec = SHOT_MOTION[product]

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => el.classList.toggle('live', entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const css = spec.effects.map((e, i) => keyframes(`ph-${product}-${i}`, e)).join('')

  return (
    <div className="ph-stage" ref={ref}>
      {children}
      <style>{css}</style>
      {spec.effects.map((e, i) => {
        const anim = `ph-${product}-${i} ${spec.seconds}s infinite`
        if (e.kind === 'type') {
          return (
            <span key={i} className="ph-type" style={pct(e.box)} aria-hidden="true">
              <i style={{ animation: `${anim}, ph-caret 1s steps(1, end) infinite` }} />
            </span>
          )
        }
        return (
          <span key={i} className="ph-write" style={{ ...pct(e.box), animation: anim }} aria-hidden="true">
            <b /><b /><b />
            {e.label && <em>{e.label}</em>}
          </span>
        )
      })}
    </div>
  )
}
