// The writer on a guide or funniest page speaks in the page's words, not
// the homepage's (Oct 30 2026): a reader of the best-man guide has a speech
// to write, not "a story".
import type { GuideTopic } from '@/lib/seo/guides'

export type WriterCopy = { heading: string; sub: string; placeholder: string }

const DEFAULT: WriterCopy = {
  heading: 'Try it on your own story.',
  sub: 'Type what happened. Get the video, the caption, the bit. Right here, free.',
  placeholder: 'what happened, the way you\'d tell your funniest friend…',
}

const BY_CATEGORY: Partial<Record<GuideTopic, WriterCopy>> = {
  'jokes-for-occasions': {
    heading: 'Write your toast, card or speech here.',
    sub: 'Who it\'s for and the one story everyone already knows. Get the lines, the caption, the video. Free.',
    placeholder: 'who it\'s for, and the story about them everyone already knows…',
  },
  roasts: {
    heading: 'Roast them here.',
    sub: 'Who, and the thing they do that everyone notices. The joke goes at the situation, never at you.',
    placeholder: 'who, and the thing they always do…',
  },
  'storytime-and-pov': {
    heading: 'Write your next video here.',
    sub: 'What happened this week. Get the hook, the tags, the 5-second video and the caption. Free.',
    placeholder: 'what happened this week that you\'d tell on camera…',
  },
  'skits-and-sketches': {
    heading: 'Write your next video here.',
    sub: 'What happened this week. Get the hook, the tags, the 5-second video and the caption. Free.',
    placeholder: 'the moment that would make a sketch…',
  },
  'finding-ideas': {
    heading: 'Start with what actually happened.',
    sub: 'One true thing from your week is a better idea than any list. Type it; get the bit, the video, the caption.',
    placeholder: 'the most annoying thing that happened this week…',
  },
  'growing-views': {
    heading: 'Write the one you\'ll post today.',
    sub: 'What happened. Get the hook for the first two seconds, the tags, the video and the caption. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'watch-time': {
    heading: 'Write the one you\'ll post today.',
    sub: 'What happened. Get the hook for the first two seconds, the tags, the video and the caption. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'comedy-creators': {
    heading: 'Write the one you\'ll post today.',
    sub: 'What happened. Get the hook, the tags, the video and the caption. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'stand-up': {
    heading: 'Try it on your own material.',
    sub: 'Type the bit of life you keep telling at the table. Get it as a hook, setup, tags and button, timed at talking pace.',
    placeholder: 'the thing you keep telling people, in your words…',
  },
  'using-shutap': { heading: 'Write one now.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
  'shutap-vs-other-tools': { heading: 'Try it before you compare.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
  'ai-writing-partner': { heading: 'Try it on your own story.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
}

export function writerCopyFor(category: GuideTopic | undefined): WriterCopy {
  return (category && BY_CATEGORY[category]) || DEFAULT
}

/** The funniest pages: the technique is the hook. */
export const FUNNIEST_WRITER: WriterCopy = {
  heading: 'Try the move on your own story.',
  sub: 'Same technique, your material. Get the video, the caption, the bit. Right here, free.',
  placeholder: 'what happened, the way you\'d tell your funniest friend…',
}
