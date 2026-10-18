import baseFn from './vite.config'
import { mkdirSync, writeFileSync } from 'node:fs'
mkdirSync('/tmp/chunkdump', { recursive: true })
const dump: any = {
  name: 'dump-chunks',
  renderChunk(code: string, chunk: any) {
    try { writeFileSync(`/tmp/chunkdump/${chunk.name}.js`, code) } catch {}
    return null
  },
}
export default (async (env: any = {}) => {
  const b: any = baseFn as any
  const cfg = typeof b === 'function' ? (b.default ?? b)(env) : b
  const resolved = cfg && cfg.then ? await cfg : cfg
  const inner: any = (resolved.vite ?? resolved) as any
  if (inner && Array.isArray(inner.plugins)) {
    return { ...resolved, vite: { ...inner, plugins: [...inner.plugins, dump] } }
  }
  return { ...resolved, plugins: [...(resolved.plugins ?? []), dump] }
}) as any
