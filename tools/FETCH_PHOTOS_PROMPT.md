# Prompt: fetch real furniture photos (paste into a Claude Code session that has internet access)

Open Claude Code in the project folder, then paste everything below the line.

---

In this project (RoomView, a static furniture visualizer), replace the SVG furniture illustrations with real, freely licensed product photos. The photo support already exists: read the "Using real product photos" section of README.md, `tools/make_cutout.py`, and `PHOTO_IDS` / `PHOTO_DIR` in `js/data.js`.

**Task**
For each product below, find ONE real photo and save a transparent, tightly cropped PNG to `assets/furniture/photos/<id>.png`.

| id | item to find | real size W×D×H cm |
|----|--------------|--------------------|
| s1 | 3-seater sofa, light beige/oatmeal fabric | 224×94×84 |
| s2 | 2-seater loveseat, sage green | 168×88×82 |
| s3 | large 4-seat modular sofa, dark charcoal | 260×100×78 |
| c1 | lounge armchair, camel/tan leather | 78×82×80 |
| c2 | wooden slat-back dining chair | 46×52×84 |
| c3 | high-back wing armchair, dark green | 70×74×92 |
| t1 | low rectangular oak coffee table | 110×60×40 |
| t2 | dark walnut dining table, 6-seat | 180×90×75 |
| t3 | small round white marble side table | 45×45×50 |
| b1 | queen bed, grey upholstered headboard | 168×214×105 |
| b2 | oak platform double bed, slatted headboard | 148×208×88 |
| k1 | walnut sideboard with sage-green doors | 160×40×78 |
| k2 | tall open oak bookcase | 90×32×190 |
| k3 | white two-door freestanding wardrobe | 120×58×200 |

**Rules**
1. Sources: Wikimedia Commons (use its API, e.g. `https://commons.wikimedia.org/w/api.php`, search the File namespace and read `imageinfo` + `extmetadata` for the licence and author), Unsplash, Pexels or Pixabay. Only use photos whose licence allows reuse in a website: CC0, public domain, CC BY, CC BY-SA, or the Unsplash/Pexels/Pixabay licences. Never use NC or ND licences. Record author, source URL and licence for each.
2. Choose photos that are straight-on (front view), the whole item visible, on a plain or clean background, and not heavily styled in a room. The preview is a front-view overlay, so angled shots look wrong.
3. The photo's width : height should be within about 25% of the real W : H in the table. Reject photos that are far off (a deep sofa shot from the side, cropped items, etc.) and try another.
4. Cut out the background with `python3 tools/make_cutout.py <input> assets/furniture/photos/<id>.png` (needs `pip install pillow numpy`). If the background is busy and the result is ragged, try `--edge`, `--seal` or `--rim` (see the header of the script), pick a cleaner photo, or use another background remover. Open each result and check it visually: transparent background, no halo, nothing cut off.
5. Don't fabricate or generate images, and don't use a photo you haven't confirmed the licence for. If you can't find a good photo for an item, leave that id out and keep its illustration.
6. Update `js/data.js`: put every id that has a photo into `PHOTO_IDS`, and add `credit: 'Photo: <author> / <source> / <licence>'` to that product.
7. Keep the repo small: PNGs at most ~900px wide, ideally under 300 KB each.

**Verify**
Open `index.html` in a browser (or Playwright) and check: the catalogue, the room preview with each photo placed, the product details dialog (credit shown), saved designs and the shortlist all show the photos with no broken images or console errors. Place a sofa, coffee table and armchair together in the living room and confirm the sizes still look right.

**Finish**
Commit the changes. Then give me a table: id, item, source URL, author, licence, and whether it was used or skipped (with the reason).
