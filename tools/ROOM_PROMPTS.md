# Prompts for realistic room backgrounds (any free image generator)

Generate one **empty room** image per prompt, save them as the file names below, and tell Claude: it will add them as the room backgrounds.
These are AI-generated images, not photos of real rooms.

Rules that matter, because furniture is drawn flat and front-on on top of the picture:
- Straight-on, one-point perspective: the camera faces the back wall squarely. No angled corners, no side walls dominating.
- The whole back wall and the line where it meets the floor must be visible, and the floor must fill the lower 35-45% of the picture.
- **Completely empty**: no sofa, tables, rugs, beds, plants or lamps standing on the floor. Wall art, a window and a hanging pendant light are fine.
- Aspect ratio 16:10 if the tool offers it, otherwise 3:2 or 16:9. Landscape, at least 1400 px wide.

Save into `assets/rooms/source/` as `living.png`, `bedroom.png`, `dining.png`, `compact.png`.

Pattern: `Photograph of an empty {ROOM}, perfectly straight-on one-point perspective facing the back wall, camera at about 1.2 metres height, the entire back wall and the floor line where the wall meets the floor clearly visible, {DETAILS}, no furniture, no rugs, nothing standing on the floor, natural soft daylight, realistic interior photography, high detail, no people, no text. Landscape image, 16:10 aspect ratio.`

| file | {ROOM} and {DETAILS} |
|------|----------------------|
| `living.png` | a bright living room, warm off-white plastered back wall, a tall window with sheer curtains on the left, two framed pictures on the wall, light oak wooden floor with plain white skirting board |
| `bedroom.png` | a calm bedroom, soft sage-green painted back wall, a window with linen curtains on the right, one framed picture on the wall, light oak wooden floor with plain white skirting board |
| `dining.png` | a bright dining room, back wall with sage-green wainscot panelling on the lower half and cream paint above, a pendant light hanging from the ceiling, two framed pictures, medium oak wooden floor |
| `compact.png` | a compact city apartment room, white back wall, a small window on the left, a kitchenette with sage-green cabinets along the right-hand part of the back wall, light wooden floor |

After saving, run `python3 tools/prepare_rooms.py` (resizes to 1600 px JPEGs in `assets/rooms/` and prints each image's aspect ratio).
Claude then sets the floor line and wall width for each room in `js/data.js`.

## Scale: why furniture can look too big or small

A generated picture has no real size, so the app cannot know how many centimetres the back wall is. Fix it with a known object: ask for a standard interior door (80 x 200 cm) on the back wall and measure it. Claude can do this for you: send the picture and it sets `widthCm` so the door comes out 200 cm tall.
You can also fix it yourself in the app: Room settings -> Wall width. Use the "Scale guide" button, which draws a 1 m bar at the back wall, and change Wall width until the bar matches a door or the floor-to-ceiling height. Smaller number = bigger furniture.

## Two extra rooms built to fit the furniture

Straight-on is what makes furniture fit. Save as `loft.png` and `study-bedroom.png` in `assets/rooms/source/`, then tell Claude (it measures the door and sets Wall width and Floor line for you).

Both prompts share the same fit rules: camera straight-on at 1.2 m height, door 80 x 200 cm on the back wall as the ruler, ceiling line visible near the top, wall-to-floor line about 75 percent down the picture, empty floor.

**loft.png**
`Photograph of an empty loft-style living room, camera perfectly straight-on at 1.2 metres height facing the back wall, the back wall fills the full width of the picture from left to right with only a sliver of side wall at the edges, white painted brick back wall, one closed white interior door 80 cm wide and 200 cm tall on the back wall left of centre as a scale reference with its frame and the floor below it fully visible, a large black-framed window on the right of the back wall, ceiling about 2.5 metres high with the ceiling line visible near the top of the picture, the line where the back wall meets the floor sits about 75 percent of the way down the picture, large clear light grey concrete-effect floor below it, plain skirting, no furniture, no rugs, nothing standing on the floor, soft natural daylight, realistic interior photography, no people, no text. Landscape image, 16:10 aspect ratio.`

**study-bedroom.png**
`Photograph of an empty bedroom, camera perfectly straight-on at 1.2 metres height facing the back wall, the back wall fills the full width of the picture from left to right with only a sliver of side wall at the edges, warm greige painted back wall, one closed white interior door 80 cm wide and 200 cm tall on the back wall at the far left as a scale reference with its frame and the floor below it fully visible, a wide window with sheer curtains on the right two thirds of the back wall, ceiling about 2.5 metres high with the ceiling line visible near the top of the picture, the line where the back wall meets the floor sits about 75 percent of the way down the picture, large clear medium oak wooden floor below it, white skirting board, no furniture, no rugs, nothing standing on the floor, soft natural daylight, realistic interior photography, no people, no text. Landscape image, 16:10 aspect ratio.`

## Fixing a room by hand (uploaded or generated picture)

In section 3 of the Visualizer, open "Room dimensions":
- Floor line in photo: drag until the dashed line sits where the back wall meets the floor.
- Wall width in photo (cm) = picture width in px / door height in px x 200. A bigger number makes furniture smaller.
Click Apply.
