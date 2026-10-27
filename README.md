# RoomView – Furniture-in-Your-Room Visualizer (static demo)

A polished, fully static demo: upload a room photo (or pick a sample room), choose furniture, move/resize/rotate it in the room, and see real-world dimensions with clearance checks. Built with plain HTML, CSS and vanilla JavaScript. No backend, no build step, no dependencies, no network calls.

## Run it

Open `index.html` in any modern browser (double-click it). That's all. Works from `file://`.

Optional local server: `python3 -m http.server` then visit http://localhost:8000.

## Structure

```
index.html            single-page app (hash navigation: #home #visualizer #saved #shortlist #retailer)
css/styles.css        design system (colour tokens at the top)
js/data.js            sample rooms, 14 products, saved-design seeds, retailer analytics, BRAND
js/app.js             all behaviour
assets/rooms/*.jpg    4 sample room backgrounds (AI-generated; raw images in assets/rooms/source/, resize with tools/prepare_rooms.py)
assets/furniture/*.svg 14 transparent furniture cut-outs (front view)
```

Rebrand: edit `BRAND` in `js/data.js` (name, tagline, currency) and the CSS variables in `:root`.

## What is real vs. simulated

**Simulated**
- The "preview" is a flat 2D illustration overlaid on the room image. There is no AI, 3D rendering, perspective correction, lighting or occlusion. It is labelled "Simulated preview" in the UI.
- Room and furniture images are original SVG illustrations (no stock photography is bundled so the project works offline with no licensing issues). Swap in your own photos/PNG cut-outs by changing the `image` paths in `js/data.js`.
- Retailer analytics (previews, shortlists, fit rates, weekly trend) are hardcoded sample numbers. Only "Saved room designs" is live.
- Availability, prices and checkout: sample data only; there is no checkout.

**Realism features (still a 2D illustration, not a render)**
- Depth-aware scale: furniture grows as you drag it towards the camera (`persp` in `js/app.js`; adjustable as "Depth perspective" in room settings).
- Contact shadow under each piece, fabric/wood texture baked into the SVG sprites, and a per-item "Lighting match" slider to blend with a photo's brightness.
- Pieces are drawn back-to-front by floor position, so nearer items overlap farther ones.
- The biggest realism gain comes from uploading a real, straight-on room photo.

**Multiple items**
- Every product you click is added to the room (up to 8) and auto-arranged without overlapping (coffee tables go in front of the sofa, side tables and chairs go beside it).
- Click a piece (or its chip under the preview) to select it; drag, resize, rotate, flip, duplicate, replace or remove it. Designs save and reopen with all pieces.
- Room-level checks: floor overlap between pieces and total floor coverage, on top of the per-item checks.

**Functional calculations** (`evalItem` / `evalRoom` in `js/app.js`)
- Scale: the room's *wall width* (cm) is the reference. Furniture is drawn at `real cm × (image width ÷ wall width) × depth factor`, so changing the room width visibly changes the furniture size.
- Depth: the floor line (where wall meets floor) and the room depth map the item's vertical position to a distance from the back wall.
- Checks: width/depth vs. room, gaps to left/right/back walls, free floor in front vs. the product's recommended clearance, height vs. ceiling, share of wall used, and a warning when the preview is not drawn at 100% size. Rotation uses the rotated bounding-box footprint.
- Result: "Fits your space" / "Check clearance" / "Doesn't fit here", plus a top-down plan and usage bars.
- These are **estimates**. A single photo cannot give exact measurements; users can edit wall width, depth, ceiling height (and floor line for uploaded photos) in the room settings.

## Persistence

Shortlist, saved designs and custom room dimensions use `localStorage`. If storage is unavailable or full, everything still works for the current session (in-memory fallback, with a notice). Uploaded photos are downscaled in the browser; they never leave the device.

## Main demo journey checklist (tested with headless Chromium)

- [x] Open the site; home page loads with no console errors or broken images
- [x] Select a sample living room (default) or upload a photo (invalid files are rejected with a message)
- [x] Browse/search/filter/sort furniture
- [x] Add a sofa, coffee table, armchair and side table together
- [x] Drag to move; resize via handle/slider; rotate; flip; reset; replace; remove
- [x] See dimensions, fit status, clearance messages and the plan view; edit room dimensions
- [x] Compare original vs. preview with the draggable slider
- [x] Save the design
- [x] Reopen it from Saved designs (and delete)
- [x] Shortlist products, compare side by side, copy summary
- [x] Retailer view with sample metrics and charts
- [x] Responsive layout and mobile menu

Keyboard: with the furniture focused, arrows move, `+`/`-` resize, `[`/`]` rotate, Delete removes.

## Using real product photos

The bundled furniture images are SVG illustrations (no stock photography could be bundled offline). To use real photos:

1. Get a **front-on** product photo for each item (ideally on white) from a source you have the right to use: your own catalogue, a manufacturer/retailer feed, or free-licence sites such as Unsplash, Pexels or Wikimedia Commons (keep the credit).
2. Make a transparent, tightly cropped PNG named after the product id and save it in `assets/furniture/photos/`:
   `s1` Fjord sofa, `s2` Nordhavn loveseat, `s3` Larkspur sofa, `c1` Mira armchair, `c2` Ola dining chair, `c3` Sven wing chair, `t1` Tamsin coffee table, `t2` Hearth dining table, `t3` Pebble side table, `b1` Halden bed, `b2` Skog bed, `k1` Rowan sideboard, `k2` Vesper bookcase, `k3` Atlas wardrobe.
   - White background: `python3 tools/make_cutout.py my-photo.jpg assets/furniture/photos/s1.png` (needs `pip install pillow numpy`; only this helper uses them).
   - Busy background: use any background remover (remove.bg, Canva, Photoshop) and save the PNG directly.
3. Add the ids to `PHOTO_IDS` in `js/data.js`, e.g. `var PHOTO_IDS = ['s1', 't1'];`. Optionally add `credit: 'Photo: Name / Source / Licence'` to the product to show attribution in its details dialog.

A ready-made prompt for letting Claude Code fetch and process photos for you is in `tools/FETCH_PHOTOS_PROMPT.md` (needs a session with internet access).

The bundled photos are AI-generated product images (prompts in `tools/IMAGE_PROMPTS.md`), shown with an "illustrative image" caption. To redo them in bulk, put the raw images in `assets/furniture/source/` named by product id (`s1.png`, `c2.jpg`, ...) and run `python3 tools/cutout_all.py --write`; it cuts out each background (per-image options are in its `PRESETS`), writes `assets/furniture/photos/` and updates `PHOTO_IDS`.

Photos are used everywhere (catalogue, room preview, saved designs, shortlist). Products without a photo keep their illustration. Tips: crop tightly so the photo's proportions match the product's width : height, and avoid angled shots because the preview is a front view.
