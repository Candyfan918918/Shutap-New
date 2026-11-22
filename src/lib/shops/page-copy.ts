// Shutap for small business: the words on the product page under the first
// screen (Nov 21 2026): how it works, what you get, how a business gets
// more views on its videos, about, and the questions people ask.
//
// Rules for every line here (Candy; claude/seo/seo-update-2026-11-21.md):
// - Only what the product does today. Nothing about sending to TikTok
//   (Part 2) or Pro for small business (Part 3) until they ship.
// - Never promise views, followers, customers or sales, and never a number
//   we did not measure.
// - What TikTok or Instagram does comes only from their own pages, listed
//   in SOURCES with the day each was read.
// - Never say Shutap writes it for you: Shutap drafts, the owner picks,
//   changes and films.
import { KEEP_DAYS, WEEK_GOAL } from './shop'
import { SHOP_VIDEO_CAPS } from '../entitlements'
import { PLANS, usd } from '../pricing'

export const SB_PATH = '/smallbusiness'
export const SB_TITLE = 'Funny Videos for Your Small Business, Made on Your Phone | Shutap'
export const SB_DESCRIPTION = `Want more views on your business videos? Say one thing that happened today, pick one of three funny skits about your own business, and film it on your phone. First ${SHOP_VIDEO_CAPS.free} videos free.`

const BASIC = usd(PLANS.basic.amount)

export const SB_STEPS: { title: string; body: string }[] = [
  { title: 'Say what happened', body: 'Talk or type one sentence about your day at work: a funny customer, a weird order, the thing everyone asked for. Nothing happened? Tap “Surprise me”.' },
  { title: 'Pick a skit and film it', body: 'Shutap drafts three short skits about your own business. Pick one, change any line, then film three short clips. The line to say is on the screen while you film.' },
  { title: 'Save it and post it', body: 'Your phone puts the clips together with the words on screen and your business at the end. Save the video and post it on TikTok, Instagram or anywhere else.' },
]

export const SB_GET: string[] = [
  'One vertical video of 7, 15 or 30 seconds, made from three clips you film',
  'The words on screen in one of five looks: Big caps, Classic, Marker, Comic or Typewriter',
  'Your own voice, recorded with the clips. Shutap adds no music; add a sound in TikTok or Instagram if you want one',
  'An end card with your logo, your business’s name and its address, in your logo’s color',
  'A code word, if you want one: customers say it at the counter for a freebie or a promotion you choose, and you count how many do',
  `Every video kept for ${KEEP_DAYS} days in My creations to download again`,
  `A weekly tracker that aims for ${WEEK_GOAL} videos a week, and an email reminder if you turn it on`,
  'No Shutap mark on your video',
]

export type ViewsPoint = { title: string; says: string; so: string }
/** How a small business gets more views on its videos: what the platforms
 *  themselves say (sourced), then what that means for one video. */
export const SB_VIEWS_INTRO = 'No tool can promise views, and Shutap does not. What TikTok and Instagram say they look at is public, though, and most of it comes down to one thing: whether people watch your video to the end and pass it on.'
export const SB_VIEWS: ViewsPoint[] = [
  { title: 'People watching to the end', says: 'TikTok calls someone watching a longer video from beginning to end a strong sign of interest. Instagram lists watching a reel all the way through among the predictions that matter most for Reels.', so: 'Keep it short and save the turn for the last line. A Shutap video is three shots, and the joke lands on the third.' },
  { title: 'People sharing it', says: 'Instagram names how likely someone is to reshare a reel first among those predictions. TikTok counts the videos people like and share and the comments they post.', so: 'Give people a reason to send it to a friend. A joke about something that really happened at a place they know is one.' },
  { title: 'You do not need followers first', says: 'TikTok says follower count, and whether an account has had hit videos before, are not direct factors in what it recommends. Instagram says most of the reels people see are from accounts they do not follow.', so: 'A new account can be seen. Each video stands on its own, so post the next one.' },
  { title: 'Sound on, no watermark, real footage', says: 'Instagram says it shows reels less when they are muted, watermarked, low-resolution or mostly text.', so: 'Shutap records your voice with the clips, films with your phone’s camera, and puts no Shutap mark on the video.' },
]
export const SB_SOURCES: { name: string; href: string; date: string }[] = [
  { name: 'TikTok Newsroom, “How TikTok recommends videos #ForYou”', href: 'https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/', date: 'published June 18, 2020; read Nov 21, 2026' },
  { name: 'Instagram, “Instagram Ranking Explained” by Adam Mosseri', href: 'https://about.instagram.com/blog/announcements/instagram-ranking-explained', date: 'published May 31, 2023; read Nov 21, 2026' },
]

