// Home FAQ: a short list. Answers come from the shared FAQ (lib/seo/faq.ts) so
// they are always identical to /faq; the full list lives there.
// Also feeds the FAQPage JSON-LD in routes/index.tsx.
import { FAQ_ITEMS } from '@/lib/seo/faq'

const HOME_QUESTIONS = [
  'What is Shutap?',
  "What is Shutap's goal?",
  'Will Shutap steal my jokes or ideas?',
  "Does Shutap steal or plagiarize other people's jokes?",
  'Does anyone at Shutap read what I write?',
  "Isn't using AI for comedy a shortcut?",
  'Is Shutap a free joke generator?',
  'How is Shutap different from other AI joke generators?',
  'Can comedians use Shutap to write stand-up?',
  'What is Shutap Enterprise?',
  'Is my real name on anything?',
]

export const HOME_FAQ: Array<{ q: string; a: string }> = HOME_QUESTIONS.flatMap((q) => {
  const f = FAQ_ITEMS.find((i) => i.heading === q)
  return f ? [{ q: f.heading, a: f.body }] : []
})
