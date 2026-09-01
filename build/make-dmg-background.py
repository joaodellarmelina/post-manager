#!/usr/bin/env python3
"""Draws the DMG install window background (1x and 2x).

Finder renders the real app icon and the Applications alias on top of this
image, so it only paints the surroundings: the title, the caption and the
arrow between the two drop points. Coordinates here must stay in sync with
the `dmg.contents` positions in package.json.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 660, 400
SCALE = 2                      # draw at 2x, downsample for clean edges
ICON_Y = 196                   # icon centres, matches dmg.contents
APP_X, DEST_X = 170, 490

FONT = "/System/Library/Fonts/SFNS.ttf"


def font(size, style="Regular"):
    """SFNS is variable; its axes are [Width, Optical Size, GRAD, Weight], so
    selecting by axis index silently sets Width. Select by name instead."""
    f = ImageFont.truetype(FONT, size * SCALE)
    try:
        f.set_variation_by_name(style)
    except Exception:
        pass
    return f


def centred(d, y, text, f, fill):
    w = d.textbbox((0, 0), text, font=f)[2]
    d.text(((W * SCALE - w) / 2, y * SCALE), text, font=f, fill=fill)


img = Image.new("RGB", (W * SCALE, H * SCALE), "#FBFBFC")
d = ImageDraw.Draw(img)

# Soft vertical wash so the window has depth without looking busy.
for y in range(H * SCALE):
    t = y / (H * SCALE)
    v = int(251 - 12 * t)
    d.line([(0, y), (W * SCALE, y)], fill=(v, v, v + 2))

# A soft contact shadow grounds each icon without drawing a visible plate.
for cx in (APP_X, DEST_X):
    rx, ry = 52, 9
    cy = ICON_Y + 70
    for i in range(6):
        k = (6 - i) / 6
        d.ellipse(
            [(cx - rx * k) * SCALE, (cy - ry * k) * SCALE,
             (cx + rx * k) * SCALE, (cy + ry * k) * SCALE],
            fill=(int(246 - 4 * k), int(246 - 4 * k), int(248 - 4 * k)),
        )

# Arrow: a tapered shaft with a rounded head, pointing at Applications.
ax0, ax1 = APP_X + 96, DEST_X - 96
mid = ICON_Y
shaft_h = 4 * SCALE
d.rounded_rectangle(
    [ax0 * SCALE, mid * SCALE - shaft_h // 2, (ax1 - 16) * SCALE, mid * SCALE + shaft_h // 2],
    radius=shaft_h // 2,
    fill="#CDCDD2",
)
head = 13
d.polygon(
    [
        ((ax1 - 26) * SCALE, (mid - head) * SCALE),
        (ax1 * SCALE, mid * SCALE),
        ((ax1 - 26) * SCALE, (mid + head) * SCALE),
    ],
    fill="#C9C9CE",
)

centred(d, 50, "post manager", font(20, "Semibold"), "#1D1D1F")
centred(d, 82, "drag the app into your applications folder", font(12, "Regular"), "#86868B")
# Nothing below ~y=320: Finder's status and path bars eat into the visible
# height, and whether they show is a per-user preference.

img.resize((W, H), Image.LANCZOS).save("build/dmg-background.png")
img.save("build/dmg-background@2x.png")
print(f"wrote build/dmg-background.png ({W}x{H}) and @2x")
