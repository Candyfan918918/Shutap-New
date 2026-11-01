// THE STANDARD: lines from the Lab's in-house dataset that the founder (and
// the people she tested them on) rated funny. Shown to the writer and the
// judge as the bar on OTHER stories. Generated from
// shutap-situations-and-jokes.xlsx (approved / picked rows, under 45 words;
// rejected, cut, pending and unrated rows left out). Nov 1 2026.
//
// Never used as the eval's thirty stories, so the blind eval stays fair.
// `f` marks a line the founder wrote or edited herself: her own voice.
export type TasteLine = { s: string; l: string; m: string; f?: boolean }

export const TASTE_BANK: TasteLine[] = [
  { s: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", l: "The scale needed a 1 before it could give you a 4. He sat down and decided what a 1 was. Then he made the coffee.", m: "the errand; fake precision" },
  { s: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", l: "\"Add a row for this morning. 'Made coffee, said nothing.' Severity — you tell me. You built the scale.\"", m: "answer the text; counter-offer" },
  { s: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", l: "He named it Household Budget because he knew which tab you'd never open. Every quiet evening was data entry.", m: "" },
  { s: "Opened a spreadsheet called 'Household Budget' and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.", l: "\"Show me a 1. I want to see the day I only bothered you a little.\"", m: "" },
  { s: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could 'table it' till after his work trip.", l: "Instagram knew. The gym knew. The couple knew. You're the last stop on a notification chain that started at the squat rack.", m: "the lineup; the object" },
  { s: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could 'table it' till after his work trip.", l: "\"Tabled. What's on the agenda after the trip — the eight months, or the ninth?\"", m: "answer the text; fake precision" },
  { s: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could 'table it' till after his work trip.", l: "He didn't have a gym membership. He had a program. Eight months, one couple, a progress photo somebody else posted. Sure, table it. That item comes back on its own — around month nine, seven pounds, and it has his jaw.", m: "their word made a world; fake precision" },
  { s: "I feel useless that I'm in my 30s and still need my parents' financial support.", l: "Nothing changed at thirty except the number. The economy's the one still living at home.", m: "verdict moved to the mechanism" },
  { s: "I feel useless that I'm in my 30s and still need my parents' financial support.", l: "\"Call it a loan and I'll call you Sunday. That's the interest.\"", m: "name the price (kind adult)" },
  { s: "I feel useless that I'm in my 30s and still need my parents' financial support.", l: "Your parents aren't helping. They're investors. Fifteen years in, no exit, updates at Sunday dinner. Series A was college. Series B landed this morning. Memo: \"groceries.\"", m: "their word made a world; shared prop" },
  { s: "My mother-in-law said I gave her cancer.", l: "The diagnosis came from a doctor. She's been running a second opinion on you since the wedding.", m: "replay her verb; the prior", f: true },
  { s: "My mother-in-law said I gave her cancer.", l: "\"I wish I had that power.\"", m: "the concession", f: true },
  { s: "My mother-in-law said I gave her cancer.", l: "She said gave. Like a gift.", m: "the replay; implied world", f: true },
  { s: "My mother-in-law said I gave her an autoimmune disease.", l: "Her body turned on her. She turned on you. Nobody in that house takes the blame, not even the cells.", m: "mechanism mirror" },
  { s: "My mother-in-law said I gave her an autoimmune disease.", l: "\"You must be feeling better now cuz you ain't got nothing healthy in you to attack.\"", m: "fake concern; mechanism unnamed against accuser", f: true },
  { s: "My mother-in-law said I gave her an autoimmune disease.", l: "Her own body filed a complaint against her. She forwarded it to you.", m: "mechanism mirror; object given a life" },
  { s: "My mother-in-law told me I stole her son from her.", l: "She married a man out of his mother's house and calls it a wedding. You did the same thing and it's a felony.", m: "mechanism mirror" },
  { s: "My mother-in-law told me I stole her son from her.", l: "\"Stole? That's how you got father-in-law?\"", m: "answer the text + mirror", f: true },
  { s: "My mother-in-law told me I stole her son from her.", l: "She reported him stolen. Last seen leaving the basement, carrying his own laundry, voluntarily. The police have a form for that. It's a change of address.", m: "the procedure; name the real label" },
  { s: "My mother-in-law told me I stole her son from her.", l: "She held him for thirty years and calls the first person who opened the door a thief.", m: "" },
  { s: "My mother-in-law told me I stole her son from her.", l: "She said stole. He wasn't in a vault. He was in her basement with a mini fridge and his laundry done. Nobody stole him. Somebody finally rang the bell.", m: "" },
  { s: "My mother-in-law told me we could pay her for day care for our baby.", l: "Other grandmothers ask to hold the baby. She asked for a rate.", m: "the lineup" },
  { s: "My mother-in-law told me we could pay her for day care for our baby.", l: "\"No. I don't pay for incompetence.\"", m: "the refusal", f: true },
  { s: "My mother-in-law told me we could pay her for day care for our baby.", l: "She's a business now. The staff is her, the client is her son, the product is her grandchild. She'll hold the baby for free, in photos.", m: "their word made a world" },
  { s: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", l: "She thinks a court can make us let her in. It can. Once. With a bailiff.", m: "the procedure" },
  { s: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", l: "\"File it. Also a restraining order on us all, so we never get close to you.\"", m: "wrong-way correction as co-filing", f: true },
  { s: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", l: "She's going to court to get closer to the baby. Court is where we get the number for how far away she stays. Fifty feet is standard. We're asking for a hundred.", m: "the procedure; fake precision" },
  { s: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.", l: "Grandmothers who don't get enough visits bring cookies. She brought a lawyer.", m: "the lineup" },
  { s: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", l: "You left at 8:00 in spirit and 8:30 in Honda.", m: "the split" },
  { s: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", l: "\"I'm not late. Everyone else is early.\"", m: "the relocation / alibi" },
  { s: "Me leaving my house at 8:30am hoping I make it to work by 8:00am.", l: "Walk in at 8:50 like you're coming from a funeral. You are. 8:00 is dead.", m: "stage direction; literal turn; obituary", f: true },
  { s: "My mother-in-law calling my baby 'her baby'.", l: "She says \"her baby\" the way she says \"her kitchen\" at your house.", m: "the prior" },
  { s: "My mother-in-law calling my baby 'her baby'.", l: "\"Your baby? Then the 3 a.m. feed is yours. Every night.\"", m: "counter-offer priced in labour" },
  { s: "My mother-in-law calling my baby 'her baby'.", l: "\"You have a baby. I married him.\"", m: "literal turn" },
  { s: "My mother-in-law calling my baby 'her baby'.", l: "Her baby? Walgreens sells a DNA test for that. $99, results in five days.", m: "the procedure; name the object; fake precision", f: true },
  { s: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", l: "You said \"depressed.\" She heard \"toilet.\"", m: "answer the text", f: true },
  { s: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", l: "\"I will. Shit on you. Get off you.\"", m: "the order, followed", f: true },
  { s: "My ex-MIL said 'shit or get off the pot' when I told her I was depressed.", l: "Her advice is plumbing. Look what came out of her.", m: "the collateral (ex-husband)" },
  { s: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", l: "That's not a mother talking. That's the first wife.", m: "the wrong role", f: true },
  { s: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", l: "\"You will. Your mother-in-law did.\"", m: "the mirror", f: true },
  { s: "My MIL told me she has to get used to the fact that her son is going to be some other woman's husband.", l: "Everyone else came to the wedding with a gift. She came as the widow.", m: "the wrong role; lineup" },
  { s: "I get mad at everyone around me and can't explain why to myself or them.", l: "The anger clocked in. The reason is in traffic.", m: "the split; the delay", f: true },
  { s: "I get mad at everyone around me and can't explain why to myself or them.", l: "\"If I knew why, I'd have picked someone who deserved it.\"", m: "the alibi" },
  { s: "I get mad at everyone around me and can't explain why to myself or them.", l: "The reason's like keys. It's in the coat from March. You'll find it looking for something else.", m: "object given a life; the errand; the delay" },
  { s: "Why am I lactose intolerant?", l: "You're not lactose intolerant. You're factory settings. The people who can drink milk are the mutants.", m: "wrong role applied to biology" },
  { s: "Why am I lactose intolerant?", l: "\"It's not you. It's lactose. Milk is made for a calf.\"", m: "relocation; name the object", f: true },
  { s: "Why am I lactose intolerant?", l: "Eight thousand years ago some farmers took a dare and never stopped. You're descended from the people who said no.", m: "the errand", f: true },
  { s: "Why am I sad?", l: "You can't afford syrup in your coffee.", m: "the small deprivation", f: true },
  { s: "Why am I sad?", l: "\"Rent.\"", m: "the scapegoat", f: true },
  { s: "Why am I sad?", l: "$2,400 a month for a view of a wall.", m: "fake precision", f: true },
  { s: "I sent a screenshot of my boss to my boss.", l: "You didn't send the wrong screenshot. You sent the evidence to the violator.", m: "the noun must convict", f: true },
  { s: "I sent a screenshot of my boss to my boss.", l: "\"Now we've both seen it.\"", m: "" },
  { s: "I sent a screenshot of my boss to my boss.", l: "Time to update your LinkedIn status to: open for job.", m: "name the real label", f: true },
  { s: "I sent a screenshot of my boss to my boss.", l: "That's not a mistake. That's two weeks' notice as a JPEG.", m: "" },
  { s: "I sent a screenshot of my boss to my boss.", l: "\"That was for your boss.\"", m: "" },
  { s: "I paid for my boob job with my corporate business card (by accident).", l: "Finance has a category for that. It's called \"Team Building.\"", m: "the clean line; name the real label", f: true },
  { s: "I paid for my boob job with my corporate business card (by accident).", l: "\"Client-facing.\"", m: "institution's alibi" },
  { s: "I paid for my boob job with my corporate business card (by accident).", l: "Every time you present now, the whole conference room stares at the ceiling.", m: "the clean line; sentence as a room's behaviour", f: true },
  { s: "I paid for my boob job with my corporate business card (by accident).", l: "\"By accident\" is a word for coffee. This had a consult.", m: "answer the text; the errand" },
  { s: "I paid for my boob job with my corporate business card (by accident).", l: "Accidents don't come with a deposit, a consultation, and a follow-up appointment. That's not an accident. That's a project plan on the wrong card.", m: "" },
  { s: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", l: "Nine months of waiting, undone by a girl checking the order.", m: "the lineup", f: true },
  { s: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", l: "\"I say 'boy' to everyone.\"", m: "the alibi" },
  { s: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", l: "Forty people are coming to find out what she found out at the bakery cashier.", m: "proof by count; spill's own place", f: true },
  { s: "I accidentally revealed the baby's gender to the mom by rereading the cake order out loud.", l: "The reveal already happened. The party's just cake now.", m: "" },
  { s: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", l: "You didn't fill a position. You founded a department.", m: "proof by count" },
  { s: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", l: "\"We're scaling.\"", m: "institution's alibi" },
  { s: "I sent a 'you're hired, welcome to the team' email to all 12 people who interviewed for the one position.", l: "Quit tonight. Move states. Let the twelve sort out the desk.", m: "the overreaction", f: true },
  { s: "I work in HR, accidentally terminated myself in the system.", l: "You're the first person HR ever fired who deserved it.", m: "ironic superlative" },
  { s: "I work in HR, accidentally terminated myself in the system.", l: "\"Testing the workflow.\"", m: "institution's alibi" },
  { s: "I work in HR, accidentally terminated myself in the system.", l: "Your exit interview is with you, and you're not returning your own calls.", m: "you versus you", f: true },
  { s: "Being a mom I feel overstimulated. Hamster wheel going and going.", l: "You're a hamster with a mortgage.", m: "animal with a bill", f: true },
  { s: "Being a mom I feel overstimulated. Hamster wheel going and going.", l: "\"Someone stop the hamster spinning wheel.\"", m: "", f: true },
  { s: "Being a mom I feel overstimulated. Hamster wheel going and going.", l: "God closed the oven door, and opened the washer door.", m: "hijacked proverb with appliances", f: true },
  { s: "To the girls still missing their ex (content, no spill)", l: "He replied \"ok.\" You've analysed it for three days. NASA has spent less time on bigger rocks.", m: "fake precision; visible vehicle" },
  { s: "To the girls still missing their ex (content, no spill)", l: "You're not waiting for him to come back. You're waiting for him to notice you left. He noticed the Netflix password changed.", m: "reversal; deflate downward" },
  { s: "To the girls still missing their ex (content, no spill)", l: "You don't need closure. You need Wi-Fi strong enough to download common sense.", m: "their word made a world", f: true },
  { s: "To the girls still missing their ex (content, no spill)", l: "You still follow his mom. That's not keeping in touch. That's keeping a witness.", m: "wrong role" },
  { s: "To the girls still missing their ex (content, no spill)", l: "He was your person the way a rental is your car.", m: "visible vehicle; deflate" },
  { s: "To the girls still missing their ex (content, no spill)", l: "\"We had a connection.\" You had a Wi-Fi password. He changed it.", m: "their word literalised; deflate" },
  { s: "To the guy still texting his ex (content)", l: "\"We should catch up sometime.\" Sometime is a word for men with no plan and a full battery.", m: "answer the text; landing noun" },
  { s: "To the guy still texting his ex (content)", l: "\"You up?\" She is. She's screenshotting.", m: "answer the text; power stays with her" },
  { s: "To the guy still texting his ex (content)", l: "You texted her mom \"Happy Thanksgiving.\" That's not manners. That's applying through the back door and getting rejected by the whole house.", m: "their word made a world" },
  { s: "To the guy still texting his ex (content)", l: "\"I'm in a better place now.\" It's her Spam folder. She doesn't go there.", m: "one folder lower", f: true },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"Your cousin said it's real.\" Your cousin sold candles out of her car.", m: "the prior" },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"It's from a page with two million followers.\" So was the bracelet that fixed your knee.", m: "the prior" },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"If it's fake, why does it have music?\" Ma.", m: "the non-answer" },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"I didn't say I believed it.\" You put praying hands on it and sent it to twelve people.", m: "proof by count" },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"Fine, I'll ask your brother.\" He'll say it's real. He wants to sleep.", m: "" },
  { s: "Kids being asked by mom if an AI video is AI (content)", l: "\"I've watched it three times and it looks real every time.\" That's not evidence. That's a rerun.", m: "" },
  { s: "People whose knees hurt (content)", l: "You said \"oof\" sitting down. Sitting. Down. Gravity did all the work and you still filed a complaint.", m: "the replay" },
  { s: "People whose knees hurt (content)", l: "Stairs aren't the enemy. Stairs were there first. You're the one who changed.", m: "object given seniority" },
  { s: "People whose knees hurt (content)", l: "You crack when you stand up like somebody's popping bubble wrap. Kids think you have a sound effect.", m: "visible vehicle + tag" },
  { s: "People whose knees hurt (content)", l: "Fine. Be an adult. Hurt everywhere.", m: "wrong-way correction" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says it meant nothing. Fine. Nothing can sleep at his mom's.", m: "their word made a world; sentence passed" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "Don't break up with him for texting his ex. Be an adult. Make him read the thread out loud at Thanksgiving.", m: "wrong-way correction" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He saved her as \"Dave (Plumber).\" Dave texts at midnight. Dave sends hearts. Dave is getting a suitcase.", m: "object given a life; sentence passed" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says she's \"like a sister.\" Great. She can come to Christmas. She can sit next to his actual sister and explain the hearts.", m: "their word made a world" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "It takes two to send a text to an ex. Him, and his thumb. The thumb's staying. The rest can sleep at his mother's.", m: "hijacked proverb" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says \"you don't have to worry about her.\" Correct. Worry's for people who live here. You're not worried. You're packing.", m: "second-person address", f: true },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says \"I would never actually do anything.\" Right. He never actually does anything. The dishes know. The ex knows. Now the couch knows.", m: "lineup of witnesses" },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says he was \"just being nice.\" Nice gets a heart at midnight. You get \"k.\" Nice can come collect its stuff. The stuff is on the lawn, being nice.", m: "committed personification", f: true },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says \"she's going through a hard time.\" She'll get through it. He's going through a harder one.", m: "implied sentence", f: true },
  { s: "Boyfriends who text their ex, for the current girlfriends (content)", l: "He says \"I can explain.\" He can. To the movers. They charge by the hour and they've heard it.", m: "the new listener" },
]

/** `n` lines for the writer, each from a different situation, founder lines
 *  first when the draw allows. `rand` is injectable for tests. */
export function standardLines(n = 6, rand: () => number = Math.random): TasteLine[] {
  const pool = [...TASTE_BANK]
  // shuffle, then stable-sort founder lines to the front so they win ties
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  pool.sort((a, b) => (a.f === b.f ? 0 : a.f ? -1 : 1))
  const out: TasteLine[] = []
  const used = new Set<string>()
  for (const t of pool) {
    if (used.has(t.s)) continue
    used.add(t.s)
    out.push(t)
    if (out.length === n) break
  }
  return out
}

/** The {{STANDARD}} block for the writer. */
export function standardBlock(lines: TasteLine[]): string {
  if (!lines.length) return ''
  const shown = lines.map((t, i) => `${i + 1}. story: ${t.s}\n   line: ${t.l}${t.m ? `\n   (the move: ${t.m})` : ''}`).join('\n')
  return `
THE STANDARD — lines our audience and the founder rated funny, on OTHER
  stories. This is the bar every tag and button has to clear: this short,
  a picture you can see, an act not a label, the last word a thing you can
  point at, no explaining. Match the level. Never reuse their words, nouns,
  numbers or premise.

${shown}
`
}

/** The shorter {{STANDARD}} block for the judge: the bar, not a lesson. */
export function judgeStandard(lines: TasteLine[]): string {
  if (!lines.length) return ''
  return `
THE BAR — lines our audience rated funny on other stories. A bit that is
  this short, this concrete and lands this hard wins; one that explains,
  labels or summarises loses to it.
${lines.map((t) => `  · ${t.l}`).join('\n')}
`
}
