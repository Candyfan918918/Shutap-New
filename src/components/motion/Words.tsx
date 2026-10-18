import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useReducedMotion } from './useReducedMotion'
import './motion.css'

type WordsProps = {
  children: ReactNode
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  style?: CSSProperties
  stagger?: number
}

// useLayoutEffect writes a warning on the server; fall back to useEffect there.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** Walk the tree, replacing string leaves with word spans. Whitespace kept.
 * Nested elements (<em>, gradient spans, etc.) are preserved with their
 * styling — we recurse into their children. */
function splitNode(node: ReactNode, stagger: number, counter: { n: number }): ReactNode {
  if (node === null || node === undefined || typeof node === 'boolean') return node
  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node)
    const parts = text.split(/(\s+)/)
    return parts.map((p, i) => {
      if (p === '') return null
      if (/^\s+$/.test(p)) return <React.Fragment key={'s' + i}>{p}</React.Fragment>
      const idx = counter.n++
      return (
        <span
          key={'w' + idx}
          className="mo-word"
          style={{ transitionDelay: `${idx * stagger}ms` }}
        >
          {p}
        </span>
      )
    })
  }
  if (Array.isArray(node)) {
    return Children.map(node, (c, i) => (
      <React.Fragment key={i}>{splitNode(c, stagger, counter)}</React.Fragment>
    ))
  }
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: ReactNode }>
    return cloneElement(el, undefined, splitNode(el.props.children, stagger, counter))
  }
  return node
}

function flatten(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(flatten).join('')
  if (isValidElement(n)) {
    const el = n as React.ReactElement<{ children?: ReactNode }>
    return flatten(el.props.children)
  }
  return ''
}

/** Word-by-word spring reveal for a heading. Pass-through wrapper — the
 * rendered element uses `as` (default 'span') so a wrapped H1 stays an H1. */
export function Words({ children, as, className, style, stagger }: WordsProps) {
  const wordStagger = stagger ?? 15
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [inView, setInView] = useState(false)
  const Tag = (as || 'span') as keyof React.JSX.IntrinsicElements
  // Page titles stay visible through hydration and scrolling; replaying a
  // reveal makes the whole page appear to reload.
  const staticHeading = Tag === 'h1'

  // useLayoutEffect flips to 'hidden' before the browser paints, so the
  // hidden state paints at least once before the observer flips to 'in'.
  useIsoLayoutEffect(() => {
    if (!staticHeading) setMounted(true)
  }, [staticHeading])

  useEffect(() => {
    if (reduce || staticHeading) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e) return
        if (e.isIntersecting) {
          // Double-rAF: guarantee one paint of the hidden state before we
          // flip to 'in' so the CSS transition actually runs.
          requestAnimationFrame(() => requestAnimationFrame(() => setInView(true)))
        } else {
          setInView(false)
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce, staticHeading])

  const label = useMemo(() => flatten(children).replace(/\s+/g, ' ').trim(), [children])

  if (reduce || staticHeading) {
    return React.createElement(Tag, { className, style, ref }, children)
  }

  const stateClass = !mounted
    ? 'mo-words-idle'
    : (inView ? 'mo-words-in' : 'mo-words-hidden')
  const cls = ['mo-words', stateClass, className].filter(Boolean).join(' ')

  return React.createElement(
    Tag,
    { className: cls, style, ref, 'aria-label': label || undefined },
    splitNode(children, wordStagger, { n: 0 }),
  )
}
