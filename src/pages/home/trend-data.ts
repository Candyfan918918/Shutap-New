import type { SignalTopic } from '@/lib/daily-idea.functions'

export function rankTopics(topics: SignalTopic[]): SignalTopic[] {
  return [...topics].sort((a, b) => Number(Boolean(b.chosen)) - Number(Boolean(a.chosen)) || Number(b.direction === 'rising') - Number(a.direction === 'rising') || (b.interest?.change ?? -Infinity) - (a.interest?.change ?? -Infinity))
}

export function momentum(change: number | null | undefined): number {
  return change == null ? 0 : Math.min(100, Math.abs(change))
}