// Draws one frame of the 5-second video on a 2D canvas at time t (seconds),
// in 1080×1920 coordinates. Used by the in-app player (requestAnimationFrame)
// and by the encoder (frame by frame), so what you watch is what you get.
//
// Everything inside the TikTok safe zone: top 11% .. bottom 80%, left 9% ..
// right 87% (the right column is TikTok's buttons).
import { VIDEO_H, VIDEO_W, type Character, type SceneKind, type VideoSpec } from './spec'

export const FONT = "'Sora', system-ui, sans-serif"

const SAFE = { top: VIDEO_H * 0.11, bottom: VIDEO_H * 0.8, left: VIDEO_W * 0.09, right: VIDEO_W * 0.87 }
const COL_W = SAFE.right - SAFE.left
const CX = (SAFE.left + SAFE.right) / 2

const cl = (x: number) => Math.max(0, Math.min(1, x))
/** ease-out back: the pop */
const eob = (x: number) => {
  x = cl(x)
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
const eo = (x: number) => 1 - Math.pow(1 - cl(x), 3)

type Pop = { alpha: number; scale: number }
function pop(t: number, at: number, d = 0.28, from = 0.3): Pop {
  const k = (t - at) / d
  if (k <= 0) return { alpha: 0, scale: from }
  return { alpha: 1, scale: from + (1 - from) * eob(k) }
}
function slide(t: number, at: number, d = 0.3): { alpha: number; dx: number } {
  const k = eo((t - at) / d)
  return { alpha: k, dx: (1 - k) * -80 }
}

function withPop(ctx: CanvasRenderingContext2D, p: Pop, x: number, y: number, draw: () => void) {
  if (p.alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= p.alpha
  ctx.translate(x, y)
  ctx.scale(p.scale, p.scale)
  ctx.translate(-x, -y)
  draw()
  ctx.restore()
}

/** Fit text to a width by shrinking the font, never below `min`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, min: number): number {
  let s = size
  for (;;) {
    ctx.font = `${weight} ${s}px ${FONT}`
    if (ctx.measureText(text).width <= maxW || s <= min) return s
    s -= 2
  }
}

/** Word-wrap into at most `maxLines`, shrinking the font if it needs more. */
function wrap(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, maxLines: number, min: number): { lines: string[]; size: number } {
  let s = size
  for (;;) {
    ctx.font = `${weight} ${s}px ${FONT}`
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (ctx.measureText(next).width <= maxW) cur = next
      else {
        if (cur) lines.push(cur)
        cur = w
      }
    }
    if (cur) lines.push(cur)
    if (lines.length <= maxLines || s <= min) return { lines, size: s }
    s -= 3
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/* ── the cartoon ──
   Flat vector, two to three colours, no outlines except eyes and mouth. One
   person (the role in the story, or the teller) at the scene's surface with
   its prop. Blinks every ~2.6s; talks (mouth opens) while the hook and tags
   land; expression changes on tag 1 (grin), tag 2 (object reacts), button
   (flat line). */

const SKIN = ['#f3c9a6', '#d9a070', '#8d5a3b', '#f0d5c0']
const HAIR = ['#3b2a1e', '#1d1a1a', '#8a5a2b', '#d9a441', '#6b6b6b']
const SHIRT = ['#2f6db5', '#0b6b45', '#c1216b', '#d9522b', '#1d3f8f']

type Mood = 'flat' | 'talk' | 'grin' | 'oops'

function person(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, seed: number, mood: Mood, blink: boolean, who: Character) {
  const skin = SKIN[Math.floor(seed * 10) % SKIN.length]!
  const hair = HAIR[Math.floor(seed * 100) % HAIR.length]!
  const shirt = SHIRT[Math.floor(seed * 1000) % SHIRT.length]!
  const { role, gender, kid } = who
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  // body: a dress (trapezoid) for a girl or woman, a shirt for everyone else
  ctx.fillStyle = shirt
  if (gender === 'f') {
    ctx.beginPath()
    ctx.moveTo(-26, 26)
    ctx.lineTo(26, 26)
    ctx.lineTo(44, 104)
    ctx.lineTo(-44, 104)
    ctx.closePath()
    ctx.fill()
  } else {
    roundRect(ctx, -34, 26, 68, 78, 18)
    ctx.fill()
  }
  // neck
  ctx.fillStyle = skin
  ctx.fillRect(-9, 14, 18, 18)
  // head
  ctx.beginPath()
  ctx.arc(0, 0, 30, 0, Math.PI * 2)
  ctx.fill()
  // hair, by who they are: a girl gets pigtails and a bow, a woman long hair
  // past the shoulders, a boy a tuft, a man a short cap, anyone else a fringe
  ctx.fillStyle = hair
  ctx.beginPath()
  if (gender === 'f' && kid) {
    ctx.moveTo(-30, -2)
    ctx.quadraticCurveTo(0, -46, 30, -2)
    ctx.quadraticCurveTo(14, -24, 0, -22)
    ctx.quadraticCurveTo(-14, -24, -30, -2)
    ctx.closePath()
    ctx.fill()
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sx * 36, 6, 9, 20, sx * 0.25, 0, Math.PI * 2)
      ctx.fill()
    }
    // the bow
    ctx.fillStyle = '#e0508a'
    ctx.beginPath()
    ctx.moveTo(20, -26)
    ctx.lineTo(32, -34)
    ctx.lineTo(32, -18)
    ctx.closePath()
    ctx.moveTo(20, -26)
    ctx.lineTo(8, -34)
    ctx.lineTo(8, -18)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
  } else if (gender === 'f') {
    // long hair: a cap plus two falls down the sides
    ctx.moveTo(-32, 0)
    ctx.quadraticCurveTo(0, -48, 32, 0)
    ctx.lineTo(34, 46)
    ctx.lineTo(22, 46)
    ctx.lineTo(24, 4)
    ctx.quadraticCurveTo(0, -18, -24, 4)
    ctx.lineTo(-22, 46)
    ctx.lineTo(-34, 46)
    ctx.closePath()
  } else if (kid) {
    ctx.arc(0, -26, 12, 0, Math.PI * 2)
  } else if (gender === 'm' || role === 'boss' || role === 'landlord') {
    ctx.arc(0, -4, 30, Math.PI, 2 * Math.PI)
  } else {
    ctx.moveTo(-30, -2)
    ctx.quadraticCurveTo(0, -46, 30, -2)
    ctx.quadraticCurveTo(14, -24, 0, -22)
    ctx.quadraticCurveTo(-14, -24, -30, -2)
  }
  ctx.closePath()
  ctx.fill()
  // eyes
  ctx.fillStyle = '#1d1a1a'
  if (blink) {
    ctx.fillRect(-14, -2, 8, 2)
    ctx.fillRect(6, -2, 8, 2)
  } else {
    ctx.beginPath()
    ctx.arc(-10, -2, 3.2, 0, Math.PI * 2)
    ctx.arc(10, -2, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // brows
  ctx.strokeStyle = '#1d1a1a'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (mood === 'oops') {
    ctx.moveTo(-16, -12)
    ctx.lineTo(-5, -9)
    ctx.moveTo(16, -12)
    ctx.lineTo(5, -9)
  } else {
    ctx.moveTo(-16, -10)
    ctx.lineTo(-5, -11)
    ctx.moveTo(16, -10)
    ctx.lineTo(5, -11)
  }
  ctx.stroke()
  // mouth
  ctx.beginPath()
  if (mood === 'grin') {
    ctx.moveTo(-10, 10)
    ctx.quadraticCurveTo(0, 20, 10, 10)
    ctx.stroke()
  } else if (mood === 'talk') {
    ctx.fillStyle = '#7a2b2b'
    ctx.ellipse(0, 12, 6, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (mood === 'oops') {
    ctx.ellipse(0, 13, 4, 5, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.moveTo(-8, 12)
    ctx.lineTo(8, 12)
    ctx.stroke()
  }
  ctx.restore()
}

const SCENE_H = 440

function scene(ctx: CanvasRenderingContext2D, kind: SceneKind, t: number, spec: VideoSpec, top: number, f: number) {
  // The scene sits in a band below the hook and above the tags. `f` scales it.
  const y0 = top
  const h = SCENE_H * f
  const x0 = SAFE.left
  const w = COL_W
  const seed = spec.seed
  const c = spec.cues
  const blink = Math.floor((t * 1000 + seed * 2600) / 2600) !== Math.floor((t * 1000 + seed * 2600 - 110) / 2600)
  const talking = t > c.hook && t < c.button && Math.floor(t * 9) % 2 === 0
  const mood: Mood = t >= c.button ? 'flat' : t >= c.tag1 ? (talking ? 'talk' : 'grin') : talking ? 'talk' : 'flat'
  const reacts = t >= c.tag2
  const floorY = y0 + h - 40
  ctx.save()
  // floor
  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  ctx.beginPath()
  ctx.ellipse(x0 + w / 2, floorY + 18, w * 0.42, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  const cast = spec.cast.length ? spec.cast : [{ role: 'me', gender: 'n', kid: false } as Character]
  const two = cast.length === 2
  const px = x0 + w * (two ? 0.26 : 0.3)
  const py = floorY - 215 * f
  // with two people the second one stands where the prop would; the prop
  // keeps to the furniture (counter, bench, board) behind them
  const ox = x0 + w * (two ? 0.74 : 0.7)
  switch (kind) {
    case 'kitchen': {
      // counter + sink, stove with the pan
      ctx.fillStyle = '#e9d6c5'
      roundRect(ctx, x0 + 20, floorY - 70, w - 40, 60, 10)
      ctx.fill()
      ctx.fillStyle = '#cfd8dc'
      roundRect(ctx, px - 70, floorY - 86, 140, 26, 6)
      ctx.fill()
      ctx.fillStyle = '#9aa5ab'
      ctx.fillRect(px - 10, floorY - 118, 8, 32)
      // stove
      ctx.fillStyle = '#4a4a4a'
      roundRect(ctx, ox - 70, floorY - 96, 140, 30, 6)
      ctx.fill()
      // pan (reacts: bubbles + frown)
      ctx.fillStyle = '#6b6b6b'
      ctx.beginPath()
      ctx.ellipse(ox, floorY - 104, 48, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#8a5a2b'
      ctx.beginPath()
      ctx.ellipse(ox, floorY - 108, 40, 11, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6b6b6b'
      ctx.fillRect(ox + 44, floorY - 112, 48, 8)
      if (reacts) {
        const k = (t - c.tag2) % 1.2
        ctx.fillStyle = '#bfe6f5'
        for (let i = 0; i < 3; i++) {
          const yy = floorY - 130 - ((k + i * 0.35) % 1.2) * 60
          ctx.beginPath()
          ctx.arc(ox - 20 + i * 18, yy, 6 + (i % 2) * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = '#1d1a1a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(ox - 12, floorY - 104)
        ctx.quadraticCurveTo(ox, floorY - 112, ox + 12, floorY - 104)
        ctx.stroke()
      }
      break
    }
    case 'office': {
      ctx.fillStyle = '#d7c4ad'
      roundRect(ctx, x0 + 20, floorY - 70, w - 40, 50, 8)
      ctx.fill()
      // laptop
      ctx.fillStyle = '#2b2b2b'
      roundRect(ctx, ox - 60, floorY - 150, 120, 78, 6)
      ctx.fill()
      ctx.fillStyle = reacts ? '#ffe9a8' : '#dfe9f3'
      ctx.fillRect(ox - 52, floorY - 142, 104, 62)
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(ox - 70, floorY - 72, 140, 6)
      if (reacts) {
        ctx.fillStyle = '#d62f3a'
        ctx.beginPath()
        ctx.arc(ox + 40, floorY - 134, 7, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'phone': {
      // big phone on the right, a message bubble that lands on tag 2
      ctx.fillStyle = '#1d1a1a'
      roundRect(ctx, ox - 50, floorY - 230, 100, 190, 18)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, ox - 42, floorY - 220, 84, 170, 12)
      ctx.fill()
      ctx.fillStyle = '#dfe9f3'
      roundRect(ctx, ox - 34, floorY - 200, 56, 24, 10)
      ctx.fill()
      if (reacts) {
        ctx.fillStyle = spec.palette.badge1
        roundRect(ctx, ox - 22, floorY - 160, 56, 24, 10)
        ctx.fill()
        ctx.fillStyle = '#d62f3a'
        ctx.beginPath()
        ctx.arc(ox + 40, floorY - 226, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'car': {
      ctx.fillStyle = spec.palette.badge1
      roundRect(ctx, ox - 120, floorY - 110, 240, 70, 22)
      ctx.fill()
      roundRect(ctx, ox - 80, floorY - 160, 150, 60, 20)
      ctx.fill()
      ctx.fillStyle = '#dfe9f3'
      roundRect(ctx, ox - 66, floorY - 150, 56, 36, 8)
      ctx.fill()
      ctx.fillStyle = '#2b2b2b'
      for (const wx of [ox - 78, ox + 78]) {
        ctx.beginPath()
        ctx.arc(wx, floorY - 40, 24, 0, Math.PI * 2)
        ctx.fill()
      }
      if (reacts) {
        ctx.fillStyle = '#ffb703'
        ctx.beginPath()
        ctx.arc(ox + 112, floorY - 90, 8, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'living': {
      ctx.fillStyle = spec.palette.badge2
      roundRect(ctx, ox - 130, floorY - 120, 260, 90, 24)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      roundRect(ctx, ox - 120, floorY - 100, 120, 40, 14)
      ctx.fill()
      roundRect(ctx, ox + 0, floorY - 100, 120, 40, 14)
      ctx.fill()
      if (reacts) {
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, ox - 40, floorY - 150, 80, 40, 10)
        ctx.fill()
      }
      break
    }
    case 'school': {
      // a chalkboard on the wall, a row of cubbies, a paper star on tag 2
      ctx.fillStyle = '#2f5d46'
      roundRect(ctx, x0 + 40, y0 + 20 * f, w - 80, 150 * f, 10)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x0 + 80, y0 + 70 * f)
      ctx.lineTo(x0 + 260, y0 + 70 * f)
      ctx.moveTo(x0 + 80, y0 + 110 * f)
      ctx.lineTo(x0 + 200, y0 + 110 * f)
      ctx.stroke()
      ctx.fillStyle = '#e9d6c5'
      roundRect(ctx, x0 + 20, floorY - 70, w - 40, 60, 10)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      for (let i = 0; i < 4; i++) roundRect(ctx, x0 + 40 + i * ((w - 80) / 4), floorY - 62, (w - 80) / 4 - 10, 44, 6), ctx.fill()
      if (!two) {
        ctx.fillStyle = '#d9a441'
        roundRect(ctx, ox - 40, floorY - 120, 80, 50, 8)
        ctx.fill()
      }
      if (reacts) {
        ctx.fillStyle = '#ffb703'
        const cx = x0 + w - 90
        const cy = y0 + 60 * f
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 9 : 22
          const a = (i * Math.PI) / 5 - Math.PI / 2
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        }
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'street': {
      // a bus-stop sign and a bench; a bus rolls in on tag 2
      ctx.fillStyle = '#cfcfcf'
      ctx.fillRect(x0 + 20, floorY - 30, w - 40, 22)
      ctx.fillStyle = '#6b6b6b'
      roundRect(ctx, x0 + w / 2 - 70, floorY - 100, 140, 16, 6)
      ctx.fill()
      ctx.fillRect(x0 + w / 2 - 60, floorY - 84, 10, 54)
      ctx.fillRect(x0 + w / 2 + 50, floorY - 84, 10, 54)
      const sx = two ? x0 + w / 2 : ox
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(sx - 4, floorY - 250, 8, 220)
      ctx.fillStyle = spec.palette.badge1
      roundRect(ctx, sx - 34, floorY - 290, 68, 48, 8)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, sx - 22, floorY - 278, 44, 24, 5)
      ctx.fill()
      if (reacts) {
        const k = Math.min(1, (t - c.tag2) / 0.6)
        const bx = x0 + w + 160 - k * 300
        ctx.fillStyle = spec.palette.badge2
        roundRect(ctx, bx - 110, y0 + 70 * f, 220, 110 * f, 18)
        ctx.fill()
        ctx.fillStyle = '#dfe9f3'
        for (let i = 0; i < 3; i++) roundRect(ctx, bx - 92 + i * 64, y0 + 86 * f, 48, 36 * f, 6), ctx.fill()
      }
      break
    }
    case 'restaurant': {
      // a table with a plate and a glass; the glass tips on tag 2
      ctx.fillStyle = '#d7c4ad'
      roundRect(ctx, x0 + 40, floorY - 76, w - 80, 40, 10)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      const tx = two ? x0 + w / 2 : ox
      ctx.beginPath()
      ctx.ellipse(tx, floorY - 84, 54, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = spec.palette.badge2
      ctx.beginPath()
      ctx.ellipse(tx, floorY - 86, 30, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.translate(tx + 80, floorY - 80)
      if (reacts) ctx.rotate(0.5)
      ctx.fillStyle = '#bfe6f5'
      roundRect(ctx, -12, -50, 24, 50, 5)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'clinic': {
      // an exam bed, a cross on the wall, a chart that drops on tag 2
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, x0 + 40, y0 + 30 * f, 90, 90, 12)
      ctx.fill()
      ctx.fillStyle = '#d62f3a'
      ctx.fillRect(x0 + 75, y0 + 45 * f, 20, 60)
      ctx.fillRect(x0 + 55, y0 + 65 * f, 60, 20)
      ctx.fillStyle = '#dfe9f3'
      roundRect(ctx, (two ? x0 + w / 2 : ox) - 110, floorY - 90, 220, 44, 12)
      ctx.fill()
      ctx.fillStyle = '#9aa5ab'
      ctx.fillRect((two ? x0 + w / 2 : ox) - 96, floorY - 46, 10, 40)
      ctx.fillRect((two ? x0 + w / 2 : ox) + 86, floorY - 46, 10, 40)
      if (reacts) {
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, x0 + w - 150, y0 + 40 * f, 90, 110, 8)
        ctx.fill()
        ctx.strokeStyle = '#d62f3a'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(x0 + w - 135, y0 + 110 * f)
        ctx.lineTo(x0 + w - 115, y0 + 80 * f)
        ctx.lineTo(x0 + w - 100, y0 + 120 * f)
        ctx.lineTo(x0 + w - 75, y0 + 60 * f)
        ctx.stroke()
      }
      break
    }
    case 'gym': {
      // a rack and a dumbbell; a sweat drop on tag 2
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(x0 + 40, floorY - 150, 12, 130)
      ctx.fillRect(x0 + 40, floorY - 150, w - 80, 12)
      ctx.fillRect(x0 + w - 52, floorY - 150, 12, 130)
      const dx = two ? x0 + w / 2 : ox
      ctx.fillStyle = '#2b2b2b'
      ctx.fillRect(dx - 60, floorY - 52, 120, 10)
      roundRect(ctx, dx - 84, floorY - 70, 28, 46, 6)
      ctx.fill()
      roundRect(ctx, dx + 56, floorY - 70, 28, 46, 6)
      ctx.fill()
      if (reacts) {
        ctx.fillStyle = '#bfe6f5'
        ctx.beginPath()
        ctx.ellipse(px + 70 * f, py - 40 * f, 8, 13, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    default: {
      // a table and a cup
      ctx.fillStyle = '#d7c4ad'
      roundRect(ctx, x0 + 60, floorY - 70, w - 120, 40, 10)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, ox - 22, floorY - 110, 44, 44, 8)
      ctx.fill()
      if (reacts) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(ox - 8, floorY - 120)
        ctx.quadraticCurveTo(ox - 14, floorY - 140, ox - 4, floorY - 150)
        ctx.moveTo(ox + 8, floorY - 120)
        ctx.quadraticCurveTo(ox + 2, floorY - 140, ox + 12, floorY - 150)
        ctx.stroke()
      }
    }
  }
  // the person, bobbing a little while talking
  const bob = talking ? Math.sin(t * 18) * 3 : 0
  const a = cast[0]!
  const sa = (a.kid ? 1.75 : 2.3) * f
  // a kid stands on the floor, so a smaller figure sits lower
  person(ctx, px, floorY - 104 * sa + bob, sa, seed, mood, blink, a)
  if (two) {
    const b = cast[1]!
    const sb = (b.kid ? 1.75 : 2.3) * f
    const seedB = (seed * 31 + 0.37) % 1
    const blinkB = Math.floor((t * 1000 + seedB * 2600) / 2600) !== Math.floor((t * 1000 + seedB * 2600 - 110) / 2600)
    const moodB: Mood = reacts ? 'oops' : t >= c.tag1 ? 'flat' : 'flat'
    person(ctx, ox, floorY - 104 * sb, sb, seedB, moodB, blinkB, b)
  }
  // sparkle on the grin
  if (mood === 'grin') {
    ctx.strokeStyle = spec.palette.badge2
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    const sx = px + 95 * f
    const sy = floorY - 104 * sa - 60 * f
    ctx.beginPath()
    ctx.moveTo(sx - 10, sy)
    ctx.lineTo(sx + 10, sy)
    ctx.moveTo(sx, sy - 10)
    ctx.lineTo(sx, sy + 10)
    ctx.stroke()
  }
  ctx.restore()
}

export type DrawOpts = { watermark: boolean }

/** Draw the frame at time t. The canvas must be VIDEO_W × VIDEO_H (or scaled by the caller). */
export function drawFrame(ctx: CanvasRenderingContext2D, t: number, spec: VideoSpec, opts: DrawOpts) {
  // Fit: draw at full size; if the button would run past the safe zone,
  // draw again a notch smaller. The scale is decided on the fullest frame
  // (t = 5s) so the layout never jumps mid-video.
  const f = fitScale(ctx, spec)
  drawAt(ctx, t, spec, opts, f)
}

const SCALES = [1, 0.94, 0.88, 0.82, 0.76, 0.7]
const fitCache = new WeakMap<VideoSpec, number>()
function fitScale(ctx: CanvasRenderingContext2D, spec: VideoSpec): number {
  const hit = fitCache.get(spec)
  if (hit) return hit
  let chosen = SCALES[SCALES.length - 1]!
  for (const f of SCALES) {
    ctx.save()
    const end = drawAt(ctx, 4.9, spec, { watermark: false }, f)
    ctx.restore()
    if (end <= SAFE.bottom - 60) {
      chosen = f
      break
    }
  }
  fitCache.set(spec, chosen)
  return chosen
}

/** Draws the frame at scale f; returns where the button box ends. */
function drawAt(ctx: CanvasRenderingContext2D, t: number, spec: VideoSpec, opts: DrawOpts, f: number): number {
  const p = spec.palette
  const c = spec.cues
  // stage
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO_H)
  g.addColorStop(0, p.stage[0])
  g.addColorStop(0.45, p.stage[1])
  g.addColorStop(1, p.stage[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
  // a few drifting dots, the daily series' texture
  ctx.fillStyle = 'rgba(0,0,0,0.05)'
  for (let i = 0; i < 18; i++) {
    const x = ((i * 977 + spec.seed * 1000) % VIDEO_W)
    const y = ((i * 613 + t * 18 + spec.seed * 500) % VIDEO_H)
    ctx.beginPath()
    ctx.arc(x, y, 5 + (i % 3) * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  let y = SAFE.top + 50 * f
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // the pill
  const pillPop = pop(t, c.pill, 0.24, 0.5)
  withPop(ctx, pillPop, CX, y, () => {
    ctx.font = `800 ${44 * f}px ${FONT}`
    const tw = ctx.measureText('the bit').width + 60 * f
    ctx.fillStyle = p.pill
    roundRect(ctx, CX - tw / 2, y - 37 * f, tw, 74 * f, 37 * f)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillText('the bit', CX, y + 2)
  })
  y += 120 * f

  // the hook, two lines, two colours
  const hookPop = pop(t, c.hook, 0.34, 0.25)
  const [h1, h2] = spec.hook
  const s1 = fitFont(ctx, h1, 800, 124 * f, COL_W, 60)
  const s2 = h2 ? fitFont(ctx, h2, 800, 104 * f, COL_W, 52) : 0
  const hookH = s1 + (h2 ? s2 + 14 : 0)
  withPop(ctx, hookPop, CX, y + hookH / 2, () => {
    ctx.fillStyle = p.hookA
    ctx.font = `800 ${s1}px ${FONT}`
    ctx.fillText(h1, CX, y + s1 / 2)
    if (h2) {
      ctx.fillStyle = p.hookB
      ctx.font = `800 ${s2}px ${FONT}`
      ctx.fillText(h2, CX, y + s1 + 14 + s2 / 2)
    }
  })
  y += hookH + 40 * f

  // the scene
  scene(ctx, spec.scene, t, spec, y, f)
  y += SCENE_H * f + 10

  // the tags, as numbered rows
  ctx.textAlign = 'left'
  spec.tags.forEach((tag, i) => {
    const at = i === 0 ? c.tag1 : c.tag2
    const sl = slide(t, at)
    ctx.save()
    ctx.globalAlpha *= sl.alpha
    ctx.translate(sl.dx, 0)
    const badge = i === 0 ? p.badge1 : p.badge2
    const bx = SAFE.left + 10
    const { lines, size } = wrap(ctx, tag, 800, 54 * f, COL_W - 120, 3, 34)
    const rowH = Math.max(90 * f, lines.length * (size * 1.08) + 24)
    ctx.fillStyle = badge
    roundRect(ctx, bx, y + rowH / 2 - 40, 80, 80, 18)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = `800 44px ${FONT}`
    ctx.fillText(String(i + 1), bx + 40, y + rowH / 2 + 2)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1d1a1a'
    ctx.font = `800 ${size}px ${FONT}`
    const lh = size * 1.08
    const startY = y + rowH / 2 - ((lines.length - 1) * lh) / 2
    lines.forEach((ln, k) => ctx.fillText(ln, bx + 102, startY + k * lh))
    ctx.restore()
    y += rowH + 22 * f
  })
  ctx.textAlign = 'center'

  // the button, in the white box
  const bPop = pop(t, c.button, 0.3, 0.6)
  let end = y
  {
    const lead = spec.button.lead
    const acc = spec.button.accent
    const { lines: ll, size: ls } = lead ? wrap(ctx, lead, 800, 50 * f, COL_W - 90, 2, 34) : { lines: [], size: 0 }
    const { lines: al, size: as } = wrap(ctx, acc, 800, 62 * f, COL_W - 90, 2, 38)
    const boxH = 50 + ll.length * ls * 1.1 + al.length * as * 1.1 + (ll.length ? 12 : 0)
    const by = y + 14
    withPop(ctx, bPop, CX, by + boxH / 2, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      roundRect(ctx, SAFE.left + 20, by + 6, COL_W - 40, boxH, 18)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, SAFE.left + 20, by, COL_W - 40, boxH, 18)
      ctx.fill()
      let ty = by + 25
      ctx.fillStyle = '#1d1a1a'
      ctx.font = `800 ${ls}px ${FONT}`
      ll.forEach((ln) => {
        ctx.fillText(ln, CX, ty + ls / 2)
        ty += ls * 1.1
      })
      if (ll.length) ty += 12
      ctx.fillStyle = p.accent
      ctx.font = `800 ${as}px ${FONT}`
      al.forEach((ln) => {
        ctx.fillText(ln, CX, ty + as / 2)
        ty += as * 1.1
      })
    })
    y = by + boxH + 24
    end = y
  }

  // the tagline
  const tl = eo((t - c.tagline) / 0.3)
  if (tl > 0) {
    ctx.save()
    ctx.globalAlpha *= tl
    ctx.fillStyle = p.accent
    ctx.font = `800 46px ${FONT}`
    ctx.fillText(spec.tagline, CX, SAFE.bottom - 36 + (1 - tl) * 12)
    ctx.restore()
  }

  // the watermark: the logo wordmark, shut + ap + .com, tilted across the middle
  if (opts.watermark) drawWatermark(ctx, 0.5)
  return end
}

/** The free watermark. Exported so the picture can carry the same mark. */
export function drawWatermark(ctx: CanvasRenderingContext2D, alpha: number) {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(VIDEO_W / 2, VIDEO_H / 2)
  ctx.rotate(-18 * (Math.PI / 180))
  ctx.font = `800 150px ${FONT}`
  ctx.textBaseline = 'middle'
  const a = 'shut'
  const b = 'ap'
  const cDot = '.com'
  const wa = ctx.measureText(a).width
  const wb = ctx.measureText(b).width
  const wc = ctx.measureText(cDot).width
  const total = wa + wb + wc
  let x = -total / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = '#0b080f'
  ctx.fillText(a, x, 0)
  x += wa
  ctx.fillStyle = '#c1216b'
  ctx.fillText(b, x, 0)
  x += wb
  ctx.fillStyle = '#0b080f'
  ctx.fillText(cDot, x, 0)
  ctx.restore()
}
