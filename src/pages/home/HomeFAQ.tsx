// Home FAQ copy. Same questions as /faq (single source in lib/seo/faq.ts).
// Also feeds the FAQPage JSON-LD in routes/index.tsx.
import { FAQ_ITEMS } from '@/lib/seo/faq'

export const HOME_FAQ: Array<{ q: string; a: string }> = FAQ_ITEMS.map((f) => ({
  q: f.heading,
  a: f.body,
}))
