# Labor Day margarita push: what to post, where, and when

Built 2026-08-23 from the margarita shot on 08-22. Six images, all in this folder, all
using the site's own typefaces and palette so they read as the same brand as the pages.

## The files

**Pinterest, 1000x1500 (2:3, the ratio Pinterest favours)**

| File | Angle | Send it to |
|---|---|---|
| `pin-freezer-margarita.jpg` | Evergreen. Works all year. | the margarita recipe page |
| `pin-labor-day-margarita.jpg` | Seasonal. Dated to this weekend. | the new Labor Day guide |

**Instagram carousel, 1080x1350 (4:5, the tallest feed size)**

Post all four as one carousel, in this order. Carousels outrank single photos, and
unswiped slides get shown again as if they were new, so slide 4 is worth as much as
slide 1.

1. `ig-1-hero.jpg` The photo and the hook
2. `ig-2-timeline.jpg` The three dates
3. `ig-3-numbers.jpg` 22% ABV and 0% water
4. `ig-4-cta.jpg` The calculator and the link

If you would rather post a single image, post `ig-1-hero.jpg` on its own with the short
caption below.

## Timing

You asked for both out before Friday. Suggested order:

- **Pinterest: today or tomorrow.** Pinterest is a search engine with a slow index, so
  the earlier a pin goes up the more chance it has to surface. Post both pins, a few
  hours apart rather than back to back.
- **Instagram: Tuesday or Wednesday.** Close enough to Friday that "batch Friday" reads
  as this week, far enough ahead that people can buy tequila.

One honest note on the seasonal pin. Pinterest users plan holidays weeks out, so the
ideal window for a Labor Day pin was early August. This one is late for the peak, but it
still catches last-minute searches, and Pinterest pins keep working, so it will be in
place early for next year.

## Instagram caption (carousel)

> A margarita batched this Friday is at its best over Labor Day weekend.
>
> Fresh lime is the clock. It is brightest for the first two or three weeks in the
> freezer, so Friday the 28th puts the bottle at day 8 to 10 on the holiday, citrus
> still sharp.
>
> No water in this one. The lime is already doing that job. Keep it at 22% ABV or higher
> and it pours straight from the freezer instead of setting into a block.
>
> Ten minutes of work on Friday, then nothing until you pour. Swipe for the three dates.
>
> What are you batching for Labor Day?
>
> #freezercocktails #batchcocktails #makeaheadcocktails #margarita #cocktailrecipes
> #homebar #laborday #entertainingathome

The question at the end is doing real work. Comments count for more than likes, and a
question people can answer in three words is the cheapest way to get them.

## Instagram caption (single image, if you skip the carousel)

> Batched this Friday, best over Labor Day weekend.
>
> Fresh lime is the clock on a margarita batch, brightest in the first two or three weeks.
> Friday the 28th puts the bottle at day 8 to 10 on the holiday. No added water, 22% ABV
> or higher, and it pours straight from the freezer.
>
> Recipe and a calculator for your bottle size at the link in bio.
>
> What are you batching for Labor Day?
>
> #freezercocktails #batchcocktails #makeaheadcocktails #margarita #cocktailrecipes
> #homebar #laborday

## Pinterest copy

**Pin 1, `pin-freezer-margarita.jpg`**

Title: `Make-Ahead Freezer Margaritas (No Ice, No Shaking)`

Description:
> A freezer batch margarita you make once and pour all weekend. No ice, no shaking, no
> standing behind a bar at your own party. The batch keeps its edge for two to three
> weeks while the lime is fresh, and it pours straight from the freezer at 22% ABV or
> higher. Free calculator sizes the recipe to whatever bottle you have.

Link:
```
https://freezerbatchcocktails.com/cocktails/margarita/?utm_source=pinterest&utm_medium=pin&utm_campaign=margarita-evergreen
```

**Pin 2, `pin-labor-day-margarita.jpg`**

Title: `Labor Day Margaritas You Batch on Friday`

Description:
> Batch margaritas on Friday, August 28 and they are at their best over Labor Day
> weekend, day 8 to 10, with the citrus still sharp. Ten minutes of work, one bottle in
> the freezer, and the drinks are finished before the first guest arrives. Includes the
> full hosting timeline and a taste check three days out.

Link:
```
https://freezerbatchcocktails.com/blog/batch-ahead-for-labor-day/?utm_source=pinterest&utm_medium=pin&utm_campaign=labor-day
```

That guide page is written and sitting in the repo but is not deployed yet. If you pin
before Claude Code ships it, send pin 2 to the margarita recipe page instead and edit the
destination afterwards. Pinterest lets you change a pin's link after publishing.

**Board.** Make one board and name it for what people search, not for the brand. Something
like "Make-Ahead Cocktails" or "Freezer Batch Cocktails". Board names are indexed.

## Instagram bio link

Use this so the traffic is visible in PostHog instead of landing as direct:

```
https://freezerbatchcocktails.com/?utm_source=instagram&utm_medium=bio&utm_campaign=labor-day
```

Change `utm_campaign` for each push and you will know which post drove what.

## What to check after

Give it a week, then look at PostHog for `utm_source=instagram` and `utm_source=pinterest`.
Two outcomes worth acting on:

- Traffic arrives and nobody signs up. That is a page problem, and the signup placement
  fix already queued for Claude Code is the answer.
- No traffic at all. That is a reach problem, and the answer is the pour video described
  in the Instagram plan, not more still photos.

## Regenerating these for other recipes

The generator is `make_social.py`, kept in the Cowork session alongside the converted
Cormorant Garamond and Outfit font files. Ask and it will rebuild the same six layouts
for the negroni, manhattan or vieux carré, which are the other three finished photos.
