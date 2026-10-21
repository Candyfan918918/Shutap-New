// bun scripts/race-writers.test.ts — exercises the hedged writer with fake models.
import { raceWriters } from '../src/lib/bits/pipeline.server'

type P = { bits: unknown[]; error?: string; model: string }
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms)
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('cancelled')) })
  })

// behaviour per model: [delayMs, result]
function fake(spec: Record<string, [number, 'ok' | 'empty' | 'timeout']>) {
  const calls: string[] = []
  const run = async (leg: { model: string; timeoutMs: number }, signal: AbortSignal): Promise<P> => {
    calls.push(leg.model)
    const [delay, kind] = spec[leg.model]!
    try {
      await sleep(Math.min(delay, leg.timeoutMs), signal)
    } catch {
      return { bits: [], error: 'cancelled', model: leg.model }
    }
    if (kind === 'timeout' || delay > leg.timeoutMs) return { bits: [], error: `timed out after ${leg.timeoutMs}ms`, model: leg.model }
    return { bits: kind === 'ok' ? [1] : [], model: leg.model, ...(kind === 'empty' ? { error: 'no bits parsed' } : {}) }
  }
  return { run, calls }
}

const base = {
  primary: { model: 'P', leg: 'primary' as const, timeoutMs: 300 },
  backup: { model: 'B', leg: 'backup' as const, timeoutMs: 220 },
  hedgeMs: 90,
  deadlineMs: 2000,
  usable: (p: P) => p.bits.length > 0,
}
let failed = 0
async function check(name: string, spec: Record<string, [number, 'ok' | 'empty' | 'timeout']>, want: string | null, maxMs: number, over: Partial<typeof base> = {}) {
  const f = fake(spec)
  const t = Date.now()
  const r = await raceWriters<P>({ ...base, ...over, run: f.run })
  const ms = Date.now() - t
  const got = r.winner?.model ?? null
  const pass = got === want && ms <= maxMs
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: winner=${got} want=${want} ${ms}ms (max ${maxMs}) calls=${f.calls.join(',')} attempts=${JSON.stringify(r.attempts.map((a) => [a.leg, a.error ?? 'ok']))}`)
}

await check('fast primary wins, no backup', { P: [30, 'ok'], B: [10, 'ok'] }, 'P', 80)
await check('slow primary (today\'s bug) → backup wins', { P: [5000, 'timeout'], B: [50, 'ok'] }, 'B', 200)
await check('primary slow but beats backup', { P: [120, 'ok'], B: [200, 'ok'] }, 'P', 160)
await check('primary fails early → backup starts at once', { P: [10, 'empty'], B: [40, 'ok'] }, 'B', 90)
await check('both bad quickly → last try on backup', { P: [10, 'empty'], B: [20, 'empty'] }, null, 400)
await check('both time out → null, bounded', { P: [5000, 'timeout'], B: [5000, 'timeout'] }, null, 2100)
{
  // last try: backup returns junk once, then a bit
  let n = 0
  const t = Date.now()
  const r = await raceWriters<P>({
    ...base,
    deadlineMs: 60_000,
    run: async (leg) => {
      await sleep(10)
      if (leg.model === 'P') return { bits: [], error: 'no bits parsed', model: 'P' }
      return ++n === 1 ? { bits: [], error: 'no bits parsed', model: 'B' } : { bits: [1], model: 'B' }
    },
  })
  const pass = r.winner?.model === 'B' && r.attempts.at(-1)?.leg === 'last'
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'} last try rescues: ${Date.now() - t}ms attempts=${JSON.stringify(r.attempts.map((a) => [a.leg, a.error ?? 'ok']))}`)
}
process.exit(failed ? 1 : 0)
