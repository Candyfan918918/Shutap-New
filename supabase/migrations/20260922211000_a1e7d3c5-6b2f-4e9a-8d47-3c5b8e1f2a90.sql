-- Hall of fame: the founder's approved product-mode rows from the joke
-- ledger (shutap-situations-and-jokes.xlsx → src/lib/jokes/jokenet.json).
--
-- Admission (spec §5, "requires the build"): the founder's approval is
-- the human half; the code half is scripts/jokenet-sync.ts, which runs
-- every approved row through the hard rules and guardrails A–E against
-- its own situation and refuses what fails. 72 approved rows, 71 admitted.
-- Refused, and why, in the script's report:
--   #12  "…You're the last stop on a notification chain…" — Guardrail A
--        (a predicate nominative on the user; the spill has another adult,
--        so A is total, no allowlist)
--   #113 "Rent." and #130 "Client-facing." — one-word clapbacks; admitted
--        once the hard rules allowed a one-word clapback (this release),
--        so they are in the list below.
-- voice_key and archetype are null: the rows work in any voice, and the
-- ledger's archetypes (family / work / other) are not the matcher's.
-- Re-runnable: a row already present by text and situation is skipped.
-- Nothing is deleted.
INSERT INTO public.joke_hall_of_fame (slot, voice_key, archetype, situation_clean, joke_text, source)
SELECT v.slot, NULL, NULL, v.situation, v.joke, v.source FROM (VALUES
  ('the_take', 'Opened a spreadsheet called ''Household Budget'' and it''s a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.', 'The scale needed a 1 before it could give you a 4. He sat down and decided what a 1 was. Then he made the coffee.', 'jokenet:4'),
  ('the_clapback', 'Opened a spreadsheet called ''Household Budget'' and it''s a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.', '"Add a row for this morning. ''Made coffee, said nothing.'' Severity — you tell me. You built the scale."', 'jokenet:5'),
  ('the_roast', 'Opened a spreadsheet called ''Household Budget'' and it''s a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.', 'He didn''t make you coffee. Compliance did. Every time he went quiet and went upstairs, that was a row — column D, severity 3, 9:42 p.m. The coffee is the opening entry on a new tab. He''s watching how you take it. He needs a 5.', 'jokenet:6'),
  ('the_clapback', 'Found out from an Instagram tag that my husband''s been a sperm donor for a couple at his gym for 8 months. He asked if we could ''table it'' till after his work trip.', '"Tabled. What''s on the agenda after the trip — the eight months, or the ninth?"', 'jokenet:13'),
  ('the_roast', 'Found out from an Instagram tag that my husband''s been a sperm donor for a couple at his gym for 8 months. He asked if we could ''table it'' till after his work trip.', 'He didn''t have a gym membership. He had a program. Eight months, one couple, a progress photo somebody else posted. Sure, table it. That item comes back on its own — around month nine, seven pounds, and it has his jaw.', 'jokenet:14'),
  ('the_take', 'I feel useless that I''m in my 30s and still need my parents'' financial support.', 'Nothing changed at thirty except the number. The economy''s the one still living at home.', 'jokenet:15'),
  ('the_clapback', 'I feel useless that I''m in my 30s and still need my parents'' financial support.', '"Call it a loan and I''ll call you Sunday. That''s the interest."', 'jokenet:16'),
  ('the_roast', 'I feel useless that I''m in my 30s and still need my parents'' financial support.', 'Your parents aren''t helping. They''re investors. Fifteen years in, no exit, updates at Sunday dinner. Series A was college. Series B landed this morning. Memo: "groceries."', 'jokenet:17'),
  ('the_take', 'My mother-in-law said I gave her cancer.', 'The diagnosis came from a doctor. She''s been running a second opinion on you since the wedding.', 'jokenet:22'),
  ('the_clapback', 'My mother-in-law said I gave her cancer.', '"I wish I had that power."', 'jokenet:23'),
  ('the_roast', 'My mother-in-law said I gave her cancer.', 'She said gave. Like a gift.', 'jokenet:24'),
  ('the_take', 'My mother-in-law said I gave her an autoimmune disease.', 'Her body turned on her. She turned on you. Nobody in that house takes the blame, not even the cells.', 'jokenet:29'),
  ('the_clapback', 'My mother-in-law said I gave her an autoimmune disease.', '"You must be feeling better now cuz you ain''t got nothing healthy in you to attack."', 'jokenet:30'),
  ('the_roast', 'My mother-in-law said I gave her an autoimmune disease.', 'Her own body filed a complaint against her. She forwarded it to you.', 'jokenet:31'),
  ('the_take', 'My mother-in-law told me I stole her son from her.', 'She married a man out of his mother''s house and calls it a wedding. You did the same thing and it''s a felony.', 'jokenet:38'),
  ('the_clapback', 'My mother-in-law told me I stole her son from her.', '"Stole? That''s how you got father-in-law?"', 'jokenet:39'),
  ('the_roast', 'My mother-in-law told me I stole her son from her.', 'She reported him stolen. Last seen leaving the basement, carrying his own laundry, voluntarily. The police have a form for that. It''s a change of address.', 'jokenet:40'),
  ('the_take', 'My mother-in-law told me I stole her son from her.', 'She held him for thirty years and calls the first person who opened the door a thief.', 'jokenet:41'),
  ('the_roast', 'My mother-in-law told me I stole her son from her.', 'She said stole. He wasn''t in a vault. He was in her basement with a mini fridge and his laundry done. Nobody stole him. Somebody finally rang the bell.', 'jokenet:42'),
  ('the_take', 'My mother-in-law told me we could pay her for day care for our baby.', 'Other grandmothers ask to hold the baby. She asked for a rate.', 'jokenet:46'),
  ('the_clapback', 'My mother-in-law told me we could pay her for day care for our baby.', '"No. I don''t pay for incompetence."', 'jokenet:47'),
  ('the_roast', 'My mother-in-law told me we could pay her for day care for our baby.', 'She''s a business now. The staff is her, the client is her son, the product is her grandchild. She''ll hold the baby for free, in photos.', 'jokenet:48'),
  ('the_take', 'My MIL said she was gonna file for custody of our daughter because we wouldn''t let her see her.', 'She thinks a court can make us let her in. It can. Once. With a bailiff.', 'jokenet:53'),
  ('the_clapback', 'My MIL said she was gonna file for custody of our daughter because we wouldn''t let her see her.', '"File it. Also a restraining order on us all, so we never get close to you."', 'jokenet:54'),
  ('the_roast', 'My MIL said she was gonna file for custody of our daughter because we wouldn''t let her see her.', 'She''s going to court to get closer to the baby. Court is where we get the number for how far away she stays. Fifty feet is standard. We''re asking for a hundred.', 'jokenet:55'),
  ('the_take', 'My MIL said she was gonna file for custody of our daughter because we wouldn''t let her see her.', 'Grandmothers who don''t get enough visits bring cookies. She brought a lawyer.', 'jokenet:56'),
  ('the_take', 'Me leaving my house at 8:30am hoping I make it to work by 8:00am.', 'You left at 8:00 in spirit and 8:30 in Honda.', 'jokenet:60'),
  ('the_clapback', 'Me leaving my house at 8:30am hoping I make it to work by 8:00am.', '"I''m not late. Everyone else is early."', 'jokenet:61'),
  ('the_roast', 'Me leaving my house at 8:30am hoping I make it to work by 8:00am.', 'Walk in at 8:50 like you''re coming from a funeral. You are. 8:00 is dead.', 'jokenet:62'),
  ('the_take', 'My mother-in-law calling my baby ''her baby''.', 'She says "her baby" the way she says "her kitchen" at your house.', 'jokenet:74'),
  ('the_clapback', 'My mother-in-law calling my baby ''her baby''.', '"Your baby? Then the 3 a.m. feed is yours. Every night."', 'jokenet:75'),
  ('the_clapback', 'My mother-in-law calling my baby ''her baby''.', '"You have a baby. I married him."', 'jokenet:76'),
  ('the_roast', 'My mother-in-law calling my baby ''her baby''.', 'Her baby? Walgreens sells a DNA test for that. $99, results in five days.', 'jokenet:77'),
  ('the_take', 'My ex-MIL said ''shit or get off the pot'' when I told her I was depressed.', 'You said "depressed." She heard "toilet."', 'jokenet:81'),
  ('the_clapback', 'My ex-MIL said ''shit or get off the pot'' when I told her I was depressed.', '"I will. Shit on you. Get off you."', 'jokenet:82'),
  ('the_roast', 'My ex-MIL said ''shit or get off the pot'' when I told her I was depressed.', 'Her advice is plumbing. Look what came out of her.', 'jokenet:83'),
  ('the_take', 'My MIL told me she has to get used to the fact that her son is going to be some other woman''s husband.', 'That''s not a mother talking. That''s the first wife.', 'jokenet:98'),
  ('the_clapback', 'My MIL told me she has to get used to the fact that her son is going to be some other woman''s husband.', '"You will. Your mother-in-law did."', 'jokenet:99'),
  ('the_roast', 'My MIL told me she has to get used to the fact that her son is going to be some other woman''s husband.', 'Everyone else came to the wedding with a gift. She came as the widow.', 'jokenet:100'),
  ('the_take', 'I get mad at everyone around me and can''t explain why to myself or them.', 'The anger clocked in. The reason is in traffic.', 'jokenet:102'),
  ('the_clapback', 'I get mad at everyone around me and can''t explain why to myself or them.', '"If I knew why, I''d have picked someone who deserved it."', 'jokenet:103'),
  ('the_roast', 'I get mad at everyone around me and can''t explain why to myself or them.', 'The reason''s like keys. It''s in the coat from March. You''ll find it looking for something else.', 'jokenet:104'),
  ('the_take', 'Why am I lactose intolerant?', 'You''re not lactose intolerant. You''re factory settings. The people who can drink milk are the mutants.', 'jokenet:109'),
  ('the_clapback', 'Why am I lactose intolerant?', '"It''s not you. It''s lactose. Milk is made for a calf."', 'jokenet:110'),
  ('the_roast', 'Why am I lactose intolerant?', 'Eight thousand years ago some farmers took a dare and never stopped. You''re descended from the people who said no.', 'jokenet:111'),
  ('the_take', 'Why am I sad?', 'You can''t afford syrup in your coffee.', 'jokenet:112'),
  ('the_clapback', 'Why am I sad?', '"Rent."', 'jokenet:113'),
  ('the_roast', 'Why am I sad?', '$2,400 a month for a view of a wall.', 'jokenet:114'),
  ('the_take', 'I sent a screenshot of my boss to my boss.', 'You didn''t send the wrong screenshot. You sent the evidence to the violator.', 'jokenet:120'),
  ('the_clapback', 'I sent a screenshot of my boss to my boss.', '"Now we''ve both seen it."', 'jokenet:121'),
  ('the_roast', 'I sent a screenshot of my boss to my boss.', 'Time to update your LinkedIn status to: open for job.', 'jokenet:122'),
  ('the_take', 'I sent a screenshot of my boss to my boss.', 'That''s not a mistake. That''s two weeks'' notice as a JPEG.', 'jokenet:123'),
  ('the_clapback', 'I sent a screenshot of my boss to my boss.', '"That was for your boss."', 'jokenet:124'),
  ('the_take', 'I paid for my boob job with my corporate business card (by accident).', 'Finance has a category for that. It''s called "Team Building."', 'jokenet:129'),
  ('the_clapback', 'I paid for my boob job with my corporate business card (by accident).', '"Client-facing."', 'jokenet:130'),
  ('the_roast', 'I paid for my boob job with my corporate business card (by accident).', 'Every time you present now, the whole conference room stares at the ceiling.', 'jokenet:131'),
  ('the_take', 'I paid for my boob job with my corporate business card (by accident).', '"By accident" is a word for coffee. This had a consult.', 'jokenet:132'),
  ('the_roast', 'I paid for my boob job with my corporate business card (by accident).', 'Accidents don''t come with a deposit, a consultation, and a follow-up appointment. That''s not an accident. That''s a project plan on the wrong card.', 'jokenet:133'),
  ('the_take', 'I accidentally revealed the baby''s gender to the mom by rereading the cake order out loud.', 'Nine months of waiting, undone by a girl checking the order.', 'jokenet:136'),
  ('the_clapback', 'I accidentally revealed the baby''s gender to the mom by rereading the cake order out loud.', '"I say ''boy'' to everyone."', 'jokenet:137'),
  ('the_roast', 'I accidentally revealed the baby''s gender to the mom by rereading the cake order out loud.', 'Forty people are coming to find out what she found out at the bakery cashier.', 'jokenet:138'),
  ('the_take', 'I accidentally revealed the baby''s gender to the mom by rereading the cake order out loud.', 'The reveal already happened. The party''s just cake now.', 'jokenet:139'),
  ('the_take', 'I sent a ''you''re hired, welcome to the team'' email to all 12 people who interviewed for the one position.', 'You didn''t fill a position. You founded a department.', 'jokenet:144'),
  ('the_clapback', 'I sent a ''you''re hired, welcome to the team'' email to all 12 people who interviewed for the one position.', '"We''re scaling."', 'jokenet:145'),
  ('the_roast', 'I sent a ''you''re hired, welcome to the team'' email to all 12 people who interviewed for the one position.', 'Quit tonight. Move states. Let the twelve sort out the desk.', 'jokenet:146'),
  ('the_take', 'I work in HR, accidentally terminated myself in the system.', 'You''re the first person HR ever fired who deserved it.', 'jokenet:148'),
  ('the_clapback', 'I work in HR, accidentally terminated myself in the system.', '"Testing the workflow."', 'jokenet:149'),
  ('the_roast', 'I work in HR, accidentally terminated myself in the system.', 'Your exit interview is with you, and you''re not returning your own calls.', 'jokenet:150'),
  ('the_take', 'Being a mom I feel overstimulated. Hamster wheel going and going.', 'You''re a hamster with a mortgage.', 'jokenet:153'),
  ('the_clapback', 'Being a mom I feel overstimulated. Hamster wheel going and going.', '"Someone stop the hamster spinning wheel."', 'jokenet:154'),
  ('the_roast', 'Being a mom I feel overstimulated. Hamster wheel going and going.', 'God closed the oven door, and opened the washer door.', 'jokenet:155')
) AS v(slot, situation, joke, source)
WHERE NOT EXISTS (SELECT 1 FROM public.joke_hall_of_fame h WHERE h.joke_text = v.joke AND h.situation_clean = v.situation);
