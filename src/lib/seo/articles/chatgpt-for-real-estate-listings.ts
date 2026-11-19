import type { Guide } from "../guides";

const guide: Guide = {
  slug: "chatgpt-for-real-estate-listings",
  kind: "guide",
  topic: "realtors",
  keyword: "chatgpt for real estate listings",
  title: "ChatGPT for Real Estate Listings: Prompt and Checks | Shutap",
  h1: "ChatGPT for real estate listings: the prompt, the checks, and when to switch",
  description:
    "Use ChatGPT for real estate listings without made-up features or fair-housing slips: one full prompt with guardrails, the finished MLS copy, and a number check.",
  capsule:
    "ChatGPT for real estate listings works well as a first-draft writer if you give it only the listing's facts, forbid it from adding anything, and tell it to describe the property, not the buyer. Chatbots are known to invent plausible features, so the agent still checks every number against the listing sheet. Below is a full prompt with those guardrails, the description it's built to produce, and when a listing tool saves you the checking.",
  blurb: "One full ChatGPT prompt with guardrails, the finished MLS description, the line-by-line check, and when a listing tool is the better pick.",
  sections: [
    {
      heading: "What ChatGPT gets right on a listing, and what it gets wrong",
      body: "A chatbot is fast at the part agents dread: turning a list of facts into sentences that read smoothly. Luxury Presence says a well-prompted model returns a polished first draft in under 60 seconds. The trouble is what it does with gaps. When Real Estate News tested ChatGPT on a listing back in 2022, it used every target word and then made up details like ceiling heights and hardwood floors. Nothing in a chat window knows your MLS rules or fair-housing law either. So the job splits cleanly. ChatGPT writes sentences. You supply the facts, set the limits, and check what comes back.",
    },
    {
      heading: "The listing we'll run through the prompt",
      body: "Here's an invented listing to work with, written the way you'd copy it off your own notes. A 1962 ranch, 3 bedrooms, 2 baths, 1,480 square feet on a 0.18-acre lot. Kitchen remodeled in 2023 with quartz counters and a gas range. Original terrazzo floor in the entry. Furnace replaced in 2025. Primary bedroom with a walk-in closet. Hall bath still has its 1962 pink tile. Fenced side yard with one raised vegetable bed. Two-car attached garage. Six blocks to the Elm Street light-rail stop. That's ten facts. A good description uses all ten and adds none.",
    },
    {
      heading: "The full prompt, with the guardrails in it",
      body: "Paste this, then the facts. \"Write the MLS public remarks for this listing. Use only the facts below. Don't add any feature, material, measurement, view or distance that isn't listed. If a sentence needs a fact I didn't give you, write [ASK AGENT] instead of guessing. Describe the property, never the buyer: no words about who would like it, families, age, schools, religion, safety or the neighbors. Don't use 'must see', 'won't last', 'dream home' or 'charming'. Length: 110 to 140 words, plain sentences. One light joke is allowed, aimed at the house only. After the description, list every number you used, one per line.\" The last two sentences do most of the work.",
    },
    {
      heading: "Weak prompt lines and the ones that hold up",
      body: "Most prompt templates online skip the limits. myRealPage's example asks for a description that's \"appealing to young families,\" which is exactly the buyer-targeting NAR tells agents to avoid. Weak: \"Make it appealing to young families.\" Better: \"Describe the property, never the buyer.\" Weak: \"Write a description for this 3-bed home.\" Better: \"Use only the facts below. If you need a fact I didn't give, write [ASK AGENT].\" Weak: \"Make it exciting!\" Better: \"One light joke, aimed at the house.\" Each fix closes a door the chatbot would otherwise walk through, and the [ASK AGENT] tag turns a guess into a question you can see.",
    },
    {
      heading: "The finished MLS description",
      body: "Here's the description that prompt is built to get, written by the Lab and checked against the ten facts. \"Built in 1962 and updated where it counts: a 2023 kitchen with quartz counters and a gas range, and a furnace replaced in 2025. Three bedrooms and two baths across 1,480 square feet, on a 0.18-acre lot. The entry still has its original terrazzo floor, which has outlasted every rug ever put on it. The primary bedroom has a walk-in closet. The hall bath kept its 1962 pink tile and isn't apologizing. The fenced side yard comes with a raised vegetable bed already built. Two-car attached garage. Six blocks to the Elm Street light-rail stop.\"",
    },
    {
      heading: "Checking the draft against the listing sheet",
      body: "Put the number list next to your listing sheet and tick each line. In that description: 1962, 2023, 2025, three bedrooms, two baths, 1,480, 0.18, the 1962 tile again, two-car, six blocks. Ten for ten. Then search the draft for [ASK AGENT]. Any tag left means the model wanted to say something you didn't give it, so either supply the fact or cut the sentence. Last, read it for nouns that aren't on the sheet. That's where invented features hide: \"hardwood,\" \"vaulted,\" \"updated bath,\" \"mountain views.\" If ChatGPT wrote \"spacious backyard\" and your sheet says side yard, the sheet wins.",
    },
    {
      heading: "Lines to cut when they show up anyway",
      body: "Even with guardrails, a chatbot slides back to stock phrases. Here's what to swap. Weak: \"Gleaming hardwood floors throughout.\" Fixed: \"Original terrazzo floor in the entry.\" (The house has terrazzo, not hardwood.) Weak: \"Perfect for a growing family.\" Fixed: \"Three bedrooms and two baths.\" Weak: \"This one won't last!\" Fixed: cut it; Luxury Presence notes many MLS boards ban that phrase. Weak: \"Retro bathroom with tons of character.\" Fixed: \"The hall bath kept its 1962 pink tile and isn't apologizing.\" That last one is the joke. It admits the tile instead of overselling it, and it's aimed at a wall, not a person.",
    },
    {
      heading: "Fair housing: describe the property, not the buyer",
      body: "NAR's guidance is short and worth pasting into every prompt: ads should never indicate a preference or limitation based on a protected class, and agents should focus on describing the property, not the buyer or tenant. Federally, that covers race, color, religion, sex, disability, family status and national origin, and state or local law can add more. NAR names \"ideal for empty nesters\" and \"perfect for students\" as phrases to avoid, while \"easy walk to train\" is fine. That's why the example says six blocks to light rail and stops there. A chatbot won't run this check for you, and agents are legally obligated to uphold fair housing laws.",
    },
    {
      heading: "When a listing tool beats a chat window",
      body: "ChatGPT is enough for one description, written once, that you'll check yourself. It gets slow when one listing needs ten things: the MLS copy, a video script, posts for just listed through sold, an open-house invite. That's where Shutap for Realtors, from the Shutap Humor Amplifier Lab, fits. Paste the listing link or text, pick one of four tones (professional, funny, luxury, young), and get the walkthrough, voiceover, hooks, open-house kit, posts and straight MLS copy, with nothing added beyond the listing and a fair-housing check on every line. You set must-say and never-say words and rewrite anything that isn't your voice. First kit free, marked \"— shutap.com\"; one kit is $12.99.",
    },
  ],
  faq: [
    {
      q: "Can I use ChatGPT to write my MLS listing description?",
      a: "Yes, as a first draft. Paste only the listing's facts, tell it not to add any feature or measurement, and ask it to list every number it used. Then check each number and noun against your listing sheet before it goes on the MLS.",
    },
    {
      q: "Why does ChatGPT add features that aren't in my listing?",
      a: "Chatbots fill gaps with details that sound likely. In Real Estate News's 2022 test, ChatGPT invented ceiling heights and hardwood floors. Asking it to write [ASK AGENT] instead of guessing makes those gaps visible so you can fill or cut them.",
    },
    {
      q: "What's the best ChatGPT prompt for a real estate listing?",
      a: "One that limits it: use only these facts, add nothing, describe the property and never the buyer, skip phrases like 'must see', set a word count, and list every number used. The full version is in the prompt section above.",
    },
    {
      q: "Is a ChatGPT listing description fair-housing compliant?",
      a: "Not automatically. ChatGPT doesn't check fair-housing rules on its own, and common prompts even ask it to target buyer types. Read the draft for any word about who should live there, and keep it to the property, as NAR advises.",
    },
    {
      q: "Should I tell ChatGPT who the ideal buyer is?",
      a: "No. Naming a buyer type, like young families or retirees, invites copy that signals a preference, which NAR says ads should never do. Give it the home's features instead, and let the facts find the buyer.",
    },
  ],
  sources: [
    {
      label: "Real Estate News: ChatGPT AI chatbot writes the perfect listing, except for the made-up features (Dec 28, 2022)",
      url: "https://www.realestatenews.com/2022/12/28/chatgpt-ai-chatbot-writes-the-almost-perfect-listing",
    },
    {
      label: "Luxury Presence: How to Write a Real Estate AI Listing Description in 2026 (read Nov 19, 2026)",
      url: "https://www.luxurypresence.com/blogs/leveraging-ai-property-descriptions/",
    },
    {
      label: "myRealPage: ChatGPT for Real Estate Listing Descriptions (updated Jun 7, 2024)",
      url: "https://myrealpage.com/blog/how-to-use-chatgpt-for-real-estate-listing-descriptions-that-sell/",
    },
    {
      label: "NAR, REALTOR Magazine: Avoid Fair Housing Violations in Advertising (Apr 6, 2022)",
      url: "https://www.nar.realtor/magazine/real-estate-news/law-and-ethics/avoid-fair-housing-violations-in-advertising",
    },
  ],
  related: ["ai-tool-for-funny-real-estate-listings", "how-to-write-a-funny-listing-description", "ai-tools-for-real-estate-agents"],
  cta: { label: "Paste the listing. Get the kit.", href: "/realtors" },
  published: "2026-11-19",
};

export default guide;
