// FORMATS BUILT FOR THE JOB (Nov 1 2026). The audience and length controls
// already say who is listening and for how long; this adds the rules of the
// job itself — a toast is sayable in three minutes and ends on the honoree,
// a slide line has to survive being read off a screen — so the writer
// shapes the bit for the room it is going into, not for a general answer.
import type { BitControls } from './shared'

type Rules = { title: string; rules: string[] }

function job(c: Pick<BitControls, 'audience' | 'length'>): Rules | null {
  const long = c.length === '2m'
  const mid = c.length === '60s'
  switch (c.audience) {
    case 'live':
      if (long)
        return {
          title: 'A SPEECH OR A TOAST (a room, standing, under three minutes)',
          rules: [
            'Open on the room, not on the teller: the first line is something everyone there already knows is true.',
            'Every tag is a thing that actually happened that the room can picture; no tag the person being spoken about could not hear with the room watching.',
            'Build to one callback: the button brings back the hook, changed by what the tags did to it.',
            'Pauses are written in: one sentence per line, nothing that needs a second read.',
            'End on them, warm, with the laugh still in the room; never on a moral, never on a toast formula ("so raise your glass") the writer invented.',
          ],
        }
      return {
        title: mid ? 'A SET (an open mic or a spot, one minute)' : 'A SET (an open mic, thirty seconds)',
        rules: [
          'Room for a laugh after every tag: each tag is a full stop, not a comma.',
          'Nothing that only works on screen: no on-screen-text jokes, no caption rhythm.',
          'The button is the walk-off: the strongest line, said last, then nothing.',
        ],
      }
    case 'office':
      return {
        title: 'A SLIDE LINE (said to a room, read off a screen)',
        rules: [
          'The hook is the slide: at most 8 words, readable from the back of the room, no pun.',
          'One tag is a callback that can land two slides later with no setup: it stands alone.',
          'Clean enough to be forwarded. The joke goes at the process, the deck, the meeting, the inbox: never at a colleague by name or role in a way they could recognise.',
        ],
      }
    case 'social':
      return {
        title: long ? 'A STORYTIME VIDEO (to camera, two minutes)' : 'A POST (TikTok, Reels, Shorts)',
        rules: [
          'The hook is the on-screen text in the first two seconds; it has to stop a thumb on its own.',
          long ? 'Every 20 seconds something turns: a new fact, a new picture, a line the viewer would rewind for.' : 'Cut everything that is not the joke: a viewer leaves in the second a line explains.',
          'The button lands before the loop restarts: short, final, no sign-off.',
        ],
      }
    case 'family':
      return {
        title: 'A TABLE STORY (family dinner, the group chat)',
        rules: ['Nobody at the table should be able to object out loud: warm on the surface, exact underneath.', 'The button is a line someone will repeat at the next dinner.'],
      }
    case 'work':
      return {
        title: 'A WORK STORY TOLD AFTER WORK',
        rules: ['The boss, the meeting and the inbox are fair game; the coworker who was kind is not.', 'The button is the line you would text the group chat.'],
      }
    default:
      return null
  }
}

/** The {{JOB}} block, or '' when the audience has no extra rules. */
export function jobBlock(c: Pick<BitControls, 'audience' | 'length'>): string {
  const j = job(c)
  if (!j) return ''
  return `
THE JOB — ${j.title}:
${j.rules.map((r) => `  - ${r}`).join('\n')}
`
}
