// User + behavior tracking server functions.
// All three are called optionally-authenticated: if the client sends a
// bearer token we upsert profile info; otherwise we still record the
// visit/event with a null user_id. Insert always goes through the service
// role so RLS never rejects a legitimate ping.
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_')
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    )
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value))
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization')
    }
    headers.set('apikey', supabaseKey)
    return fetch(input, { ...init, headers })
  }
}

async function readUserFromRequest(): Promise<{ userId: string | null; token: string | null }> {
  const req = getRequest()
  const authHeader = req?.headers.get('authorization') || null
  if (!authHeader?.startsWith('Bearer ')) return { userId: null, token: null }
  const token = authHeader.slice(7)
  if (token.split('.').length !== 3) return { userId: null, token: null }
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return { userId: null, token }
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getClaims(token)
    if (error || !data?.claims?.sub) return { userId: null, token }
    return { userId: data.claims.sub, token }
  } catch {
    return { userId: null, token }
  }
}


// Tracking must never break a page render: if the service-role client is not
// configured, silently skip instead of throwing.
async function adminOrNull() {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    // Touch a property so the lazy proxy validates env now, inside this try.
    void supabaseAdmin.from
    return supabaseAdmin
  } catch (e) {
    console.error('[tracking] admin client unavailable:', e)
    return null
  }
}


function extractGeo(): { country: string | null; city: string | null; userAgent: string | null } {
  const req = getRequest()
  const h = req?.headers
  if (!h) return { country: null, city: null, userAgent: null }
  const country = h.get('cf-ipcountry') || h.get('x-vercel-ip-country') || h.get('x-country') || null
  const city = h.get('cf-ipcity') || h.get('x-vercel-ip-city') || h.get('x-city') || null
  const userAgent = h.get('user-agent') || null
  return {
    country: country && country !== 'XX' ? country : null,
    city: city ? decodeURIComponent(city) : null,
    userAgent,
  }
}

// ---------- profiles ----------

const ProfileIn = z.object({
  email: z.string().email().nullable().optional(),
  first_name: z.string().max(80).nullable().optional(),
  last_name: z.string().max(80).nullable().optional(),
  full_name: z.string().max(160).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  provider: z.string().max(40).nullable().optional(),
  is_anonymous: z.boolean().optional(),
  login: z.boolean().optional(),
})

export const upsertMyProfile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => ProfileIn.parse(d))
  .handler(async ({ data }) => {
    const { userId } = await readUserFromRequest()
    if (!userId) return { ok: false, reason: 'no_auth' as const }
    const supabaseAdmin = await adminOrNull()
    if (!supabaseAdmin) return { ok: false, reason: 'tracking_unavailable' as const }
    const geo = extractGeo()
    const now = new Date().toISOString()
    const existing = await supabaseAdmin
      .from('profiles')
      .select('user_id, first_visit_at, visit_count, first_name, last_name, full_name, avatar_url, email, login_count, signup_at')
      .eq('user_id', userId)
      .maybeSingle()
    const prev = existing.data as {
      first_visit_at?: string; visit_count?: number;
      first_name?: string | null; last_name?: string | null;
      full_name?: string | null; avatar_url?: string | null; email?: string | null;
      login_count?: number | null; signup_at?: string | null;
    } | null
    const merge = <T,>(next: T | null | undefined, prev: T | null | undefined): T | null | undefined =>
      next ?? prev
    const isLogin = data.login === true && data.is_anonymous !== true
    const row = {
      user_id: userId,
      email: merge(data.email, prev?.email),
      first_name: merge(data.first_name, prev?.first_name),
      last_name: merge(data.last_name, prev?.last_name),
      full_name: merge(data.full_name, prev?.full_name),
      avatar_url: merge(data.avatar_url, prev?.avatar_url),
      provider: data.provider ?? null,
      is_anonymous: data.is_anonymous ?? false,
      signup_at: prev?.signup_at ?? now,
      first_visit_at: prev?.first_visit_at ?? now,
      last_visit_at: now,
      visit_count: (prev?.visit_count ?? 0) + 1,
      last_country: geo.country,
      last_city: geo.city,
      last_user_agent: geo.userAgent,
      updated_at: now,
      ...(isLogin
        ? { last_login_at: now, login_count: (prev?.login_count ?? 0) + 1 }
        : {}),
    }
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(row as never, { onConflict: 'user_id' })
    if (error) return { ok: false, reason: error.message }
    return { ok: true, geo }
  })

// ---------- visits ----------

const VisitIn = z.object({
  session_id: z.string().min(1).max(120),
  path: z.string().max(500).optional(),
  referrer: z.string().max(1000).optional(),
  utm_source: z.string().max(120).optional().nullable(),
  utm_medium: z.string().max(120).optional().nullable(),
  utm_campaign: z.string().max(200).optional().nullable(),
  utm_term: z.string().max(200).optional().nullable(),
  utm_content: z.string().max(200).optional().nullable(),
  landing_path: z.string().max(500).optional().nullable(),
})

export const recordVisit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => VisitIn.parse(d))
  .handler(async ({ data }) => {
    const { userId } = await readUserFromRequest()
    const supabaseAdmin = await adminOrNull()
    if (!supabaseAdmin) return { ok: false, reason: 'tracking_unavailable' as const }
    const geo = extractGeo()
    let isRevisit = false
    if (userId) {
      const prior = await supabaseAdmin
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      isRevisit = (prior.count ?? 0) > 0
    } else {
      const prior = await supabaseAdmin
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', data.session_id)
      isRevisit = (prior.count ?? 0) > 0
    }
    const { error } = await supabaseAdmin.from('visits').insert({
      user_id: userId,
      session_id: data.session_id,
      path: data.path ?? null,
      referrer: data.referrer ?? null,
      user_agent: geo.userAgent,
      country: geo.country,
      city: geo.city,
      is_revisit: isRevisit,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
      utm_term: data.utm_term ?? null,
      utm_content: data.utm_content ?? null,
      landing_path: data.landing_path ?? null,
    } as never)
    if (error) return { ok: false, reason: error.message }
    return { ok: true, geo, isRevisit }
  })


// ---------- events ----------

const EventIn = z.object({
  session_id: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(80),
  properties: z.record(z.string(), z.unknown()).optional(),
})

export const trackEventFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => EventIn.parse(d))
  .handler(async ({ data }) => {
    const { userId } = await readUserFromRequest()
    const supabaseAdmin = await adminOrNull()
    if (!supabaseAdmin) return { ok: false, reason: 'tracking_unavailable' as const }
    const { error } = await supabaseAdmin.from('events').insert({
      user_id: userId,
      session_id: data.session_id ?? null,
      name: data.name,
      properties: (data.properties ?? {}) as never,
    } as never)
    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  })
