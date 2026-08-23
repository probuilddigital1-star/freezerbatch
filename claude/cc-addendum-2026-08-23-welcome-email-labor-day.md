# Addendum to the republish: a timely line in the welcome email

Approved 2026-08-23. Fold this into Task 4 rather than running it separately, since the
welcome template is being rebuilt anyway to restore the image row.

## Why

The welcome email delivers the label sheet and nothing else. That was fine when nobody
was arriving. It is not fine now: the Instagram account went live today pointing at Labor
Day margaritas, and anyone who signs up from that post gets labels and no mention of the
thing they came for. The owner hit this himself, signed up, and asked where the recipe
was. The Labor Day content exists at `/blog/batch-ahead-for-labor-day/` and is live.

Confirmed healthy: the welcome email itself arrives. The gap is content, not delivery.

## The block to add, live now through Mon Sep 7

Place it after the label-sheet section and before the sign-off. Match the existing
utility-line treatment, the same styling as the batch-timing-sheet line in the monthly
issue template.

> **Batching for Labor Day?** Friday, August 28 is the day. A margarita batched then is
> at its best over the weekend of the 5th, with the lime still sharp. The whole timeline
> is three dates long.
>
> [Batch your Labor Day margaritas on Friday](https://freezerbatchcocktails.com/blog/batch-ahead-for-labor-day/)

## The replacement, from Tue Sep 8

**This is dated copy in an evergreen email, so it has to be swapped, not left.** Put a
comment in the template naming the date and the replacement, so whoever opens the file
next does not have to work out whether it is still current.

> **Not sure where to start?** The guides cover the calls that decide whether a batch
> lands: how much water, how sweet, and how long the citrus really holds.
>
> [Read the guides](https://freezerbatchcocktails.com/blog/)

## One operational note

`APPLY.md` aborts if any node beyond the two expected build nodes differs. Adding this
block may or may not stay inside those two, depending on how the welcome template is
carried. Verify which nodes change before the PUT and say so in your report. If it does
touch a third node, stop and tell me rather than widening the allow-list on your own.

## Verification

The existing live-signup test already covers this. Add to it: the welcome email arrives
carrying the label sheet, the footer address, the restored image row rendering rather
than broken, and the Labor Day block with a link that resolves to the guide rather than
a 404.
