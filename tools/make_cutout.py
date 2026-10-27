#!/usr/bin/env python3
"""Turn a product photo on a plain white/light background into a transparent, tightly cropped PNG.

Usage:  python3 tools/make_cutout.py input.jpg assets/furniture/photos/s1.png [--tolerance 28] [--width 900]
Needs:  pip install pillow numpy   (only for this helper; the website itself has no dependencies)

Works best on a straight-on (front) product photo shot on white. For busy backgrounds, use a
background-remover (e.g. remove.bg, Photoshop, Canva) and save the PNG directly instead.
"""
import argparse
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--tolerance', type=int, default=28, help='how far from the corner colour still counts as background')
ap.add_argument('--width', type=int, default=900, help='output width in px (keeps file size small)')
a = ap.parse_args()

img = Image.open(a.src).convert('RGB')
if img.width > 1800: img = img.resize((1800, round(img.height * 1800 / img.width)), Image.LANCZOS)
w, h = img.size
marker = (255, 0, 255)
work = img.copy()
for pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)]:
    if work.getpixel(pt) != marker:
        ImageDraw.floodfill(work, pt, marker, thresh=a.tolerance)
bg = (np.array(work) == np.array(marker)).all(axis=2)
alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8'))
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))  # trim halo, soften edge
out = img.convert('RGBA'); out.putalpha(alpha)
bbox = out.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
if not bbox: raise SystemExit('Nothing left after removing the background. Try a higher --tolerance or a cleaner photo.')
out = out.crop(bbox)
if out.width > a.width: out = out.resize((a.width, round(out.height * a.width / out.width)), Image.LANCZOS)
out.save(a.dst, optimize=True)
print(f'saved {a.dst}  {out.width}x{out.height}px  aspect {out.width / out.height:.2f}')
