import type { Reaction, Room } from './types'
import { SHUTAP_SEED } from './seed'

/* The 5 supportive reactions (k / emoji / label / color), verbatim from the
   Stream prototype's REACTIONS getter. */
export const REACTIONS: Reaction[] = [
  { k: 'heard', emoji: '🤍', label: 'i hear you', color: '#2b2630' },
  { k: 'same', emoji: '🫂', label: 'omg same', color: '#c87c4a' },
  { k: 'strong', emoji: '💪', label: "you've got this", color: '#5B8A5E' },
  { k: 'time', emoji: '🌿', label: 'it gets easier', color: '#7F77DD' },
  { k: 'brave', emoji: '✨', label: 'so brave', color: '#c1a02b' },
]

/* Companion nudge lines woven into the feed. */
export const NUDGES: string[] = [
  'something happened to you too. the room is open.',
  "three people just found their 'omg same' moment. wondering if yours is still out there.",
  "you've been reading for a while. is there something in here that's yours?",
  "the room doesn't ask you to be okay. it just asks you to say it out loud.",
]

/* Hardcoded fallback used when no seed is loaded — mirrors FALLBACK_ROOMS. */
export const FALLBACK_ROOMS: Room[] = [
  {
    id: '0',
    alias: 'Quiet Nigerian Swan',
    emoji: '🦢',
    title:
      "I told my mum I've been struggling for months. she cried and said she never knew.",
    support: 'heard',
    relates: 47,
    sitting: 18,
    hours: '2h',
    reactions: { heard: 55, same: 28, strong: 10, time: 5, brave: 2 },
    body:
      "I've been holding this for a long time. managing it, mostly. it gets hard in the evenings. last week I finally told her — sitting at her kitchen table, hands around tea, trying to find normal words for it. she went very quiet and then she cried. not out of pity. out of not knowing. that was somehow harder than anything.",
    reflection:
      'something about the way she said she never knew. that part is sitting with me too.',
    hall: 'healing',
  },
]

export function getRooms(): Room[] {
  const seeded = SHUTAP_SEED?.rooms
  return seeded && seeded.length ? seeded : FALLBACK_ROOMS
}
