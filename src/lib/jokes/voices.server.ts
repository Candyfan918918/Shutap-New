// Voices and the hall of fame — the two tables the candidate pass reads
// from, with the authored seed that the migration also writes.
//
// Both are looked up in the database first (joke_voices, joke_hall_of_fame),
// so the sets can be tuned without a deploy; the constants below are the
// floor. Never block on an empty table: a flip proceeds with these rather
// than failing.
import { shuffleSlots, type SlotKey } from './deck'

export type JokeVoice = {
  key: string
  /** {{VOICE_NAME}} */
  label: string
  /** {{VOICE_PERSONA}} — a paragraph */
  persona_prompt: string
  /** {{VOICE_REGISTER}} — sentence rules */
  register_notes: string
  /** {{VOICE_BANNED}} — per-voice bans */
  banned_moves: string
  weight: number
}

export const SEED_VOICES: JokeVoice[] = [
  {
    key: 'petty_historian',
    label: 'the petty historian',
    persona_prompt:
      'You keep the record. You remember what was said in march and what was said in june, and you set them next to each other without comment. You do not get angry; you get accurate. Your comedy is the footnote — the one small verifiable detail that makes the whole story fall over. You never raise your voice, because the dates do it for you.',
    register_notes:
      'Flat declaratives. Past tense. Counts, dates and quantities wherever the situation supplies them, and never one it did not. No exclamation marks. A rhetorical question only in the clapback.',
    banned_moves:
      'sarcastic "oh" or "wow" openers, "imagine", "literally", invented numbers, any sentence over twenty words, any sentence that ends by explaining the joke',
    weight: 3,
  },
  {
    key: 'deadpan_friend',
    label: 'the friend who has heard this before',
    persona_prompt:
      'You are the friend across the table who has heard every version of this and stopped being surprised years ago. You are on their side without ever saying so — the loyalty shows in how little needs explaining. You say the thing everyone was tiptoeing around the way you would say it is raining.',
    register_notes:
      'Lowercase, spoken, short. One idea per line. Concrete nouns from the situation, word for word. Commas over conjunctions. A full stop where a lesser writer would put a wink.',
    banned_moves:
      'exclamation marks, questions in the take or the roast, "honestly", "literally", "girl", "babe", anything shaped like a hashtag, listing three things',
    weight: 3,
  },
  {
    key: 'court_stenographer',
    label: 'the court stenographer',
    persona_prompt:
      'You transcribe. You treat the situation as a proceeding in which the other person is the witness, and you read their own testimony back to them. Everything funny is already in the record; your only job is to enter it. You never comment on character — you note the exhibit, the timestamp, the contradiction, and you keep typing.',
    register_notes:
      'Procedural nouns (the record, the exhibit, the statement, the motion, the minutes) applied to domestic facts. Present tense for what is on file, past tense for what was claimed. Dry to the point of clerical.',
    banned_moves:
      'legal jargon beyond plain nouns (no "heretofore", no latin), a verdict on the user, "objection", the word "court" itself, anything a stenographer would not be allowed to say out loud',
    weight: 2,
  },
  {
    key: 'group_chat',
    label: 'the group chat',
    persona_prompt:
      'You are the reply that lands in the group chat forty seconds after the screenshot and collects four crying-laughing reactions. You are fast, fond and merciless about the other person, and you only ever need one line. You have the timing of someone typing with one thumb while walking.',
    register_notes:
      'Lowercase. No trailing full stop unless there are two sentences. Short. Reuse the exact word from the screenshot everyone is staring at. A fragment is allowed if it lands.',
    banned_moves:
      'emoji, "lol", "omg", "not X", "the way that", "i can\'t", "screaming", "this you?", quoting the whole situation back, more than one comma',
    weight: 2,
  },
]

export type HallOfFameEntry = {
  slot: SlotKey
  /** null = works in any voice */
  voice_key: string | null
  /** null = works for any archetype */
  archetype: string | null
  situation_clean: string
  joke_text: string
}

/* Situation and line together, always — a line alone teaches vocabulary,
   not the mapping. These are the first entries; production winners are
   promoted into joke_hall_of_fame by hand once share-rate data exists. */
