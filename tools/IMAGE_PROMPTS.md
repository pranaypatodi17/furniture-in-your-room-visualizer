# Prompts for generating furniture product images (any image generator)

Generate one image per product, save it, then cut out the background and add it to the project (see "Using real product photos" in the README).
These are AI-generated images, not photographs of real products: label them as illustrative if you show them to customers.

Pattern (replace the item description):

> Professional e-commerce product photograph of {ITEM}, perfectly straight-on front view, the entire piece visible and centred, pure white seamless background, soft studio lighting, realistic photo, high detail, no props, no text, no people

Use a wide ratio for long pieces (sofas, beds, tables, sideboards: 16:9 or 3:2) and a tall one for the bookcase and wardrobe (3:4 or 2:3). Ask for the proportions in the real W : H if the tool allows it.

| id | {ITEM} |
|----|--------|
| s1 | a 3-seater sofa in light oatmeal bouclé fabric with tapered oak legs |
| s2 | a 2-seater loveseat in sage green velvet with beech legs |
| s3 | a large 4-seat modular sofa in dark charcoal linen on low black steel feet |
| c1 | a lounge armchair in camel tan leather with walnut legs |
| c2 | a natural oak slat-back dining chair with a cream upholstered seat |
| c3 | a high-back wing armchair in deep forest green wool |
| t1 | a low rectangular light oak coffee table with steel legs and a lower shelf |
| t2 | a dark walnut rectangular dining table with tapered legs (table only, no chairs, no tableware) |
| t3 | a small round white marble side table with a slim steel pedestal |
| b1 | a queen bed with a tall channelled stone-grey upholstered headboard, made up with white bedding |
| b2 | an oak platform double bed with a slatted headboard, made up with pale green-grey bedding |
| k1 | a walnut sideboard with four sage-green doors on tapered legs |
| k2 | a tall open light-oak bookcase with five shelves (empty or a few books) |
| k3 | a white two-door freestanding wardrobe with an oak plinth |

Then for each image:

```
python3 tools/make_cutout.py downloaded-sofa.png assets/furniture/photos/s1.png
```

and add the id to `PHOTO_IDS` in `js/data.js`. Crop tightly so the picture's proportions match the product's width : height.
