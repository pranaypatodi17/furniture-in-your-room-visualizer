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
assets/rooms/*.svg    4 sample room illustrations
assets/furniture/*.svg 14 transparent furniture cut-outs (front view)
```

Rebrand: edit `BRAND` in `js/data.js` (name, tagline, currency) and the CSS variables in `:root`.

## What is real vs. simulated

**Simulated**
- The "preview" is a flat 2D illustration overlaid on the room image. There is no AI, 3D rendering, perspective correction, lighting or occlusion. It is labelled "Simulated preview" in the UI.
- Room and furniture images are original SVG illustrations (no stock photography is bundled so the project works offline with no licensing issues). Swap in your own photos/PNG cut-outs by changing the `image` paths in `js/data.js`.
- Retailer analytics (previews, shortlists, fit rates, weekly trend) are hardcoded sample numbers. Only "Saved room designs" is live.
- Availability, prices and checkout: sample data only; there is no checkout.

**Functional calculations** (`computeFit` in `js/app.js`)
- Scale: the room's *wall width* (cm) is the reference. Furniture is drawn at `real cm × (image width ÷ wall width)`, so changing the room width visibly changes the furniture size.
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
- [x] Select a sofa or table
- [x] Drag to move; resize via handle/slider; rotate; flip; reset; replace; remove
- [x] See dimensions, fit status, clearance messages and the plan view; edit room dimensions
- [x] Compare original vs. preview with the draggable slider
- [x] Save the design
- [x] Reopen it from Saved designs (and delete)
- [x] Shortlist products, compare side by side, copy summary
- [x] Retailer view with sample metrics and charts
- [x] Responsive layout and mobile menu

Keyboard: with the furniture focused, arrows move, `+`/`-` resize, `[`/`]` rotate, Delete removes.
