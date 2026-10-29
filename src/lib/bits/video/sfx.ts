// The sounds: the daily series' synth pop / thud / ding, rendered offline so
// the file carries them and the in-app player can play them live.
import type { VideoSpec } from './spec'
import { VIDEO_SECONDS } from './spec'

type Sfx = { pop: (t: number, p?: number) => void; thud: (t: number) => void; ding: (t: number) => void }

function makeSfx(ctx: BaseAudioContext, master: AudioNode): Sfx {
  const env = (g: GainNode, t: number, a: number, peak: number, dec: number) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec)
  }
  return {
    pop: (t, p = 1) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(560 * p, t)
      o.frequency.exponentialRampToValueAtTime(200 * p, t + 0.09)
      env(g, t, 0.004, 0.5, 0.1)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.15)
    },
    thud: (t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.setValueAtTime(140, t)
      o.frequency.exponentialRampToValueAtTime(55, t + 0.2)
      env(g, t, 0.003, 0.6, 0.22)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.3)
    },
    ding: (t) => {
      ;[1, 2.76, 5.4].forEach((m, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = 1568 * m
        env(g, t, 0.003, [0.3, 0.1, 0.04][i]!, 0.8 / (i + 1))
        o.connect(g).connect(master)
        o.start(t)
        o.stop(t + 1)
      })
    },
  }
}

/** Schedule every cue of the spec on `ctx`, offset by `at` seconds. */
export function scheduleSfx(ctx: BaseAudioContext, spec: VideoSpec, at = 0) {
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)
  const s = makeSfx(ctx, master)
  const c = spec.cues
  s.pop(at + c.pill, 1.0)
  s.thud(at + c.hook + 0.04)
  s.pop(at + c.tag1, 1.1)
  if (spec.tags.length > 1) s.pop(at + c.tag2, 1.2)
  s.thud(at + c.button)
  s.ding(at + c.tagline)
}

/** The whole soundtrack as a buffer, for the encoder. 48 kHz mono. */
export async function renderSfx(spec: VideoSpec): Promise<AudioBuffer | null> {
  const Off = (globalThis as any).OfflineAudioContext ?? (globalThis as any).webkitOfflineAudioContext
  if (!Off) return null
  const ctx: OfflineAudioContext = new Off(1, 48000 * VIDEO_SECONDS, 48000)
  scheduleSfx(ctx, spec, 0)
  return ctx.startRendering()
}