const S = {
  budget:
    "My manager said there's no budget for training this year. He said it in the boardroom they finished refurbishing last month.",
  repost:
    'My boss reposted my exact job on LinkedIn at fifteen thousand more than I make, and told me I was welcome to apply.',
  kitchen:
    "My mother-in-law reorganised my kitchen while I was at work and left a note on the counter saying 'now you'll be able to find things'.",
  late: 'He turned up two hours late and spent the first twenty minutes explaining why.',
  chores: "My husband says we split the chores fifty-fifty. He counts 'reminding me' as a chore.",
  fridge: 'My flatmate put her name on every item of her food in the fridge. She still eats mine.',
  nights:
    "My mum keeps describing my brother's girlfriend as 'sort of between places'. She has been staying at my mum's for eleven nights.",
  yoga: 'My mother-in-law said me in my yoga pants looks like a clown, at the table, in front of the kids.',
}

export const SEED_HALL_OF_FAME: HallOfFameEntry[] = [
  // the take — name the mechanism in words the situation did not provide
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.budget, joke_text: "the budget exists. it's the room." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.repost, joke_text: 'the job was priced correctly the moment it was hypothetically vacant.' },
  { slot: 'the_take', voice_key: null, archetype: 'uninvited_visitor', situation_clean: S.kitchen, joke_text: "she didn't tidy a kitchen. she filed a complaint in cupboards." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.late, joke_text: 'he built twenty minutes of infrastructure to explain two hours.' },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.chores, joke_text: 'the split is fifty-fifty the way a seesaw with one person on it is level.' },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: "she didn't label her food. she labelled the exception." },

  // the clapback — first person, ends where they have to answer
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.nights, joke_text: '"eleven nights. at what point do i start introducing her?"' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: '"you\'ve got a system for your food. what\'s the system for mine?"' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: '"label mine too. same pen. let\'s see if it works both ways."' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.budget, joke_text: '"understood. i\'ll do the course in the new room, then."' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.late, joke_text: '"you had two hours to think of that. which part took the longest?"' },
  { slot: 'the_clapback', voice_key: null, archetype: 'backhanded_grandma', situation_clean: S.yoga, joke_text: '"noted. is that one going in the christmas letter, or just the group chat?"' },

  // the roast — arrives somewhere the retelling could not reach
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.late, joke_text: 'he arrived with exhibits.' },
  { slot: 'the_roast', voice_key: null, archetype: 'uninvited_visitor', situation_clean: S.kitchen, joke_text: 'she broke in, ran an audit, and left the findings in the cutlery drawer.' },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.repost, joke_text: "he's headhunting for the role of you, and you didn't make the shortlist." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.nights, joke_text: "eleven nights isn't between places. that's a tenancy with a nicer name." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.chores, joke_text: 'he does half the chores the way a foreman does half the building.' },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: "she labelled her food so she'd know which half of the fridge was the buffet." },

  // The founder's approved product-mode rows from the joke ledger
  // (src/lib/jokes/jokenet.json), admitted by scripts/jokenet-sync.ts —
  // the hard rules and guardrails A–E against each row's own situation.
  // Regenerate with `bun run scripts/jokenet-sync.ts --ts`; the same rows
  // are the hall-of-fame migration of 2026-09-22.
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", joke_text: "The scale needed a 1 before it could give you a 4. He sat down and decided what a 1 was. Then he made the coffee." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", joke_text: "\"Add a row for this morning. 'Made coffee, said nothing.' Severity — you tell me. You built the scale.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", joke_text: "He didn't make you coffee. Compliance did. Every time he went quiet and went upstairs, that was a row — column D, severity 3, 9:42 p.m. The coffee is the opening entry on a new tab. He's watching how you take it. He needs a 5." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could 'table it' till after his work trip.", joke_text: "\"Tabled. What's on the agenda after the trip — the eight months, or the ninth?\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could 'table it' till after his work trip.", joke_text: "He didn't have a gym membership. He had a program. Eight months, one couple, a progress photo somebody else posted. Sure, table it. That item comes back on its own — around month nine, seven pounds, and it has his jaw." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I feel useless that I'm in my 30s and still need my parents' financial support.", joke_text: "Nothing changed at thirty except the number. The economy's the one still living at home." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I feel useless that I'm in my 30s and still need my parents' financial support.", joke_text: "\"Call it a loan and I'll call you Sunday. That's the interest.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I feel useless that I'm in my 30s and still need my parents' financial support.", joke_text: "Your parents aren't helping. They're investors. Fifteen years in, no exit, updates at Sunday dinner. Series A was college. Series B landed this morning. Memo: \"groceries.\"" },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her cancer.", joke_text: "The diagnosis came from a doctor. She's been running a second opinion on you since the wedding." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her cancer.", joke_text: "\"I wish I had that power.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her cancer.", joke_text: "She said gave. Like a gift." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her an autoimmune disease.", joke_text: "Her body turned on her. She turned on you. Nobody in that house takes the blame, not even the cells." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her an autoimmune disease.", joke_text: "\"You must be feeling better now cuz you ain't got nothing healthy in you to attack.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law said I gave her an autoimmune disease.", joke_text: "Her own body filed a complaint against her. She forwarded it to you." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me I stole her son from her.", joke_text: "She married a man out of his mother's house and calls it a wedding. You did the same thing and it's a felony." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me I stole her son from her.", joke_text: "\"Stole? That's how you got father-in-law?\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me I stole her son from her.", joke_text: "She reported him stolen. Last seen leaving the basement, carrying his own laundry, voluntarily. The police have a form for that. It's a change of address." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me I stole her son from her.", joke_text: "She held him for thirty years and calls the first person who opened the door a thief." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me I stole her son from her.", joke_text: "She said stole. He wasn't in a vault. He was in her basement with a mini fridge and his laundry done. Nobody stole him. Somebody finally rang the bell." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me we could pay her for day care for our baby.", joke_text: "Other grandmothers ask to hold the baby. She asked for a rate." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me we could pay her for day care for our baby.", joke_text: "\"No. I don't pay for incompetence.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law told me we could pay her for day care for our baby.", joke_text: "She's a business now. The staff is her, the client is her son, the product is her grandchild. She'll hold the baby for free, in photos." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", joke_text: "She thinks a court can make us let her in. It can. Once. With a bailiff." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", joke_text: "\"File it. Also a restraining order on us all, so we never get close to you.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", joke_text: "She's going to court to get closer to the baby. Court is where we get the number for how far away she stays. Fifty feet is standard. We're asking for a hundred." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", joke_text: "Grandmothers who don't get enough visits bring cookies. She brought a lawyer." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", joke_text: "You left at 8:00 in spirit and 8:30 in Honda." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", joke_text: "\"I'm not late. Everyone else is early.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", joke_text: "Walk in at 8:50 like you're coming from a funeral. You are. 8:00 is dead." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My mother-in-law calling my baby 'her baby'.", joke_text: "She says \"her baby\" the way she says \"her kitchen\" at your house." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law calling my baby 'her baby'.", joke_text: "\"Your baby? Then the 3 a.m. feed is yours. Every night.\"" },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My mother-in-law calling my baby 'her baby'.", joke_text: "\"You have a baby. I married him.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My mother-in-law calling my baby 'her baby'.", joke_text: "Her baby? Walgreens sells a DNA test for that. $99, results in five days." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", joke_text: "You said \"depressed.\" She heard \"toilet.\"" },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", joke_text: "\"I will. Shit on you. Get off you.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", joke_text: "Her advice is plumbing. Look what came out of her." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", joke_text: "That's not a mother talking. That's the first wife." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", joke_text: "\"You will. Your mother-in-law did.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", joke_text: "Everyone else came to the wedding with a gift. She came as the widow." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I get mad at everyone around me and can't explain why to myself or them.", joke_text: "The anger clocked in. The reason is in traffic." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I get mad at everyone around me and can't explain why to myself or them.", joke_text: "\"If I knew why, I'd have picked someone who deserved it.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I get mad at everyone around me and can't explain why to myself or them.", joke_text: "The reason's like keys. It's in the coat from March. You'll find it looking for something else." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "Why am I lactose intolerant?", joke_text: "You're not lactose intolerant. You're factory settings. The people who can drink milk are the mutants." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Why am I lactose intolerant?", joke_text: "\"It's not you. It's lactose. Milk is made for a calf.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Why am I lactose intolerant?", joke_text: "Eight thousand years ago some farmers took a dare and never stopped. You're descended from the people who said no." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "Why am I sad?", joke_text: "You can't afford syrup in your coffee." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Why am I sad?", joke_text: "\"Rent.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Why am I sad?", joke_text: "$2,400 a month for a view of a wall." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I sent a screenshot of my boss to my boss.", joke_text: "You didn't send the wrong screenshot. You sent the evidence to the violator." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I sent a screenshot of my boss to my boss.", joke_text: "\"Now we've both seen it.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I sent a screenshot of my boss to my boss.", joke_text: "Time to update your LinkedIn status to: open for job." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I sent a screenshot of my boss to my boss.", joke_text: "That's not a mistake. That's two weeks' notice as a JPEG." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I sent a screenshot of my boss to my boss.", joke_text: "\"That was for your boss.\"" },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I paid for my boob job with my corporate business card (by accident).", joke_text: "Finance has a category for that. It's called \"Team Building.\"" },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I paid for my boob job with my corporate business card (by accident).", joke_text: "\"Client-facing.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I paid for my boob job with my corporate business card (by accident).", joke_text: "Every time you present now, the whole conference room stares at the ceiling." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I paid for my boob job with my corporate business card (by accident).", joke_text: "\"By accident\" is a word for coffee. This had a consult." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I paid for my boob job with my corporate business card (by accident).", joke_text: "Accidents don't come with a deposit, a consultation, and a follow-up appointment. That's not an accident. That's a project plan on the wrong card." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", joke_text: "Nine months of waiting, undone by a girl checking the order." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", joke_text: "\"I say 'boy' to everyone.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", joke_text: "Forty people are coming to find out what she found out at the bakery cashier." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", joke_text: "The reveal already happened. The party's just cake now." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", joke_text: "You didn't fill a position. You founded a department." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", joke_text: "\"We're scaling.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", joke_text: "Quit tonight. Move states. Let the twelve sort out the desk." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I work in HR, accidentally terminated myself in the system.", joke_text: "You're the first person HR ever fired who deserved it." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I work in HR, accidentally terminated myself in the system.", joke_text: "\"Testing the workflow.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I work in HR, accidentally terminated myself in the system.", joke_text: "Your exit interview is with you, and you're not returning your own calls." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "Being a mom I feel overstimulated. Hamster wheel going and going.", joke_text: "You're a hamster with a mortgage." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "Being a mom I feel overstimulated. Hamster wheel going and going.", joke_text: "\"Someone stop the hamster spinning wheel.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "Being a mom I feel overstimulated. Hamster wheel going and going.", joke_text: "God closed the oven door, and opened the washer door." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: "I filled up my tank today and it cost me $120.", joke_text: "Your car ate better today than you will all week." },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: "I filled up my tank today and it cost me $120.", joke_text: "Pump screen: \"Receipt?\"\n\"No. I know what I did.\"" },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: "I filled up my tank today and it cost me $120.", joke_text: "You work Monday to pay for the gas that gets you to work Tuesday." },
]

