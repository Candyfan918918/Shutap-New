import base from './vite.config'
import { mkdirSync, writeFileSync } from 'node:fs'
const anyBase: any = base as any
const inner: any = (anyBase.vite ?? anyBase) as any
mkdirSync('/tmp/chunkdump', { recursive: true })
const dump = {
  name: 'dump-chunks',
  renderChunk(code: string, chunk: any) {
    try { writeFileSync(`/tmp/chunkdump/${chunk.name}.js`, code) } catch {}
    return null
  },
}
export default {
  ...anyBase,
  vite: inner ? { ...inner, plugins: [...(inner.plugins ?? []), dump] } : undefined,
  plugins: inner ? undefined : [...(anyBase.plugins ?? []), dump],
}
