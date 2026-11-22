// Shutap for small business: "Your videos can mention" suggested from the
// business's own listing (Nov 21 2026). Pure: the check that a suggestion
// really is in the text it came from. Nothing is ever suggested that the
// listing or its reviews did not say, and the owner removes what is wrong
// before anything is saved.
const STOP = new Set(['the', 'and', 'with', 'for', 'our', 'their', 'your', 'very', 'really', 'best', 'great', 'good', 'nice', 'amazing', 'delicious', 'favorite', 'favourite', 'place', 'spot', 'here', 'this', 'that'])

/** "boxes" and "box", "lattes" and "latte" count as the same word */
const stem = (w: string) => w.replace(/(?<=[sxz]|ch|sh)es$/, '').replace(/(?<!s)s$/, '')
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) ?? []

/** Keep only suggestions whose every meaningful word is in the source text,
 *  short (1 to 4 words, 40 characters), with no price, and not twice. */
export function groundedChips(items: unknown, source: string, max = 8): string[] {
  if (!Array.isArray(items)) return []
  const have = new Set(words(source).map(stem))
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    if (typeof raw !== 'string') continue
    const chip = raw.trim().replace(/\s+/g, ' ').replace(/[.!,;:]+$/, '')
    const w = words(chip)
    const key = w.join(' ')
    if (!chip || chip.length > 40 || w.length < 1 || w.length > 4 || /[$£€%]|\d{3,}/.test(chip) || seen.has(key)) continue
    const real = w.filter((x) => x.length > 2 && !STOP.has(x))
    if (!real.length || !real.every((x) => have.has(stem(x)))) continue
    seen.add(key)
    out.push(chip)
    if (out.length >= max) break
  }
  return out
}
