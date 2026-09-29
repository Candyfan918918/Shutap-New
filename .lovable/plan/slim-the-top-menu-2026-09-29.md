# Slim the top menu

Keep only four links plus your profile, on the home page and every other page:

```text
[shutap]      joke cards   spill   scan   rooms   [profile / join →]
```

## What goes and where each link leads
- Removed from the bar: relationships, marriage, family, career, how it works, halls. Those pages stay up and can still be reached from the footer and search.
- **joke cards** opens the home page and scrolls to the cards (`/#joke`).
- **spill** opens the spill window (`/#spill`). Guests go to the join page first, the same way they do now.
- **scan** opens the scan window (`/#scan`), with the same guest handling.
- **rooms** opens `/stream`.
- **profile**: signed-in people see their name and emoji, which leads to their profile. Guests see "join →", which leads to `/welcome`.

## Technical details
- `src/pages/home/sections/Header.tsx`: replace the wide pillar list and the rooms/halls links with the four links. On mobile, keep them visible but tighter (smaller gaps and text) instead of hiding them.
- `src/components/GlobalHeader.tsx` (inner pages): same four links. spill and scan use `navigate({ to: '/', hash })` so HomePage's existing hash handler opens the window. joke cards uses hash `joke`. Remove the duplicate "spill it →" item from the profile dropdown. Keep profile, settings, mirror, admin and sign out in the dropdown.
- The same cleanup applies to the unused `Header.tsx` and `SiteHeader.tsx` so no old links are left behind.
- Check with Playwright: on the home page and on /stream, click each link and confirm where it lands.
