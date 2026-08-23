# Instagram plan: freezer batch cocktails

Written 2026-08-23. Grounded in current reach mechanics (sources at the bottom) and in
the assets that already exist, not in assets we'd have to invent.

## The situation this is meant to fix

The site draws 1 to 4 real visitors a day. Search sends most of them, and search is
working: `/cocktails/paper-plane/` pulled 10 of its 11 pageviews from search engines.
Six newsletter signups exist in the site's whole history, and all six came from the
homepage during testing. The build is finished. The audience isn't there yet.

Instagram is the channel you want to run. Fine. Here's the version of it that has a
chance, and the honest constraint attached: this is a six-to-twelve-week play, not a
two-week one. Nothing below works if it runs for three weeks and stops.

## The asset you have and haven't used

Eight finished photos, one lamp, one wall, one slab of walnut. They're good, and they're
still lifes.

Still photos are the lowest-reach format on Instagram right now. Buffer's analysis of
four million posts puts carousels first, Reels second, single photos last. Your photos
are not the post. They're slides inside a post, and they're the closing frame of a
video.

The video you don't have yet is the whole thing: **the pour out of a frozen bottle.**
Batch cocktails come out viscous and slow, the glass fogs, the liquid moves like cold
syrup. Six seconds, no talking, no music required. That single shot is the most
scroll-stopping thing this project owns and it costs one bottle and ten minutes on a set
you've already built. Shoot it once for every recipe you photograph from here on: pour
first, then the still.

## Setup, once

**Handle and name field.** Instagram's search indexes the Name field as well as the
handle, and most people never fill it in. Handle: something short and unambiguous. Name field: `Freezer Batch Cocktails |
Make-Ahead Drinks`. That's where the keywords earn their keep.

**Bio.** Say the mechanism, not the vibe. Something close to: "Cocktails you batch on
Friday and pour from the freezer. No ice, no shaking, no bartending at your own party.
Free label sheet below."

**Link.** Point it at the site with a tracking tag so PostHog can actually see it:
`https://freezerbatchcocktails.com/?utm_source=instagram&utm_medium=bio&utm_campaign=profile`.
Change the campaign value per push and you'll know which post drove what. Right now
Instagram traffic would land as `$direct` and be invisible.

## The five posts you rotate

Never wonder what to post. Pick from these.

**1. The pour.** Reel. Frozen bottle, slow pour, glass fogging. Text on the first frame,
because roughly half of Reels play muted: "This sat in the freezer for nine days." End on
the still photo. Under 15 seconds.

**2. The timeline carousel.** Slide 1 is the finished drink and a date-shaped hook
("Batch Friday. Pour Saturday."). Slides 2 to 4 are the three steps. Final slide is the
ratio. Carousels get repeat distribution because unswiped slides get treated as new
content, so the last slide is worth as much as the first.

**3. The number.** One fact per post, the ones you actually know and other people don't.
The 22% ABV line and what slush looks like below it. Lime peaking in the first two to
three weeks. Vermouth oxidizing. These are the posts people send to a friend, and sends
are the top-weighted signal in 2026, above likes.

**4. The mistake.** "Your batch went slushy. Here's why." Problem on slide one, cause on
two, fix on three. Same energy as your blog guides, which are already good and already
written. This is repackaging, not new work.

**5. The set.** Occasional carousel of four finished photos, no teaching, just the
drinks. This is the one that makes the grid look like a real brand. Use it sparingly;
it's the lowest-reach format.

## Cadence

Three or four posts a week, spaced across days. Never dump two in a row, since stacking
posts causes Instagram to suppress one of them. Consistent accounts see close to five
times the engagement per post of sporadic ones, and that gap is the entire game for a new
account.

Pick two fixed days and hold them. Thursday and Sunday, or whatever fits your week. The
schedule matters more than the volume.

## Captions

Write the first line as the hook, since that's all anyone sees. Then the useful part.
Then a real question, because comments are worth more than likes and a question is the
cheapest way to earn them. "What are you batching for Labor Day" works because people
answer it.

Keywords in the caption, written as normal sentences. Instagram search reads captions
now. Five to ten hashtags at the end, not thirty. Hashtags no longer drive follows and
their ranking weight has dropped a lot, so they're a small bonus rather than a strategy.

## What to avoid

Watermarked video, especially anything with a TikTok logo, gets deprioritized outright.
Reposting identical content reads as low effort. "Like for part 2" style bait triggers
penalties. Blurry or badly lit video underperforms, which is not your problem given the
set you shoot on.

## The first two weeks, concretely

1. Set up the account, name field, bio, tracked link.
2. Shoot the pour for the Vieux Carré and the Margarita. Same set, phone propped, one
   take each.
3. Post the Margarita pour Reel. Caption ends with the Labor Day question.
4. Post the Labor Day timeline carousel, built from the guide going live this week.
5. Post the 22% ABV number post.
6. Post the four-photo set carousel.
7. Check PostHog for `utm_source=instagram`. If it's zero after two weeks of posting,
   the problem is reach, not the site, and we change the content mix rather than the
   site.

## On Pinterest, since you asked

Your instinct that it didn't work is probably right about what you tried, and probably
wrong about the platform. Cocktail content is close to Pinterest's ideal case. Two things
usually explain a flat result.

The first is format. Pins that travel are vertical, roughly 1000x1500, with a text
headline burned into the image. A bare photo with no overlay reads as decoration and gets
scrolled past. Your pipeline already produces a 1200x1500 card for every recipe, so a
text-overlay variant is a small change to `process.py` and not a new photoshoot.

The second is volume and patience. Pinterest is a search engine with a slow index.
Handfuls of pins over a few weeks produce nothing. Dozens of pins, several per recipe with
different headlines, over three to six months, is the shape that works.

That's a real cost, and Instagram is where you want to spend attention. My suggestion:
run Instagram properly, and when the photo set is finished, spend one afternoon generating
overlay pins from cards that already exist. It's cheap because the asset is already built.
If it does nothing in three months, drop it with evidence.

## Sources

- [How the Instagram Algorithm Works: Your 2026 Guide (Buffer)](https://buffer.com/resources/instagram-algorithms/)
- [Instagram algorithm in 2026: rank signals for growth (Later)](https://later.com/blog/how-instagram-algorithm-works/)
