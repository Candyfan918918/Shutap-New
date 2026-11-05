// Prod smoke test (Nov 5 2026): sign in as the smoke account and write one
// real bit on shutap.com, the way a person would. Fails loudly if the box,
// the write or the result is broken. Candy's rule: "always run a real test
// bit generation after any Shutap change" — this is that, automated.
//
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY,
// SMOKE_EMAIL (a dedicated account; its browser is headless, which the site
// already counts as internal, and every event it sends carries smoke:true).
// Optional: SMOKE_BASE (default https://shutap.com).
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`missing ${k}`); process.exit(2) } return v }
const URL = need('SUPABASE_URL'), SERVICE = need('SUPABASE_SERVICE_ROLE_KEY'), ANON = need('SUPABASE_PUBLISHABLE_KEY'), EMAIL = need('SMOKE_EMAIL')
const BASE = process.env.SMOKE_BASE || 'https://shutap.com'
const ref = new globalThis.URL(URL).hostname.split('.')[0]

async function session() {
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
  if (error) throw new Error(`generateLink: ${error.message}`)
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const v = await anon.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (v.error || !v.data.session) throw new Error(`verifyOtp: ${v.error?.message ?? 'no session'}`)
  return v.data.session
}

const story = `smoke test ${new Date().toISOString().slice(0, 16)}: my neighbor asked me to water his plants and left a 14-page document about each one`
const t0 = Date.now()
const s = await session()
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } })
await ctx.addInitScript(([key, val]) => { localStorage.setItem(key, val); localStorage.setItem('shutap_smoke', '1') }, [`sb-${ref}-auth-token`, JSON.stringify(s)])
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
try {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#bit-story', { timeout: 20000 })
  await page.fill('#bit-story', story)
  await page.click('button.bt-go')
  await page.waitForSelector('.bt-v.hook', { timeout: 90000 })
  const hook = (await page.textContent('.bt-v.hook'))?.trim()
  if (!hook || hook.length < 8) throw new Error(`no hook: "${hook}"`)
  const tags = await page.$$eval('.bt-slot .bt-v', (els) => els.length)
  console.log(`ok · ${Math.round((Date.now() - t0) / 1000)}s · hook: ${hook} · ${tags} slots`)
  if (errors.length) console.log('page errors:', errors.slice(0, 5))
} catch (e) {
  await page.screenshot({ path: 'smoke-failure.png', fullPage: true }).catch(() => {})
  console.error('FAIL:', e instanceof Error ? e.message : e)
  if (errors.length) console.error('page errors:', errors.slice(0, 5))
  process.exitCode = 1
} finally {
  await b.close()
}
