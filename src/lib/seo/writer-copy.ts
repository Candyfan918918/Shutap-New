// The writer on a guide or funniest page speaks in the page's words, not
// the homepage's (Oct 30 2026): a reader of the best-man guide has a speech
// to write, not "a story".
import type { GuideTopic } from '@/lib/seo/guides'

export type WriterCopy = { heading: string; sub: string; placeholder: string }

const DEFAULT: WriterCopy = {
  heading: 'Try it on what you want to say.',
  sub: 'Tell it your way; Shutap cuts it into a bit, every word yours. Tap funnier where you’re stuck. Get the video, stand-up, sketch and skit. Free.',
  placeholder: 'a post, a speech, a toast, a slide: what do you want to say funnier?',
}

const BY_CATEGORY: Partial<Record<GuideTopic, WriterCopy>> = {
  'jokes-for-occasions': {
    heading: 'Write your toast, card or speech here.',
    sub: 'Who it\'s for and the story everyone already knows, in your words. Tap funnier where you\'re stuck. Free.',
    placeholder: 'who it\'s for, and the story about them everyone already knows…',
  },
  'toasts-and-speeches': {
    heading: 'Write your toast here.',
    sub: 'Who it\'s for and the story about them, in your words. Tap funnier where you\'re stuck. Free.',
    placeholder: 'who it\'s for, and the story about them everyone already knows…',
  },
  'presentations-and-work': {
    heading: 'Write your next talk here.',
    sub: 'The room you\'re speaking to and the thing that happened at work, in your words. Tap funnier where you\'re stuck. Free.',
    placeholder: 'the meeting, the training, the room you\'re speaking to…',
  },
  roasts: {
    heading: 'Roast them here.',
    sub: 'Who, and the thing they do that everyone notices. The joke goes at the situation, never at you.',
    placeholder: 'who, and the thing they always do…',
  },
  'storytime-and-pov': {
    heading: 'Write your next video here.',
    sub: 'What happened this week, told your way. Tap funnier where you\'re stuck; get the 5-second video. Free.',
    placeholder: 'what happened this week that you\'d tell on camera…',
  },
  'skits-and-sketches': {
    heading: 'Write your next video here.',
    sub: 'What happened this week, told your way. Tap funnier where you\'re stuck; get the 5-second video. Free.',
    placeholder: 'the moment that would make a sketch…',
  },
  'finding-ideas': {
    heading: 'Start with what actually happened.',
    sub: 'One true thing from your week is a better idea than any list. Tell it your way; get the video.',
    placeholder: 'the most annoying thing that happened this week…',
  },
  'growing-views': {
    heading: 'Write the one you\'ll post today.',
    sub: 'Your hook for the first two seconds, then the setup, tags and button, in your words. Get the video. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'watch-time': {
    heading: 'Write the one you\'ll post today.',
    sub: 'Your hook for the first two seconds, then the setup, tags and button, in your words. Get the video. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'comedy-creators': {
    heading: 'Write the one you\'ll post today.',
    sub: 'Your hook, setup, tags and button, in your words. Tap funnier where you\'re stuck; get the video. Free.',
    placeholder: 'what happened, the way you\'d tell a friend…',
  },
  'stand-up': {
    heading: 'Try it on your own material.',
    sub: 'Write the bit you keep telling at the table as a hook, setup, two tags and a button. Rehearse it on the prompter, with cues for the beats and the pauses.',
    placeholder: 'the thing you keep telling people, in your words…',
  },
  'using-shutap': { heading: 'Write one now.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
  'shutap-vs-other-tools': { heading: 'Try it before you compare.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
  'ai-writing-partner': { heading: 'Try it on what you want to say.', sub: DEFAULT.sub, placeholder: DEFAULT.placeholder },
}

export function writerCopyFor(category: GuideTopic | undefined): WriterCopy {
  return (category && BY_CATEGORY[category]) || DEFAULT
}

/** The funniest pages: the technique is the hook. */
export const FUNNIEST_WRITER: WriterCopy = {
  heading: 'Try the move on your own material.',
  sub: 'Same technique, your material: tell it your way, tap funnier where you\'re stuck. Free.',
  placeholder: 'a post, a speech, a toast, a slide: what do you want to say funnier?',
}
