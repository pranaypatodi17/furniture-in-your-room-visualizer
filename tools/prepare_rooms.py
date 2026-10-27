#!/usr/bin/env python3
"""Turn generated room images into web-ready backgrounds.

Reads assets/rooms/source/{living,bedroom,dining,compact,loft,study-bedroom}.(png|jpg|jpeg|webp), resizes each to at most 1600 px wide,
saves assets/rooms/<name>.jpg (quality 84) and prints the aspect ratio to put in js/data.js.
Needs:  pip install pillow
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, DST = ROOT / 'assets/rooms/source', ROOT / 'assets/rooms'
for name in ['living', 'bedroom', 'dining', 'compact', 'loft', 'study-bedroom']:
    found = next((SRC / (name + e) for e in ['.png', '.jpg', '.jpeg', '.webp'] if (SRC / (name + e)).exists()), None)
    if not found:
        print(f'{name}: no source image, skipped')
        continue
    img = Image.open(found).convert('RGB')
    if img.width > 1600: img = img.resize((1600, round(img.height * 1600 / img.width)), Image.LANCZOS)
    out = DST / (name + '.jpg')
    img.save(out, quality=84, optimize=True, progressive=True)
    print(f'{name}: saved {out.name}  {img.width}x{img.height}px  aspect {img.width / img.height:.2f}  {out.stat().st_size // 1024} KB')
