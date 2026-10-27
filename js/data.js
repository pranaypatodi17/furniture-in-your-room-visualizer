/* RoomView sample data. Everything here is hardcoded so the demo is repeatable.
   Brand name and colours are easy to change: edit BRAND below and the CSS variables in css/styles.css. */
window.RV_DATA = (function () {
  var BRAND = {
    name: 'RoomView',
    tagline: 'See how furniture fits your space before you buy.',
    currency: '£'
  };

  /* widthCm = width of the back wall visible in the photo (used as the scale reference).
     floorY  = where the back wall meets the floor, as a fraction of image height. */
  var ROOMS = [
    { id: 'living', name: 'Sunlit living room', type: 'Living room', image: 'assets/rooms/living-room.svg',
      widthCm: 480, depthCm: 520, ceilingCm: 260, floorY: 0.60, aspect: 1.6, persp: 0.8 },
    { id: 'bedroom', name: 'Calm bedroom', type: 'Bedroom', image: 'assets/rooms/bedroom.svg',
      widthCm: 400, depthCm: 430, ceilingCm: 250, floorY: 0.62, aspect: 1.6, persp: 0.8 },
    { id: 'dining', name: 'Bright dining room', type: 'Dining room', image: 'assets/rooms/dining-room.svg',
      widthCm: 440, depthCm: 480, ceilingCm: 255, floorY: 0.61, aspect: 1.6, persp: 0.8 },
    { id: 'compact', name: 'Compact city apartment', type: 'Compact apartment', image: 'assets/rooms/compact-apartment.svg',
      widthCm: 310, depthCm: 360, ceilingCm: 245, floorY: 0.59, aspect: 1.6, persp: 0.8 }
  ];

  /* w/d/h in cm. clearance = recommended free space (cm). sides: which side gaps matter.
     previews / shortlists / fitRate are hardcoded retailer analytics. */
  var PRODUCTS = [
    { id: 's1', name: 'Fjord 3-Seater Sofa', category: 'sofas', price: 1299, w: 224, d: 94, h: 84,
      color: 'Oatmeal', material: 'Bouclé fabric, solid oak legs', image: 'assets/furniture/fjord-sofa.svg',
      description: 'A deep, relaxed three-seater with three loose back cushions and sculpted arms. Removable, washable covers.',
      availability: { status: 'in', label: 'In stock – ships in 3 days' }, clearance: 90, sides: null,
      previews: 482, shortlists: 131, fitRate: 78 },
    { id: 's2', name: 'Nordhavn 2-Seater Loveseat', category: 'sofas', price: 849, w: 168, d: 88, h: 82,
      color: 'Sage green', material: 'Cotton velvet, beech legs', image: 'assets/furniture/nordhavn-loveseat.svg',
      description: 'A compact two-seater in soft sage velvet. Designed for smaller living rooms and apartments.',
      availability: { status: 'in', label: 'In stock – ships in 3 days' }, clearance: 80, sides: null,
      previews: 391, shortlists: 118, fitRate: 91 },
    { id: 's3', name: 'Larkspur Modular Sofa', category: 'sofas', price: 1899, w: 260, d: 100, h: 78,
      color: 'Charcoal', material: 'Linen blend, powder-coated steel feet', image: 'assets/furniture/larkspur-modular-sofa.svg',
      description: 'Four-seat modular sofa that can be re-arranged. Generous proportions for large rooms.',
      availability: { status: 'order', label: 'Made to order – 4 to 6 weeks' }, clearance: 90, sides: null,
      previews: 267, shortlists: 64, fitRate: 52 },
    { id: 'c1', name: 'Mira Lounge Armchair', category: 'chairs', price: 449, w: 78, d: 82, h: 80,
      color: 'Camel', material: 'Vegetable-tanned leather, walnut legs', image: 'assets/furniture/mira-armchair.svg',
      description: 'A low, rounded lounge chair in soft camel leather that develops a patina with use.',
      availability: { status: 'in', label: 'In stock – ships in 2 days' }, clearance: 60, sides: null,
      previews: 355, shortlists: 97, fitRate: 94 },
    { id: 'c2', name: 'Ola Dining Chair', category: 'chairs', price: 129, w: 46, d: 52, h: 84,
      color: 'Natural oak, cream seat', material: 'Solid oak, upholstered seat', image: 'assets/furniture/ola-dining-chair.svg',
      description: 'A light slat-back dining chair with a padded seat. Stackable and sold individually.',
      availability: { status: 'in', label: 'In stock – ships in 2 days' }, clearance: 60, sides: null,
      previews: 214, shortlists: 72, fitRate: 97 },
    { id: 'c3', name: 'Sven Wing Chair', category: 'chairs', price: 389, w: 70, d: 74, h: 92,
      color: 'Forest green', material: 'Wool-blend upholstery, ash feet', image: 'assets/furniture/sven-wing-chair.svg',
      description: 'A high-backed reading chair with a supportive wing profile in deep forest green.',
      availability: { status: 'low', label: 'Low stock – 4 left' }, clearance: 60, sides: null,
      previews: 243, shortlists: 69, fitRate: 95 },
    { id: 't1', name: 'Tamsin Oak Coffee Table', category: 'tables', price: 329, w: 110, d: 60, h: 40,
      color: 'Light oak', material: 'Oak veneer, steel legs', image: 'assets/furniture/tamsin-coffee-table.svg',
      description: 'A low rectangular coffee table with a lower shelf for books and throws.',
      availability: { status: 'in', label: 'In stock – ships in 2 days' }, clearance: 45, sides: null, anchor: 'front',
      previews: 302, shortlists: 88, fitRate: 96 },
    { id: 't2', name: 'Hearth Dining Table', category: 'tables', price: 749, w: 180, d: 90, h: 75,
      color: 'Dark walnut', material: 'Solid walnut', image: 'assets/furniture/hearth-dining-table.svg',
      description: 'A six-seat dining table in solid walnut with tapered legs. Allow space for chairs to be pulled out.',
      availability: { status: 'in', label: 'In stock – ships in 5 days' }, clearance: 80, sides: 'any',
      previews: 336, shortlists: 101, fitRate: 63 },
    { id: 't3', name: 'Pebble Side Table', category: 'tables', price: 119, w: 45, d: 45, h: 50,
      color: 'White marble effect', material: 'Engineered stone, steel base', image: 'assets/furniture/pebble-side-table.svg',
      description: 'A slim round side table, ideal beside a sofa or armchair.',
      availability: { status: 'in', label: 'In stock – ships in 2 days' }, clearance: 30, sides: null, anchor: 'side',
      previews: 158, shortlists: 49, fitRate: 99 },
    { id: 'b1', name: 'Halden Queen Bed', category: 'beds', price: 999, w: 168, d: 214, h: 105,
      color: 'Stone grey', material: 'Channelled fabric headboard, steel frame', image: 'assets/furniture/halden-queen-bed.svg',
      description: 'A queen bed (fits a 160 × 200 cm mattress) with a tall channelled headboard.',
      availability: { status: 'in', label: 'In stock – ships in 5 days' }, clearance: 60, sides: 'both',
      previews: 421, shortlists: 122, fitRate: 74 },
    { id: 'b2', name: 'Skog Platform Bed', category: 'beds', price: 679, w: 148, d: 208, h: 88,
      color: 'Natural oak', material: 'Solid oak, slatted headboard', image: 'assets/furniture/skog-platform-bed.svg',
      description: 'A low platform double bed (fits a 140 × 200 cm mattress) with a slatted oak headboard.',
      availability: { status: 'order', label: 'Made to order – 2 to 3 weeks' }, clearance: 60, sides: 'both',
      previews: 288, shortlists: 83, fitRate: 85 },
    { id: 'k1', name: 'Rowan Sideboard', category: 'cabinets', price: 589, w: 160, d: 40, h: 78,
      color: 'Walnut with sage doors', material: 'Walnut veneer, lacquered doors', image: 'assets/furniture/rowan-sideboard.svg',
      description: 'A slim four-door sideboard on tapered legs. Soft-close doors and adjustable shelves.',
      availability: { status: 'in', label: 'In stock – ships in 3 days' }, clearance: 80, sides: null,
      previews: 309, shortlists: 90, fitRate: 93 },
    { id: 'k2', name: 'Vesper Bookcase', category: 'cabinets', price: 399, w: 90, d: 32, h: 190,
      color: 'Light oak', material: 'Oak veneer', image: 'assets/furniture/vesper-bookcase.svg',
      description: 'A tall open bookcase with five shelves. Anchor to the wall using the supplied bracket.',
      availability: { status: 'low', label: 'Low stock – 6 left' }, clearance: 70, sides: null,
      previews: 226, shortlists: 61, fitRate: 88 },
    { id: 'k3', name: 'Atlas Two-Door Wardrobe', category: 'cabinets', price: 799, w: 120, d: 58, h: 200,
      color: 'Warm white, oak plinth', material: 'Painted MDF, oak plinth', image: 'assets/furniture/atlas-wardrobe.svg',
      description: 'A freestanding wardrobe with hanging rail, shelves and a drawer inside. Doors need about 60 cm to open.',
      availability: { status: 'in', label: 'In stock – ships in 5 days' }, clearance: 80, sides: null,
      previews: 197, shortlists: 52, fitRate: 82 }
  ];

  var CATEGORIES = [
    { id: 'sofas', label: 'Sofas', blurb: 'Loveseats to modular sofas' },
    { id: 'chairs', label: 'Chairs', blurb: 'Lounge, dining and accent' },
    { id: 'tables', label: 'Tables', blurb: 'Coffee, dining and side' },
    { id: 'beds', label: 'Beds', blurb: 'Double and queen frames' },
    { id: 'cabinets', label: 'Cabinets', blurb: 'Sideboards, shelves, wardrobes' }
  ];

  /* Items without a placement are arranged automatically (deterministic) when the design is opened. */
  var SAVED_SEED = [
    { id: 'seed-1', name: 'Living room: sofa, coffee table and armchair', roomId: 'living',
      items: [{ pid: 's1' }, { pid: 't1' }, { pid: 'c1' }],
      roomDims: { widthCm: 480, depthCm: 520, ceilingCm: 260 }, savedAt: '2026-10-12T10:20:00Z', sample: true },
    { id: 'seed-2', name: 'Bedroom idea: Skog bed and bookcase', roomId: 'bedroom',
      items: [{ pid: 'b2' }, { pid: 'k2' }],
      roomDims: { widthCm: 400, depthCm: 430, ceilingCm: 250 }, savedAt: '2026-10-18T16:05:00Z', sample: true }
  ];

  var ANALYTICS = {
    visitorsLabel: 'Last 8 weeks (sample data)',
    weeklyPreviews: [310, 365, 402, 455, 498, 541, 612, 668],
    weeklyShortlists: [88, 101, 118, 131, 140, 163, 181, 203],
    weekLabels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    sessionsWithUpload: 38,
    avgFitChecksPerSession: 3.4,
    returnRateAfterFitWarning: 12
  };

  return { brand: BRAND, rooms: ROOMS, products: PRODUCTS, categories: CATEGORIES, savedSeed: SAVED_SEED, analytics: ANALYTICS };
})();
