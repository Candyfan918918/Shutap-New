/* Immersive homepage motion adapter — applies the behaviors of
 * `useMagnetic`, `useReactiveCard`, and a one-shot card-rise reveal to the
 * DOM elements injected by IMMERSIVE_HTML. Vanilla-DOM ports of the React
 * hooks; behavior parity is intentional. Homepage-only. */

const isCoarse = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const isReduce = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function applyMagnetic(el: HTMLElement, strength = 0.22): () => void {
  const origTransition = el.style.transition
  const origTransform = el.style.transform
  let raf = 0
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      el.style.transition = 'transform 0s'
      el.style.transform = `translate(${(dx * strength).toFixed(2)}px, ${(dy * strength).toFixed(2)}px)`
    })
  }
  const onLeave = () => {
    cancelAnimationFrame(raf)
    el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)'
    el.style.transform = origTransform || ''
  }
  el.addEventListener('pointerenter', onMove)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  return () => {
    cancelAnimationFrame(raf)
    el.removeEventListener('pointerenter', onMove)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    el.style.transform = origTransform
    el.style.transition = origTransition
  }
}

function applyReactiveCard(card: HTMLElement, glow = 'rgba(23,19,26,.55)'): () => void {
  // Inject decor (glare + sheen) inside the card.
  const cs = getComputedStyle(card)
  if (cs.position === 'static') card.style.position = 'relative'
  const decor = document.createElement('div')
  decor.setAttribute('aria-hidden', 'true')
  decor.style.cssText =
    'position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:2'
  const glare = document.createElement('div')
  glare.style.cssText =
    'position:absolute;inset:0;mix-blend-mode:screen;opacity:0;transition:opacity .35s ease'
  const sheen = document.createElement('div')
  sheen.style.cssText =
    'position:absolute;top:0;bottom:0;width:55%;left:-70%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-16deg)'
  decor.appendChild(glare)
  decor.appendChild(sheen)
  card.appendChild(decor)

  const origShadow = card.style.boxShadow
  const origTransform = card.style.transform
  const origTransition = card.style.transition
  let raf = 0

  const setTilt = (px: number, py: number) => {
    const rx = (0.5 - py) * 11
    const ry = (px - 0.5) * 13
    card.style.transition = 'transform 0s'
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-7px) scale(1.02)`
    glare.style.background = `radial-gradient(280px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,.22), transparent 58%)`
  }
  const onMove = (e: PointerEvent) => {
    const rect = card.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => setTilt(px, py))
  }
  const onEnter = (e: PointerEvent) => {
    card.style.boxShadow = `0 24px 54px -24px rgba(0,0,0,.35), 0 0 30px -10px ${glow}`
    glare.style.opacity = '1'
    sheen.style.animation = 'none'
    void sheen.offsetWidth
    sheen.style.animation = 'mo-card-sheen .9s ease'
    onMove(e)
  }
  const onLeave = () => {
    cancelAnimationFrame(raf)
    card.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1), box-shadow .35s ease'
    card.style.transform = origTransform || ''
    card.style.boxShadow = origShadow
    glare.style.opacity = '0'
  }
  card.addEventListener('pointerenter', onEnter)
  card.addEventListener('pointermove', onMove)
  card.addEventListener('pointerleave', onLeave)
  return () => {
    cancelAnimationFrame(raf)
    card.removeEventListener('pointerenter', onEnter)
    card.removeEventListener('pointermove', onMove)
    card.removeEventListener('pointerleave', onLeave)
    card.style.transform = origTransform
    card.style.boxShadow = origShadow
    card.style.transition = origTransition
    decor.remove()
  }
}

function applyCardRise(el: HTMLElement, io: IntersectionObserver): void {
  el.classList.add('home-tile-rise')
  io.observe(el)
}

/** Mount motion (magnetic pills, reactive tiles, once-per-view rise) onto
 * elements inside `root`. Returns disposer. Respects reduced-motion / touch. */
export function mountHomeMotion(root: HTMLElement): () => void {
  if (typeof window === 'undefined') return () => {}
  const reduce = isReduce()
  const coarse = isCoarse()
  const disposers: Array<() => void> = []

  // One-shot card rise reveal (safe on touch; disabled by reduced motion via CSS).
  const io = new IntersectionObserver(
    (ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          ;(en.target as HTMLElement).classList.add('in')
          io.unobserve(en.target)
        }
      })
    },
    { threshold: 0.15 }
  )
  disposers.push(() => io.disconnect())

  const tiles = Array.from(root.querySelectorAll<HTMLElement>('[data-strip] > a'))
  tiles.forEach((t) => applyCardRise(t, io))

  if (reduce) return () => disposers.forEach((d) => d())

  if (!coarse) {
    // Magnetic pills (factor 0.22).
    Array.from(root.querySelectorAll<HTMLElement>('[data-mag]')).forEach((el) => {
      disposers.push(applyMagnetic(el, 0.22))
    })
    // Reactive card physics on rooms-strip tiles.
    tiles.forEach((t) => disposers.push(applyReactiveCard(t, 'rgba(23,19,26,.45)')))
  }

  return () => disposers.forEach((d) => d())
}
