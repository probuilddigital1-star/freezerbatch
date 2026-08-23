#!/usr/bin/env python3
"""
Freezer Batch Cocktails — the one and only photo pipeline.

Every one of the 18 recipe photos goes through this, unchanged. That is the whole
point: shot on different days, in different sessions, they still have to look like
one set. Do not tune it per photo. If a photo needs different treatment, the fix is
to reshoot it, not to fork the grade.

    python3 process.py IMG_1234.jpg dirty-martini

Writes:
    photos/masters/<slug>.jpg               EXIF rotation baked in, no colour changes
    public/images/cocktails/<slug>-full     graded, full frame
    public/images/cocktails/<slug>-card     1200x1500, the /cocktails grid card
    public/images/cocktails/<slug>-og       1200x630, social + email hero

Requires: pillow, numpy
"""
import sys, os
import numpy as np
from PIL import Image, ImageOps

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def load_upright(path):
    """Bake EXIF orientation into the pixels.

    Phone photos carry an orientation tag rather than rotated pixels. Browsers
    honour it, image optimisers routinely strip it during conversion, and the
    photo ships sideways. Rotating for real removes the whole class of bug.
    """
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert("RGB")
    return im


def grade(im):
    """Highlight-referenced white balance, then a light contrast lift.

    The reference is the least-saturated quarter of the brightest 1.5% of the
    frame. On a frosted glass that is the frost. On a clear glass over ice it is
    the ice and the rim specular — surfaces that carry the lamp's colour rather
    than the drink's, which is the thing the grade should correct against.

    Brightness alone is not enough: on an amber drink the lit liquid tops the
    luminance stack at saturation ~0.5, and anchoring on it cools the whole
    frame trying to neutralise the whiskey. Measured on the old fashioned, the
    brightness-only anchor asked for blue gain 1.36 where every frame under
    this lamp actually needs 1.04-1.16.

    Correction is applied at 62% strength so the wood keeps its warmth.
    """
    g = np.asarray(im).astype(np.float32)
    lu = g @ LUMA
    mx, mn = g.max(axis=2), g.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    bright = lu >= np.percentile(lu, 98.5)
    anchor = g[bright & (sat <= np.percentile(sat[bright], 25))]
    mr, mg, mb = anchor.mean(axis=0)
    tgt = (mr + mg + mb) / 3.0
    gains = 1.0 + (np.array([tgt / mr, tgt / mg, tgt / mb], np.float32) - 1.0) * 0.62
    g = np.clip(g * gains, 0, 255)

    black = np.percentile(g, 0.4)
    g = np.clip((g - black) * (255.0 / (255.0 - black)) / 255.0, 0, 1) ** 0.98

    amx, amn = anchor.max(axis=1), anchor.min(axis=1)
    asat = float(((amx - amn) / np.maximum(amx, 1)).mean())
    print("  anchor before R%.1f G%.1f B%.1f" % (mr, mg, mb))
    print("  anchor sat    %.2f%s" % (asat,
          "   <- above 0.35: nothing neutral in frame, check the shot" if asat > 0.35 else ""))
    print("  gains         R%.3f G%.3f B%.3f" % tuple(gains))
    return Image.fromarray((g * 255).astype(np.uint8))


def emit(im, outdir, name):
    """jpg for the fallback, webp for everyone else. Same pairing the existing
    homepage hero already uses, so the markup pattern does not have to change."""
    j = os.path.join(outdir, name + ".jpg")
    w = os.path.join(outdir, name + ".webp")
    im.save(j, quality=88, optimize=True)
    im.save(w, quality=82, method=6)
    print("  %-28s %6dKB jpg  %5dKB webp" % (name, os.path.getsize(j) >> 10,
                                             os.path.getsize(w) >> 10))


def find_rim(im):
    """Top of the vessel: the first row where the bright glass/frost mass starts.

    The set's framing is constant — dark wall above, lit vessel below — so the
    first row with a dense run of bright pixels in the centre band is the rim.
    Returns None if nothing triggers (then the caller falls back to the v1
    fixed offset)."""
    v = np.asarray(im).astype(np.float32).max(axis=2) / 255.0
    w = im.width
    band = v[:, int(w * 0.30):int(w * 0.70)]
    hits = (band > 0.45).sum(axis=1) > band.shape[1] * 0.10
    idx = np.flatnonzero(hits)
    return int(idx[0]) if idx.size else None


def crops(im, slug, outdir):
    fw, fh = im.size

    band = int(fw * 1.25)                       # 4:5
    top = int((fh - band) * 0.42)               # bias up: glass sits above centre
    card = im.crop((0, top, fw, top + band)).resize((1200, 1500), Image.LANCZOS)
    emit(card, outdir, f"{slug}-card")

    # the grid renders these around 380px wide. Ship one that size too rather
    # than making every visitor download 1200px and scale it down.
    emit(card.resize((760, 950), Image.LANCZOS), outdir, f"{slug}-card-760")

    oh = int(fw / 1.9048)                       # 1200x630
    # v2 (2026-08-22): anchor the social crop on the measured rim instead of a
    # fixed 16% offset. The fixed offset assumed the 47%-headroom template
    # framing; on tighter frames it sliced through the middle of the glass
    # (found on the margarita). Rim sits ~22% from the strip top so the banner
    # reads rim-and-drink with headline air above. Same rule for every photo.
    rim = find_rim(im)
    oy = int(rim - 0.22 * oh) if rim is not None else int(fh * 0.16)
    oy = max(0, min(oy, fh - oh))
    og = im.crop((0, oy, fw, oy + oh)).resize((1200, 630), Image.LANCZOS)
    emit(og, outdir, f"{slug}-og")


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: process.py <source.jpg> <recipe-slug>")
    src, slug = sys.argv[1], sys.argv[2]
    # script lives in scripts/photos/; outputs are repo-rooted, per photos/README.md
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    masters = os.path.join(root, "photos", "masters")
    web = os.path.join(root, "public", "images", "cocktails")
    os.makedirs(masters, exist_ok=True)
    os.makedirs(web, exist_ok=True)

    print(slug)
    up = load_upright(src)
    print("  %dx%d" % up.size)
    up.save(os.path.join(masters, f"{slug}.jpg"), quality=97, subsampling=0)

    g = grade(up)
    emit(g.resize((1000, round(1000 * g.height / g.width)), Image.LANCZOS), web, slug)
    crops(g, slug, web)
    print("  done")


if __name__ == "__main__":
    main()
