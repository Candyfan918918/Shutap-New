// Public server fn: today's "what to post" idea for the homepage.
// Same pattern as listNewestRooms — read-only, service role, plain DTO out.
import { createServerFn } from '@tanstack/react-start'
import type { Interest } from './wiki-interest.server'
export type { Interest } from './wiki-interest.server'

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
  heat?: Partial<Record<Platform, Heat | null>>
  wiki?: string
  interest?: Interest | null
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
    const idea = data as unknown as DailyIdea
    if (idea.signals?.topics?.length) {
      const { readWikiInterest } = await import('./wiki-interest.server')
      // Wikipedia gets 1.5s in total; a topic still waiting shows without
      // its interest line rather than holding the section (it stays cached,
      // so the next view usually has it).
      const capped = (wiki: string) =>
        Promise.race([
          readWikiInterest(wiki).catch(() => null),
          new Promise<null>((res) => setTimeout(() => res(null), 1500)),
        ])
      idea.signals = { ...idea.signals, topics: await Promise.all(idea.signals.topics.map(async (topic) => ({ ...topic, interest: topic.wiki ? await capped(topic.wiki) : null }))) }
    }
    return idea
  } catch {
    return null
  }
})