/* ───────────────────────────── lookups ───────────────────────────── */

type Admin = {
  from: (table: string) => any
}

/** Every active voice, from the table if it has any, else the seed. */
export async function loadVoices(admin: Admin | null): Promise<JokeVoice[]> {
  if (admin) {
    try {
      const { data } = await admin
        .from('joke_voices')
        .select('key, label, persona_prompt, register_notes, banned_moves, weight')
        .eq('is_active', true)
      if (Array.isArray(data) && data.length) {
        return data.map((v: any) => ({
          key: String(v.key),
          label: String(v.label),
          persona_prompt: String(v.persona_prompt),
          register_notes: String(v.register_notes),
          banned_moves: String(v.banned_moves),
          weight: Math.max(1, Number(v.weight) || 1),
        }))
      }
    } catch (err) {
      console.error('[joke-voices] load failed; using seed', err)
    }
  }
  return SEED_VOICES
}

function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1
}

/** One voice for the whole set, weighted, seeded off the set id so all
 *  three cards — and any reroll — speak in the same voice. */
export function pickVoice(voices: JokeVoice[], seed: string): JokeVoice {
  const pool = voices.length ? voices : SEED_VOICES
  const total = pool.reduce((n, v) => n + v.weight, 0)
  let at = hash(seed) % total
  for (const v of pool) {
    if (at < v.weight) return v
    at -= v.weight
  }
  return pool[0]!
}

