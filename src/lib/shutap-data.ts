export type Reactions = { heard: number; same: number; strong: number; time: number; brave: number };
export type Hall = "healing" | "brave" | "relatable" | "loving";
export type Room = {
  id: string;
  alias: string;
  emoji: string;
  title: string;
  support: "heard" | "advice";
  relates: number;
  sitting: number;
  hours: string;
  reactions: Reactions;
  body: string;
  reflection: string;
  hall: Hall;
};

export const REACTIONS: { k: keyof Reactions; emoji: string; label: string; color: string }[] = [
  { k: "heard", emoji: "🤍", label: "i hear you", color: "#2b2630" },
  { k: "same", emoji: "🫂", label: "omg same", color: "#c87c4a" },
  { k: "strong", emoji: "💪", label: "you've got this", color: "#5B8A5E" },
  { k: "time", emoji: "🌿", label: "it gets easier", color: "#7F77DD" },
  { k: "brave", emoji: "✨", label: "so brave", color: "#c1a02b" },
];

export const HALL_LABEL: Record<Hall, string> = {
  healing: "the healing hall",
  brave: "the brave hall",
  relatable: "the relatable hall",
  loving: "the loving hall",
};

export const ROOMS: Room[] = [
  {
    id: "0",
    alias: "Quiet Nigerian Swan",
    emoji: "🦢",
    title: "I told my mum I've been struggling for months. she cried and said she never knew.",
    support: "heard",
    relates: 47,
    sitting: 18,
    hours: "2h",
    reactions: { heard: 55, same: 28, strong: 10, time: 5, brave: 2 },
    body: "I've been holding this for a long time. managing it, mostly. it gets hard in the evenings. last week I finally told her — sitting at her kitchen table, hands around tea, trying to find normal words for it. she went very quiet and then she cried. not out of pity. out of not knowing. that was somehow harder than anything.",
    reflection: "something about the way she said she never knew. that part is sitting with me too.",
    hall: "healing",
  },
  {
    id: "1",
    alias: "Defiant Kenyan Lion",
    emoji: "🦁",
    title: "I left a six-figure job and nobody in my family has spoken to me since.",
    support: "advice",
    relates: 83,
    sitting: 26,
    hours: "5h",
    reactions: { heard: 38, same: 41, strong: 12, time: 6, brave: 3 },
    body: "I gave seven years to that job. the salary was real, the title was real, and the thing it was slowly doing to me was also real. I left in January. I haven't regretted it for one day. but I also haven't spoken to my dad, my sister, or my aunt since the announcement. I don't know if I'm supposed to wait them out or reach out first.",
    reflection: "seven years is not a small thing to hand back. neither is the silence after.",
    hall: "brave",
  },
  {
    id: "2",
    alias: "Mortified Polish Hedgehog",
    emoji: "🦔",
    title: "I wrote a letter to my ex and sent it by accident to our whole group chat.",
    support: "heard",
    relates: 124,
    sitting: 11,
    hours: "6h",
    reactions: { heard: 22, same: 58, strong: 5, time: 10, brave: 5 },
    body: "full letter. three months of feelings. sent at 2am to the group chat we're both still in. the one with twelve people in it. I screenshotted the phone like that would somehow undo it. it did not undo it. fourteen people have now read my whole inner life. one of them left a heart emoji. I don't know if that's kind or devastating.",
    reflection: "fourteen people reading your inner life and one leaving a heart. that one is doing a lot of work.",
    hall: "relatable",
  },
  {
    id: "3",
    alias: "Patient Indian Dove",
    emoji: "🕊",
    title: "I've been going to therapy for two years and I finally cried today.",
    support: "heard",
    relates: 211,
    sitting: 34,
    hours: "1d",
    reactions: { heard: 61, same: 24, strong: 8, time: 5, brave: 2 },
    body: "i don't know what shifted. same room, same chair, same questions we've been circling for two years. she asked about my mother and something just — opened. i sat there ugly-crying for twenty minutes. on the train home I felt lighter than I have in years. also embarrassed. also relieved. i wanted to tell someone and this felt like the right room.",
    reflection: "two years of circling and then the thing you needed finally came up. that's how it tends to go.",
    hall: "healing",
  },
  {
    id: "4",
    alias: "Wistful Ethiopian Butterfly",
    emoji: "🦋",
    title: "My sister told me she's been scared of me since we were kids. I had no idea.",
    support: "heard",
    relates: 89,
    sitting: 31,
    hours: "3h",
    reactions: { heard: 42, same: 31, strong: 14, time: 8, brave: 5 },
    body: "she said it so quietly. we were doing the dishes. 'i've always been a bit scared of you.' i put the plate down and said 'of me?' and she nodded. i don't know what version of me she saw growing up. i genuinely don't. i've been sitting with that word — scared — for three days now.",
    reflection: "something you thought you knew about yourself and it turns out the story was different from where they were standing.",
    hall: "loving",
  },
  {
    id: "5",
    alias: "Tender Brazilian Hare",
    emoji: "🐇",
    title: "I'm the first person in my family to go to university and I'm failing.",
    support: "advice",
    relates: 156,
    sitting: 22,
    hours: "8h",
    reactions: { heard: 48, same: 37, strong: 9, time: 4, brave: 2 },
    body: "everyone at home thinks I'm doing fine. i send photos of the campus. i smile on calls. the truth is i've failed two modules and i've been hiding it. i don't know how to be the first one to do this and also the first one to fail at it. i don't know who i'd even be if i told them.",
    reflection: "the weight of being first at something includes the weight of feeling like you can't afford to struggle at it.",
    hall: "brave",
  },
];
