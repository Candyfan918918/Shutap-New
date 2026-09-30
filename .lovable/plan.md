# Remove the "reading this as Backhanded Grandma" line

## What you saw
After you type a situation, a small line appears under the box: "✦ reading this as **Backhanded Grandma**" (or "Boundary Bulldozer", "Uninvited Visitor", etc.). It's an internal sorting label the joke writer uses to pick its angle. It was never meant as copy, it often doesn't fit what you wrote, and it reads oddly — especially on a phone where it sits right above the cards.

## Change
- Stop showing that line on every screen size. The writer still uses the label behind the scenes, so the jokes don't change.
- Nothing else on the page moves or changes.

## Check
- Type a situation on a phone-size screen and confirm the line no longer appears and the cards still deal.

## Technical details
- `src/pages/home/joke/JokeSurface.tsx` ~line 1233: delete the `set.archetype !== 'general'` block that renders `ARCHETYPE_LABEL`; drop the now-unused import.