export function voiceByKey(voices: JokeVoice[], key: string | null | undefined): JokeVoice | null {
  if (!key) return null
  return voices.find((v) => v.key === key) ?? SEED_VOICES.find((v) => v.key === key) ?? null
}

/* ───────────────────────── few-shot exclusion ─────────────────────────
   A hall-of-fame row that is the same situation again teaches the model
   to copy, not to write. Before a row can be an example it must be far
   enough from this spill — cosine similarity under 0.80 — and must not
   share both the archetype and the accusation verb. Fewer than two
   survivors means none: none is better than a copy. */
export const EXAMPLE_SIMILARITY_CUTOFF = 0.8

/** How many missing hall-of-fame embeddings one card flip will pay for. */
const CATCHUP_EMBEDDINGS_PER_CARD = 6

const ACCUSATION_VERBS = ['gave', 'ruined', 'made', 'caused', 'destroyed', 'broke', 'wrecked', 'killed', 'cost', 'stole', 'took', 'ended', 'poisoned', 'infected']

/** The accuser's verb in a spill, when the other party accused the user
 *  of something ("said I gave her", "told me you ruined"). */
export function accusationVerb(text: string): string | null {
  const t = text.toLowerCase()
  const m = /\b(?:said|says|saying|told|tells|claims?|claimed|accused|accuses|blamed|blames)\b[^.!?]{0,60}?\b(?:i|you|i'd|i've)\s+(?:had\s+)?(\w+)/.exec(t)
  if (m && ACCUSATION_VERBS.includes(m[1]!)) return m[1]!
  return null
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]! }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

