#!/usr/bin/env python3
"""Turn a product photo on a plain white/light background into a transparent, tightly cropped PNG.

Usage:  python3 tools/make_cutout.py input.jpg assets/furniture/photos/s1.png [options]
Needs:  pip install pillow numpy   (only for this helper; the website itself has no dependencies)

Works best on a straight-on (front) product shot on white or light grey, including soft floor shadows.
The background is found by flooding in from the image border across light, neutral pixels, and the flood
is stopped by edges, so the item's outline is kept. White items on white can leak, so these help:
  --edge N     edge sensitivity (default 5). Lower (3) stops the flood at fainter outlines, e.g. white marble.
  --seal N     odd number of px used to thicken edges so thin gaps in an outline are closed (default 3; try 7).
  --rim N      after sealing, also remove N px of plain light pixels next to the background (try 4 with --seal 7).
  --holes      also clear fully enclosed areas that match the background (open shelves, frames).
  --poly "x,y x,y ..."  paint a polygon (pixels of the input image) back in as part of the item. Repeatable.
                        Last resort for a white part that vanished, e.g. a white cushion or duvet.
  --width N    max output width in px (default 720); height is also capped at 820 to keep files small.
For busy backgrounds, use a background-remover (remove.bg, Canva, Photoshop) and save the PNG directly.
"""
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--edge', type=float, default=5.0)
ap.add_argument('--seal', type=int, default=3)
ap.add_argument('--rim', type=int, default=0)
ap.add_argument('--sat', type=int, default=38, help='max colour saturation that still counts as a neutral background/shadow')
ap.add_argument('--holes', action='store_true')
ap.add_argument('--poly', action='append', default=[])
ap.add_argument('--width', type=int, default=720)
a = ap.parse_args()

img = Image.open(a.src).convert('RGB')
if img.width > 1400: img = img.resize((1400, round(img.height * 1400 / img.width)), Image.LANCZOS)
arr = np.asarray(img).astype(np.float32); h, w, _ = arr.shape
lum = arr.mean(axis=2); sat = arr.max(axis=2) - arr.min(axis=2)
light = (sat < a.sat) & (lum > 150)                                   # background, floor and soft shadow candidates

blur = np.asarray(img.convert('L').filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
gx = np.abs(np.diff(blur, axis=1, prepend=blur[:, :1])); gy = np.abs(np.diff(blur, axis=0, prepend=blur[:1, :]))
edge = np.maximum(gx, gy) > a.edge
edge = np.asarray(Image.fromarray((edge * 255).astype('uint8')).filter(ImageFilter.MaxFilter(a.seal))) > 0


def flood_from_border(mask):
    """Return the part of `mask` (bool) that is connected to the image border."""
    m = Image.fromarray((mask * 255).astype('uint8')).copy()   # copy(): fromarray gives a read-only image
    for x in range(0, w, 5):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, h, 5):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    return np.asarray(m) == 128


bg = flood_from_border(light & ~edge)
if a.rim:
    grown = np.asarray(Image.fromarray((bg * 255).astype('uint8')).filter(ImageFilter.MaxFilter(2 * a.rim + 1))) > 0
    bg = bg | (grown & light)
if a.holes:
    bgc = np.median(np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]]), axis=0)
    like = (np.abs(arr - bgc).max(axis=2) < 9) & ~bg
    like = Image.fromarray((like * 255).astype('uint8')).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    bg = bg | (np.asarray(like) > 0)
subject = ~bg

# drop detached specks and floating shadow blobs: label at 1/4 scale, keep blobs >= 4% of the largest
k = 4; small = subject[::k, ::k]; sh, sw = small.shape; lab = np.zeros(small.shape, np.int32); sizes = [0]
for y0 in range(sh):
    for x0 in range(sw):
        if small[y0, x0] and not lab[y0, x0]:
            sizes.append(0); idn = len(sizes) - 1; stack = [(y0, x0)]; lab[y0, x0] = idn
            while stack:
                y, x = stack.pop(); sizes[idn] += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < sh and 0 <= xx < sw and small[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = idn; stack.append((yy, xx))
if max(sizes) == 0: raise SystemExit('Nothing left after removing the background. Try a cleaner photo.')
keep = np.array([i != 0 and sizes[i] >= 0.04 * max(sizes) for i in range(len(sizes))])[lab]
keep = Image.fromarray((keep * 255).astype('uint8')).resize((w, h), Image.NEAREST).filter(ImageFilter.MaxFilter(2 * k + 1))
subject = subject & (np.asarray(keep) > 0)

if a.poly:
    pm = Image.fromarray((subject * 255).astype('uint8')).copy(); pd = ImageDraw.Draw(pm)
    for poly in a.poly: pd.polygon([tuple(float(c) for c in pt.split(',')) for pt in poly.split()], fill=255)
    subject = np.asarray(pm) > 0

mask = Image.fromarray((subject * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
alpha = mask.filter(ImageFilter.GaussianBlur(1.0))                       # soften the edge
out = img.convert('RGBA'); out.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
out = out.crop(bbox)
scale = min(1.0, a.width / out.width, 820 / out.height)
if scale < 1: out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
out.save(a.dst, optimize=True)
print(f'saved {a.dst}  {out.width}x{out.height}px  aspect {out.width / out.height:.2f}  (input bbox {bbox} of {w}x{h})')
