# Extra wording on the home page: what's there and what to cut

Everything below shows in or around the joke box, top to bottom. Tell me which numbers to remove. Anything you don't pick stays.

## Always visible
1. **Small line above the title:** "pseudonymous · no advice · different perspectives". *Suggest: cut or shorten.* "different perspectives" is vague.
2. **Under the box, next to the button:** "no account · names scrubbed" (guests) / "names scrubbed before anything saves" (signed in). *Suggest: keep one short version.*
3. **"how it works" link**, which opens three numbered lines:
   - i. "type what happened — names get scrubbed before anything saves." (repeats #2)
   - ii. "i write you a set of three, face-down: a take, a clapback, a roast. you turn over one."
   - iii. "five situations a day, at every tier. a guest flips one card of each; an alias flips all three and keeps them. members get every card clean — no mark — and the mirror reading." (long, a sales pitch)
   - "the full explanation →"
   *Suggest: remove the whole fold-out, or keep only line ii.*

## Only while typing
4. **Hints under the box:** "keep going — the specifics are what make it funny." (short text) and "that will do it." (longer text). *Suggest: cut "that will do it."*

## Only after you send
5. **Waiting text:** "writing your set…". *Suggest: keep, so people know it's working.*
6. **Short-story note:** "✦ thin one. the cards had little to hold on to — scan it and the story gets sharper. what they said, word for word, is the part that lands." *Suggest: cut or shorten to one line.*
7. **Serious-topic note:** "no jokes for this one." with "support lines →" and "say the long version instead". *Suggest: keep. This is the safety message.*

## Already removed
- "reading this as Backhanded Grandma"

## Not touched
- The footer lines and the page title are locked, so they stay as they are.

## Technical details
- All strings are in `src/pages/home/joke/JokeSurface.tsx` (~lines 1137–1245). Delete the chosen JSX blocks and their state (`howOpen`, `hint`) if they're no longer used.