/** pgvector comes back through REST as its text form '[0.1,0.2,…]'. */
function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v.map(Number)
  if (typeof v === 'string' && v.startsWith('[')) {
    try { const arr = JSON.parse(v) as unknown; return Array.isArray(arr) ? arr.map(Number) : null } catch { return null }
  }
  return null
}

export type ExampleSelection = {
  examples: { situation: string; line: string }[]
  examples_excluded: number
  reasons: string[]
}

/** Up to `limit` situation→line pairs for a card, after exclusion.
 *  Selection order: (slot, voice, archetype) → (slot, voice) → (slot, any
 *  voice) → none. Never block on empty. */
export async function loadExamples(
  admin: Admin | null,
  args: {
    slot: SlotKey
    voiceKey: string
    archetype: string
    limit?: number
    situation?: string
    /** the spill's embedding, when one could be made */
    spillEmbedding?: number[] | null
    trace?: { set_id?: string; position?: number }
  },
): Promise<ExampleSelection> {
  const limit = args.limit ?? 5
  let rows: (HallOfFameEntry & { id?: string; embedding?: number[] | null })[] = []
  if (admin) {
    try {
      const { data } = await admin
        .from('joke_hall_of_fame')
        .select('id, slot, voice_key, archetype, situation_clean, joke_text, embedding')
        .eq('slot', args.slot)
        .eq('is_active', true)
        .limit(200)
      if (Array.isArray(data)) rows = data.map((r: any) => ({ ...r, embedding: parseVector(r.embedding) }))
    } catch (err) {
      console.error('[joke-hof] load failed; using seed', err)
    }
  }
  if (rows.length === 0) rows = SEED_HALL_OF_FAME.filter((h) => h.slot === args.slot)

  // A row without an embedding gets one now, once, and keeps it — but a
  // card flip pays for a handful at most, in parallel. The rest catch up on
  // later flips, so no user ever waits on the whole library.
  if (admin && args.spillEmbedding) {
    const { embedText, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
    const pending = rows.filter((r) => !r.embedding && r.id).slice(0, CATCHUP_EMBEDDINGS_PER_CARD)
    await Promise.all(
      pending.map(async (r) => {
        const vec = await embedText(r.situation_clean)
        if (!vec) return
        r.embedding = vec
        try {
          await admin.from('joke_hall_of_fame').update({ embedding: toVectorLiteral(vec) } as never).eq('id', r.id)
        } catch (err) {
          console.error('[joke-hof] could not store an embedding', { id: r.id, err })
        }
      }),
    )
  }

  const verb = args.situation ? accusationVerb(args.situation) : null
  const reasons: string[] = []
  const kept = rows.filter((r) => {
    if (args.spillEmbedding && r.embedding) {
      const sim = cosine(args.spillEmbedding, r.embedding)
      if (sim >= EXAMPLE_SIMILARITY_CUTOFF) {
        reasons.push(`similarity ${sim.toFixed(2)} (${r.id ?? 'seed'})`)
        return false
      }
    }
    if (verb && r.archetype === args.archetype && accusationVerb(r.situation_clean) === verb) {
      reasons.push(`archetype+verb "${verb}" (${r.id ?? 'seed'})`)
      return false
    }
    return true
  })
  let examples = selectExamples(kept, args.voiceKey, args.archetype, limit, args.trace?.set_id ?? args.situation ?? '')
  if (examples.length < 2) {
    if (examples.length) reasons.push('fewer than two survive; proceeding with none')
    examples = []
  }
  const out = { examples, examples_excluded: rows.length - kept.length, reasons }
  console.log('[joke-examples]', {
    ...(args.trace ?? {}),
    slot: args.slot,
    examples: examples.length,
    examples_excluded: out.examples_excluded,
    reason: reasons,
  })
  return out
}

/** Every active hall-of-fame line, all slots, for the exemplar-copy
 *  guardrail. The seed stands in when the table is empty or unreachable. */
export type HallOfFameLine = { id: string; text: string; embedding?: number[] | null }

/** Every active hall-of-fame line, all slots, for the exemplar-copy
 *  guardrail, with the line's own embedding (text_embedding) for the
 *  paraphrase half of D. A row without one gets it now, a handful per
 *  flip, and keeps it. The seed stands in when the table is empty or
 *  unreachable. */
export async function loadHallOfFameLines(admin: Admin | null): Promise<HallOfFameLine[]> {
  if (admin) {
    try {
      const { data } = await admin.from('joke_hall_of_fame').select('id, joke_text, text_embedding').eq('is_active', true).limit(1000)
      if (Array.isArray(data) && data.length) {
        const rows: HallOfFameLine[] = data.map((r: any) => ({ id: `hof:${r.id}`, text: String(r.joke_text), embedding: parseVector(r.text_embedding) }))
        const pending = rows.filter((r) => !r.embedding).slice(0, CATCHUP_EMBEDDINGS_PER_CARD)
        if (pending.length) {
          const { embedTexts, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
          const vecs = await embedTexts(pending.map((r) => r.text))
          await Promise.all(
            pending.map(async (r, i) => {
              const vec = vecs[i]
              if (!vec) return
              r.embedding = vec
              try {
                await admin.from('joke_hall_of_fame').update({ text_embedding: toVectorLiteral(vec) } as never).eq('id', r.id.slice('hof:'.length))
              } catch (err) {
                console.error('[joke-hof] could not store a text embedding', { id: r.id, err })
              }
            }),
          )
        }
        return rows
      }
    } catch (err) {
      console.error('[joke-hof] lines load failed; using seed', err)
    }
  }
  return SEED_HALL_OF_FAME.map((h, i) => ({ id: `seed:${i}`, text: h.joke_text, embedding: null }))
}

export function selectExamples(
  rows: HallOfFameEntry[],
  voiceKey: string,
  archetype: string,
  limit: number,
  /** stable per set: the same spill sees the same five, a different spill a
   *  different five, so a library of eighty is not always its first five */
  seed = '',
): { situation: string; line: string }[] {
  const voiceMatches = (h: HallOfFameEntry) => h.voice_key === voiceKey || h.voice_key === null
  const order = (xs: HallOfFameEntry[]) => (seed ? shuffleSlots(xs, seed) : xs)
  const tiers = [
    order(rows.filter((h) => voiceMatches(h) && h.archetype === archetype)),
    order(rows.filter((h) => voiceMatches(h))),
    order(rows),
  ]
  const out: { situation: string; line: string }[] = []
  const seen = new Set<string>()
  for (const tier of tiers) {
    for (const h of tier) {
      if (out.length >= limit) return out
      if (seen.has(h.joke_text)) continue
      seen.add(h.joke_text)
      out.push({ situation: h.situation_clean, line: h.joke_text })
    }
  }
  return out
}
