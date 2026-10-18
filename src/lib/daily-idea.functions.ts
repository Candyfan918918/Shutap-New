// Public server fn: today's "what to post" idea for the homepage.
// Same pattern as listNewestRooms — read-only, service role, plain DTO out.
import { createServerFn } from '@tanstack/react-start'

export type DailyIdea = {
  day: string
  topic: string
  hook: string
  bit: string
  tag: string
  why_now: string | null
  signals: DailySignals | null
}

export type Platform = 'news' | 'tiktok' | 'instagram' | 'youtube' | 'x' | 'reddit'
export type Heat = 0 | 1 | 2 | 3
export type SignalTopic = {
  topic: string
  chosen?: boolean
  direction?: 'rising' | 'peaking' | 'steady' | 'cooling'
  note?: string
  heat?: Partial<Record<Platform, Heat>>
  sources?: { label: string; url: string }[]
}
export type DailySignals = {
  platforms?: Platform[]
  topics?: SignalTopic[]
  read_at?: string
}

function pacificToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export const listDailyIdea = createServerFn({ method: 'GET' }).handler(async (): Promise<DailyIdea | null> => {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    // Exact day first; otherwise the latest row before today.
    const { data, error } = await supabaseAdmin
      .from('daily_ideas')
      .select('day, topic, hook, bit, tag, why_now, signals')
      .lte('day', pacificToday())
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    return data as unknown as DailyIdea
  } catch {
    return null
  }
})
