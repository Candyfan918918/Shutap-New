/* "Perform it" (Nov 6 2026 redesign): the three formats as preview tiles
 * built from this version's own lines, so the person sees what each one
 * gives before tapping. Stand-up: the hook lit on a black prompter with a
 * clock. Sketch: a miniature screenplay page. Skit: a scene card with the
 * two parts. The real sketch and skit are still written on request. */
import type { BitVersion } from '@/lib/bits/shared'
import { ActionIcon } from './icons'

type Props = {
  version: BitVersion
  onStandup: () => void
  onSketch: () => void
  onSkit: () => void
}

/** a short, one-word scene from the story's first nouns, for the previews */
function sceneOf(v: BitVersion): string {
  const t = `${v.hook} ${v.setup}`.toLowerCase()
  const places: [RegExp, string][] = [
    [/\b(bus|train|station|stop)\b/, 'BUS STOP'], [/\b(kitchen|dinner|cook)/, 'KITCHEN'], [/\b(office|meeting|boss|desk|slack)\b/, 'OFFICE'],
    [/\b(car|uber|drive|traffic)\b/, 'CAR'], [/\b(school|class|teacher)\b/, 'SCHOOL'], [/\b(store|aisle|checkout|target|costco)\b/, 'STORE'],
    [/\b(gym|yoga|run)\b/, 'GYM'], [/\b(wedding|toast|reception)\b/, 'RECEPTION'], [/\b(doctor|dentist|clinic)\b/, 'WAITING ROOM'], [/\b(airport|plane|flight|gate)\b/, 'AIRPORT'],
  ]
  for (const [re, name] of places) if (re.test(t)) return name
  return 'LIVING ROOM'
}

/** the other voice in the scene: the first person word in the story */
function otherOf(v: BitVersion): string {
  const m = /\b(my )?(daughter|son|kid|mom|mother|dad|father|boss|coworker|manager|wife|husband|boyfriend|girlfriend|roommate|neighbou?r|friend|landlord|waiter|barista|teacher|doctor|driver|lady|guy)\b/i.exec(`${v.hook} ${v.setup}`)
  return (m?.[2] ?? 'them').toUpperCase()
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

export function PerformIt({ version: v, onStandup, onSketch, onSkit }: Props) {
  const scene = sceneOf(v)
  const other = otherOf(v)
  const shots = Math.min(6, 2 + v.tags.length + 1)
  return (
    <section className="bt-card bt-perform" aria-label="Perform it">
      <span className="bt-lbl r">perform it</span>
      <div className="bt-pf-row" role="group" aria-label="Formats">
        <button className="bt-pf on" onClick={onStandup}>
          <span className="bt-pf-h"><ActionIcon name="standup" /><b>stand-up</b><small>~{v.est_seconds}s</small></span>
          <span className="bt-pf-prev standup" aria-hidden>
            <span className="clock">0:00</span>
            <span className="line">{clip(v.hook, 90)}</span>
            <span className="dim">{clip(v.setup, 70)}</span>
          </span>
          <span className="bt-pf-d">teleprompter, one line lit at a time</span>
          <span className="bt-pf-go">read it →</span>
        </button>
        <button className="bt-pf" onClick={onSketch}>
          <span className="bt-pf-h"><ActionIcon name="sketch" /><b>sketch</b><small>1 page</small></span>
          <span className="bt-pf-prev sketch" aria-hidden>
            <span className="sc">INT. {scene} – DAY</span>
            <span className="ch">{other}</span>
            <span className="dl">{clip(v.setup, 60)}</span>
            <span className="ch">ME</span>
            <span className="dl">{clip(v.tags[0] ?? v.button, 60)}</span>
          </span>
          <span className="bt-pf-d">screenplay page, two voices, a blackout</span>
          <span className="bt-pf-go ghost">write it →</span>
        </button>
        <button className="bt-pf" onClick={onSkit}>
          <span className="bt-pf-h"><ActionIcon name="skit" /><b>skit</b><small>{shots} shots</small></span>
          <span className="bt-pf-prev skit" aria-hidden>
            <span className="shot">shot 1 · {scene.toLowerCase()}</span>
            <span className="you">you as ME</span><span className="you">you as {other}</span>
            <span className="txt">Film alone: swap a hat between the two parts. Say the hook to camera.</span>
          </span>
          <span className="bt-pf-d">one scene, you play both parts</span>
          <span className="bt-pf-go ghost">write it →</span>
        </button>
      </div>
      <span className="bt-note" style={{ display: 'block', marginTop: 8 }}>every format uses this version's lines · each one opens full screen · sign-in required</span>
    </section>
  )
}
