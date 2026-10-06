// Topic metadata for the legacy /vent/:topic URLs. The slug stays for
// indexed URLs; visible copy is about turning the topic into jokes.
// Categories mirror the values in the seed rooms (family, work, romance,
// friendship, parenting, money, roommates, stranger). No invented stats.

export type VentTopic = {
  slug: string
  label: string
  h1: string
  intro: string
  topicQuestion: { q: string; a: string }
}

export const VENT_TOPICS: VentTopic[] = [
  {
    slug: 'family',
    label: 'family',
    h1: 'Jokes about family.',
    intro:
      "Family is great material. Everyone has a role, nobody agreed to it, and the same argument comes back every holiday. Paste what happened and Shutap writes the jokes.",
    topicQuestion: {
      q: 'Can I joke about my family without them finding out?',
      a: "Yes. You post under a pseudonym, and names and places are removed before anything is saved. The jokes go at the situation, never at a real person someone could identify.",
    },
  },
  {
    slug: 'work',
    label: 'work',
    h1: 'Jokes about work.',
    intro:
      'Meetings that could have been an email, reply-all, the job you\u2019re supposed to be grateful for. Work runs on rules nobody believes in, which is why it\u2019s funny. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Can my employer trace a joke back to me?',
      a: 'Names, company names and places are removed before anything is saved, and you post under a pseudonym. Nothing is public unless you post it to a room.',
    },
  },
  {
    slug: 'romance',
    label: 'dating',
    h1: 'Jokes about dating.',
    intro:
      'Situationships, the three-day text gap, the date who brought a business plan. Dating is two people performing for each other, and the seams show. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Will the jokes be about my ex?',
      a: 'They\u2019re about the situation, never a real person someone could identify. Names are removed before anything is saved, so the joke works for anyone who\u2019s been there.',
    },
  },
  {
    slug: 'friendship',
    label: 'friendship',
    h1: 'Jokes about friendship.',
    intro:
      'The group chat that went quiet, the friend who only calls when they need a ride, the fade-out nobody announced. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Is a friend thing too small to joke about?',
      a: 'No. Small and specific is where jokes come from. The more detail you paste, the sharper the jokes get.',
    },
  },
  {
    slug: 'parenting',
    label: 'parenting',
    h1: 'Jokes about parenting.',
    intro:
      'The negotiation over one sock, the pickup-line politics, the toddler who runs the house. Parenting is a job with a boss who can\u2019t read. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Can I joke about my kids here?',
      a: 'Joke about the situation: the bedtime standoff, the school email, the snack economy. Names are removed before anything is saved, and jokes never target a real person someone could identify.',
    },
  },
  {
    slug: 'money',
    label: 'money',
    h1: 'Jokes about money.',
    intro:
      'The subscription you forgot, the friend who borrowed and forgot, the rent that went up for "market reasons." Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Will Shutap give me money advice?',
      a: 'No. Shutap writes jokes. It is not financial advice and not therapy.',
    },
  },
  {
    slug: 'roommates',
    label: 'roommates',
    h1: 'Jokes about roommates.',
    intro:
      'The passive note on the fridge, the dish that has lived in the sink since spring, the person you share a lease with and avoid in the hallway. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Can I post a roommate joke without starting a fight at home?',
      a: 'Names and places are removed before anything is saved, and you post under a pseudonym. Keep it private, download it, or post the best one to a room.',
    },
  },
  {
    slug: 'stranger',
    label: 'strangers',
    h1: 'Jokes about strangers.',
    intro:
      'The guy on the train taking a speakerphone call, the person who reclined into your lap, the barista who spelled your name like a ransom note. Paste what happened and Shutap writes the jokes.',
    topicQuestion: {
      q: 'Is a two-minute encounter enough material?',
      a: 'Usually. Strangers are easy to write about because nobody knows who they are. Paste the details and Shutap does the rest.',
    },
  },
]

export function findVentTopic(slug: string): VentTopic | undefined {
  return VENT_TOPICS.find((t) => t.slug === slug)
}