export const SB_ABOUT: string[] = [
  'Shutap for small business is for owners with a phone and no creative team: coffee shops, restaurants, salons, barber shops, car shops, gyms, stores and any other small business with something happening at the counter.',
  'It is funny only. You pick the kind of funny: dry, warm, sassy or big and goofy. Shutap drafts the skits; you choose one, change what you like and film it. The joke is about the situation, never about a person, and Shutap never makes up a price, an offer or a fact about your business.',
  'It is made by the Shutap Humor Amplifier Lab. Founder: Candy Fan, Menlo Park, California. Questions: hello@shutap.com. Shutap is for adults 18 and over and is entertainment.',
]

export const SB_FAQ: { q: string; a: string }[] = [
  { q: 'What is Shutap for small business?', a: 'A way to make a short funny video about your own business on your phone. You say one thing that happened today, Shutap drafts three skits about your business, you pick one and change any line, film three short clips, and your phone puts them together into one video with the words on screen.' },
  { q: 'How much does it cost?', a: `Your first ${SHOP_VIDEO_CAPS.free} videos are free. After that, Basic is ${BASIC} a month for ${SHOP_VIDEO_CAPS.basic} new video every day for one business. An unused day does not carry over. Cancel anytime.` },
  { q: 'Will it get me more views?', a: 'Nobody can promise that, and we do not. What TikTok and Instagram say they look at is whether people watch to the end and share. A short skit with the turn on the last line is built for both. See “How a small business gets more views on its videos” on this page for what the platforms say, with their own pages linked.' },
  { q: 'Do I need to be funny?', a: 'No. You say what happened in your own words. Shutap drafts three skits and you pick. On any line you can tap “Funnier” to see three other ways to say it, or edit it yourself.' },
  { q: 'What if nothing funny happened today?', a: 'Tap “Surprise me”. The skits then come from the calendar and from what your business is known for.' },
  { q: 'Do I need to download an app?', a: 'No. It runs in your phone’s browser at shutap.com/smallbusiness. Your phone will ask to use the camera and microphone the first time you film.' },
  { q: 'Can I use it on a computer?', a: 'No. You film with your phone’s camera, so it works on a phone. On a computer the page shows a code to scan with your phone.' },
  { q: 'Does Shutap post the video for me?', a: 'No. You save the finished video to your phone and post it yourself on TikTok, Instagram or anywhere else.' },
  { q: 'Do I have to be on camera?', a: 'No. Choose “Me”, “Me + team” or “No faces”. With “No faces” every shot is hands, products and the counter. Never film a real customer.' },
  { q: 'What is the code word?', a: 'One to three words from the skit that customers can say at the counter for a freebie or a promotion you choose. It shows at the end of the video, and you tap a counter each time someone says it. You can also choose no code word.' },
  { q: 'Will Shutap invent a price or an offer?', a: 'No. A price, a discount or the word “free” appears only if you typed it yourself. Shutap does not make up hours, awards, products or staff.' },
  { q: 'Does it add music?', a: 'No. Your voice is recorded with the clips. You can add a sound inside TikTok or Instagram when you post.' },
  { q: 'Is there a Shutap logo on my video?', a: 'No, on any plan. The end of the video shows your own logo, name and address.' },
  { q: 'Who can see my videos, and how long are they kept?', a: `Only you. The three clips you film stay on your phone. The finished video is kept in private storage for ${KEEP_DAYS} days so you can download it again, then deleted, and you can delete it sooner. Shutap staff do not watch your videos, and they are never used to train AI models.` },
  { q: 'My business is not on Google. Can I still use it?', a: 'Yes. Type your business in yourself and add what it is known for.' },
  { q: 'I have more than one location. What do I do?', a: 'Basic covers one location. Pick the one you film at.' },
]
