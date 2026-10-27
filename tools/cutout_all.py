#!/usr/bin/env python3
"""Batch version of make_cutout.py.

Looks in assets/furniture/source/ for files named after product ids (s1.png, c2.jpg, ...), cuts out each
background into assets/furniture/photos/<id>.png, and lists the ids that now have a photo.
Ids with no source file are skipped, so you can run it with only a few images in place.

Usage:  python3 tools/cutout_all.py [--write]
  --write   also set PHOTO_IDS in js/data.js to the ids that have a photo in assets/furniture/photos/
Needs:  pip install pillow numpy

PRESETS holds per-image options tuned for the current source images (white-on-white items need extra help,
see the options in make_cutout.py). If you replace a source image with a different one, delete or adjust its entry.
"""
import argparse, re, shlex, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IDS = ['s1', 's2', 's3', 'c1', 'c2', 'c3', 't1', 't2', 't3', 'b1', 'b2', 'k1', 'k2', 'k3']
EXTS = ['.png', '.jpg', '.jpeg', '.webp']
PRESETS = {
    't3': '--edge 3 --seal 7 --rim 4',                                                    # white marble top
    'b1': '--edge 3 --seal 7 --rim 4 --poly "400,340 975,340 1095,590 1095,622 275,622 275,590"',  # white duvet
    'c2': '--poly "203,660 652,660 655,752 200,752"',                                     # cream seat cushion
    'k2': '--holes',                                                                      # open shelves
}

ap = argparse.ArgumentParser()
ap.add_argument('--src', default=str(ROOT / 'assets/furniture/source'))
ap.add_argument('--dst', default=str(ROOT / 'assets/furniture/photos'))
ap.add_argument('--data', default=str(ROOT / 'js/data.js'))
ap.add_argument('--no-presets', action='store_true', help='ignore PRESETS (use when the source images are different)')
ap.add_argument('--write', action='store_true')
a = ap.parse_args()
src, dst = Path(a.src), Path(a.dst)
dst.mkdir(parents=True, exist_ok=True)

for pid in IDS:
    found = next((src / (pid + e) for e in EXTS if (src / (pid + e)).exists()), None)
    if not found:
        print(f'{pid}: no source image, skipped')
        continue
    extra = [] if a.no_presets else shlex.split(PRESETS.get(pid, ''))
    r = subprocess.run([sys.executable, str(ROOT / 'tools/make_cutout.py'), str(found), str(dst / (pid + '.png'))] + extra,
                       capture_output=True, text=True)
    print(f'{pid}: ' + (r.stdout.strip() or r.stderr.strip().splitlines()[-1]))

done = [p for p in IDS if (dst / (p + '.png')).exists()]
line = 'var PHOTO_IDS = [' + ', '.join("'%s'" % p for p in done) + '];'
print('\n' + line)
if a.write:
    data = Path(a.data)
    text = data.read_text(encoding='utf-8')
    new, n = re.subn(r'var PHOTO_IDS = \[[^\]]*\];', line, text)
    if n != 1: sys.exit('Could not find the PHOTO_IDS line in ' + str(data))
    data.write_text(new, encoding='utf-8')
    print('Updated PHOTO_IDS in', data)
else:
    print('Run again with --write to put this in js/data.js.')
