/* RoomView demo – vanilla JS, no dependencies. All data is local. */
(function () {
  'use strict';
  var D = window.RV_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return D.brand.currency + n.toLocaleString('en-GB'); };
  var round = function (n) { return Math.round(n); };
  var MAX_ITEMS = 8;

  /* ---------- storage (falls back to memory when unavailable) ---------- */
  var mem = {}, storageOK = true;
  try { var t = '__rv'; localStorage.setItem(t, '1'); localStorage.removeItem(t); } catch (e) { storageOK = false; }
  var store = {
    get: function (k, fb) {
      try { if (storageOK) { var v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); return fb; } } catch (e) { storageOK = false; }
      return k in mem ? JSON.parse(mem[k]) : fb;
    },
    set: function (k, v) {
      var s = JSON.stringify(v); mem[k] = s;
      try { if (storageOK) { localStorage.setItem(k, s); return true; } } catch (e) { return false; }
      return false;
    }
  };

  /* ---------- state ---------- */
  var DEFAULT_ROOM = D.rooms[0];
  var state = {
    room: null,
    items: [],          // [{uid, pid, pl:{cx,by,scale,rot,flip,light}}]
    sel: null,          // uid of the selected item
    replacing: false,   // next catalogue click replaces the selected item
    uid: 1,
    cat: 'all', q: '', sort: 'featured',
    mode: 'place', guides: true, comparePos: 50,
    shortlist: store.get('rv_shortlist', []),
    saved: store.get('rv_saved_v2', null),
    dims: store.get('rv_dims', {}),
    uploaded: null
  };
  if (!state.saved) { state.saved = JSON.parse(JSON.stringify(D.savedSeed)); store.set('rv_saved_v2', state.saved); }
  state.shortlist = state.shortlist.filter(function (id) { return byId(D.products, id); });

  function roomFromSample(r) {
    var o = state.dims[r.id] || {};
    return { id: r.id, name: r.name, src: r.image, aspect: r.aspect, uploaded: false, sample: r,
      widthCm: o.widthCm || r.widthCm, depthCm: o.depthCm || r.depthCm, ceilingCm: o.ceilingCm || r.ceilingCm,
      floorY: r.floorY, persp: o.persp != null ? o.persp : r.persp };
  }
  function roomFromUpload() {
    var u = state.uploaded, o = state.dims.upload || {};
    return { id: 'upload', name: 'Your photo', src: u.src, aspect: u.aspect, uploaded: true, sample: null,
      widthCm: o.widthCm || 400, depthCm: o.depthCm || 450, ceilingCm: o.ceilingCm || 250, floorY: o.floorY || 0.62, persp: o.persp != null ? o.persp : 1 };
  }
  var prodOf = function (it) { return byId(D.products, it.pid); };
  function selItem() { for (var i = 0; i < state.items.length; i++) if (state.items[i].uid === state.sel) return state.items[i]; return null; }
  function itemByUid(u) { for (var i = 0; i < state.items.length; i++) if (state.items[i].uid === +u) return state.items[i]; return null; }
  var views = function (items) { return items.map(function (it) { return { uid: it.uid, p: prodOf(it), pl: it.pl }; }); };

  /* ---------- toasts ---------- */
  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok'); el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, 3200);
  }

  /* ---------- geometry ----------
     Horizontal scale grows towards the camera: persp(by) = 1 + room.persp * depthFraction.
     Positions are converted back to centimetres at the item's own depth. */
  function persp(room, by) { return 1 + room.persp * clamp((by - room.floorY) / (1 - room.floorY), 0, 1); }
  function footprint(p, rot) {
    var r = rot * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    return { w: p.w * c + p.d * s, d: p.w * s + p.d * c };
  }
  function geom(room, p, pl) {
    var fp = footprint(p, pl.rot), pz = persp(room, pl.by);
    var xc = room.widthCm / 2 + (pl.cx - 0.5) * room.widthCm / pz;
    var distFront = clamp((pl.by - room.floorY) / (1 - room.floorY), 0, 1) * room.depthCm;
    return {
      fp: fp, pz: pz, xc: xc, distFront: distFront,
      left: xc - fp.w / 2, right: room.widthCm - xc - fp.w / 2,
      back: distFront - fp.d, front: room.depthCm - distFront,
      ceilingGap: room.ceilingCm - p.h, wallShare: fp.w / room.widthCm,
      rect: { x0: xc - fp.w / 2, x1: xc + fp.w / 2, z0: distFront - fp.d, z1: distFront }
    };
  }
  function evalItem(room, p, pl) {
    var g = geom(room, p, pl), fp = g.fp, msgs = [], add = function (l, t) { msgs.push({ level: l, text: t }); };
    if (fp.w > room.widthCm) add('bad', 'Too wide: ' + round(fp.w - room.widthCm) + ' cm wider than the room width (' + room.widthCm + ' cm).');
    else if (g.left < -1 || g.right < -1) add('bad', 'Extends ' + round(Math.max(-g.left, -g.right)) + ' cm past the ' + (g.left < g.right ? 'left' : 'right') + ' wall at this position. Move it inward.');
    else {
      add('ok', 'Side gaps: ' + round(Math.max(g.left, 0)) + ' cm left, ' + round(Math.max(g.right, 0)) + ' cm right.');
      if (g.wallShare > 0.85) add('warn', 'Takes up ' + round(g.wallShare * 100) + '% of the wall width, leaving little room for side tables or walking past.');
      if (p.sides === 'any' && Math.min(g.left, g.right) < p.clearance) add('warn', 'Chairs and walking space: aim for about ' + p.clearance + ' cm around the table; one side has ' + round(Math.min(g.left, g.right)) + ' cm.');
      if (p.sides === 'both' && g.left < p.clearance && g.right < p.clearance) add('warn', 'Both sides have under ' + p.clearance + ' cm free. Leave at least one side open for access.');
    }
    if (fp.d > room.depthCm) add('bad', 'Too deep: ' + round(fp.d - room.depthCm) + ' cm deeper than the room depth (' + room.depthCm + ' cm).');
    else if (g.back < -2) add('bad', 'Overlaps the back wall by ' + round(-g.back) + ' cm. Move it forward in the room.');
    else add('ok', 'Back gap: ' + round(Math.max(g.back, 0)) + ' cm from the back wall.');
    if (fp.d <= room.depthCm) {
      if (g.front < 0) add('bad', 'Sits ' + round(-g.front) + ' cm beyond the front of the room.');
      else if (g.front < p.clearance) add('warn', 'Check clearance: ' + round(g.front) + ' cm free in front of the room edge; about ' + p.clearance + ' cm is recommended.');
      else add('ok', 'Free floor towards the camera: about ' + round(g.front) + ' cm (recommended ≥ ' + p.clearance + ' cm).');
    }
    if (p.h > room.ceilingCm) add('bad', 'Taller (' + p.h + ' cm) than the ceiling (' + room.ceilingCm + ' cm).');
    else if (g.ceilingGap < 20) add('warn', 'Only ' + round(g.ceilingGap) + ' cm below the ceiling.');
    else add('ok', 'Height ' + p.h + ' cm, ' + round(g.ceilingGap) + ' cm below the ceiling.');
    if (Math.abs(pl.scale - 1) > 0.015) add('warn', 'Preview drawn at ' + round(pl.scale * 100) + '% of true size. Checks use real dimensions; reset to 100% for a true-scale view.');
    g.msgs = msgs; g.level = worst(msgs);
    return g;
  }
  function worst(msgs) { var l = 'ok'; msgs.forEach(function (m) { if (m.level === 'bad') l = 'bad'; else if (m.level === 'warn' && l !== 'bad') l = 'warn'; }); return l; }
  function canTuck(a, b) { return (a.id === 'c2' && b.id === 't2') || (a.id === 't2' && b.id === 'c2'); }
  function overlapArea(a, b) {
    var w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), d = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    return w > 0 && d > 0 ? w * d : 0;
  }
  /* Evaluate every item plus room-level checks (overlaps, floor coverage). */
  function evalRoom(room, items) {
    var res = items.map(function (it) { var p = prodOf(it); return { uid: it.uid, p: p, g: evalItem(room, p, it.pl) }; });
    var roomMsgs = [], bump = function (r, lvl) { if (lvl === 'bad' || r.g.level === 'ok') r.g.level = lvl; };
    for (var i = 0; i < res.length; i++) for (var j = i + 1; j < res.length; j++) {
      var a = res[i], b = res[j]; if (canTuck(a.p, b.p)) continue;
      var ov = overlapArea(a.g.rect, b.g.rect), smaller = Math.min(a.p.w * a.p.d, b.p.w * b.p.d), fr = ov / smaller;
      if (fr > 0.05) {
        var lvl = fr > 0.3 ? 'bad' : 'warn';
        roomMsgs.push({ level: lvl, text: a.p.name + ' and ' + b.p.name + ' overlap on the floor by about ' + round(fr * 100) + '% of the smaller footprint. Move one of them.' });
        bump(a, lvl); bump(b, lvl);
      }
    }
    if (res.length > 1) {
      var area = res.reduce(function (s, r) { return s + r.p.w * r.p.d; }, 0), cover = area / (room.widthCm * room.depthCm);
      roomMsgs.push(cover > 0.35 ? { level: 'warn', text: 'Furniture covers ' + round(cover * 100) + '% of the floor. Above roughly 35% a room tends to feel cramped.' } : { level: 'ok', text: 'Furniture covers about ' + round(cover * 100) + '% of the floor.' });
    }
    var level = worst(roomMsgs);
    res.forEach(function (r) { if (r.g.level === 'bad') level = 'bad'; else if (r.g.level === 'warn' && level !== 'bad') level = 'warn'; });
    return { items: res, roomMsgs: roomMsgs, level: level,
      label: level === 'ok' ? 'Fits your space' : level === 'warn' ? 'Check clearance' : "Doesn't fit here" };
  }

  /* ---------- automatic arrangement for newly added items ---------- */
  function placeAt(room, z, cx) { return { cx: cx, by: clamp(room.floorY + (1 - room.floorY) * z / room.depthCm, room.floorY, 1), scale: 1, rot: 0, flip: false, light: 100 }; }
  function autoPlace(room, p, existing) {
    var rects = existing.map(function (e) { return geom(room, e.p, e.pl).rect; }), margin = 12;
    var fits = function (pl) {
      var g = geom(room, p, pl);
      if (g.left < 5 || g.right < 5 || g.back < -1 || g.front < 0) return false;
      return existing.every(function (e, i) {
        if (canTuck(p, e.p)) return true;
        var r = rects[i], q = g.rect;
        return overlapArea({ x0: q.x0 - margin, x1: q.x1 + margin, z0: q.z0 - margin, z1: q.z1 + margin }, r) === 0;
      });
    };
    var baseCx = 0.5, zStart = p.d + 10;
    if (existing.length) {
      var first = existing[0];
      if (p.anchor === 'front') {
        baseCx = first.pl.cx;
        zStart = Math.max.apply(null, rects.map(function (r) { return r.z1; })) + 35 + p.d;
      }
    }
    var offs = [0]; for (var k = 1; k <= 9; k++) { offs.push(k * 0.05, -k * 0.05); }
    for (var z = zStart; z <= room.depthCm - 10; z += 30) {
      for (var o = 0; o < offs.length; o++) {
        var pl = placeAt(room, z, clamp(baseCx + offs[o], 0.03, 0.97));
        if (fits(pl)) return pl;
      }
    }
    return placeAt(room, p.d + 10, clamp(0.5 + (existing.length % 5 - 2) * 0.08, 0.1, 0.9));
  }
  /* Resolve raw design items (placement optional) into placed items. */
  function resolveItems(room, raw) {
    var out = [];
    raw.forEach(function (r) {
      var p = byId(D.products, r.pid); if (!p) return;
      var pl = r.pl ? JSON.parse(JSON.stringify(r.pl)) : autoPlace(room, p, out.map(function (o) { return { p: prodOf(o), pl: o.pl }; }));
      if (pl.light == null) pl.light = 100;
      out.push({ uid: state.uid++, pid: r.pid, pl: pl });
    });
    return out;
  }

  /* ---------- scene rendering (shared by stage, compare, thumbnails) ---------- */
  function stageAspect(room) { return clamp(room.aspect, 0.8, 2.0); }
  function placedStyle(room, p, pl) {
    var k = 100 / room.widthCm * persp(room, pl.by);
    return 'left:' + (pl.cx * 100).toFixed(3) + '%;top:' + (pl.by * 100).toFixed(3) + '%;width:' + (p.w * pl.scale * k).toFixed(3) + 'cqw;height:' + (p.h * pl.scale * k).toFixed(3) + 'cqw;' +
      'z-index:' + (10 + round(pl.by * 1000)) + ';--lt:' + ((pl.light == null ? 100 : pl.light) / 100) + ';transform:translate(-50%,-100%) rotate(' + pl.rot + 'deg);';
  }
  function placedHTML(room, v, opts) {
    var inter = opts.interactive, p = v.p, pl = v.pl, sel = inter && v.uid === opts.sel;
    var inner = '<span class="cshadow"></span><img src="' + esc(p.image) + '" alt="" draggable="false"' + (pl.flip ? ' style="transform:scaleX(-1)"' : '') + '>';
    if (inter) inner += '<span class="dim-tag">' + p.w + ' cm</span><span class="dim-tag-h">' + p.h + ' cm</span><span class="handle" data-handle="1" title="Drag to resize"></span>';
    return '<div class="placed' + (inter ? ' is-interactive' : '') + (sel ? ' is-selected' : '') + '" ' + (inter ? 'data-uid="' + v.uid + '" tabindex="0" role="img" aria-label="' + esc(p.name) + ', drag to move" ' : '') +
      'style="' + placedStyle(room, p, pl) + '">' + inner + '</div>';
  }
  function sceneHTML(room, vs, opts) {
    opts = opts || {};
    return '<div class="scene" style="aspect-ratio:' + stageAspect(room) + '"><img class="scene-bg" src="' + esc(room.src) + '" alt="' + esc(opts.alt || room.name) + '" draggable="false">' +
      (vs || []).map(function (v) { return placedHTML(room, v, opts); }).join('') + (opts.extra || '') + '</div>';
  }

  /* ---------- routing ---------- */
  var pages = ['home', 'visualizer', 'saved', 'shortlist', 'retailer'];
  function route() {
    var h = (location.hash || '#home').replace('#', '');
    if (pages.indexOf(h) < 0) h = 'home';
    $$('.page').forEach(function (s) { s.hidden = s.dataset.page !== h; });
    $$('[data-nav]').forEach(function (a) { if (a.dataset.nav === h) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    closeNav();
    if (h === 'visualizer') { ensureRoom(); renderAll(); }
    if (h === 'saved') renderSaved();
    if (h === 'shortlist') renderShortlist();
    if (h === 'retailer') renderRetailer();
    if (h === 'home') renderHome();
    window.scrollTo(0, 0);
  }
  function goto(page) { if (location.hash === '#' + page) route(); else location.hash = page; }
  function closeNav() { $('#mainNav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false'); }

  /* ---------- home ---------- */
  var homeBuilt = false;
  function renderHome() {
    if (homeBuilt) return; homeBuilt = true;
    var living = roomFromSample(D.rooms[0]);
    var its = resolveItems(living, [{ pid: 's1' }, { pid: 't1' }, { pid: 'c1' }]), vs = views(its);
    $('#heroVisual').innerHTML = sceneHTML(living, vs, { alt: 'Sample living room' }) +
      '<div class="hero-chip"><strong>3 pieces placed to scale</strong><span>Sofa 224 cm · Table 110 cm · Chair 78 cm</span><span class="ok-dot">Fits your space</span></div>' +
      '<span class="sim-badge">Simulated preview</span>';
    $('#homeCategories').innerHTML = D.categories.map(function (c) {
      var list = D.products.filter(function (p) { return p.category === c.id; }), rep = list[0];
      return '<button class="cat-card" type="button" data-cat="' + c.id + '"><span class="cat-img"><img src="' + rep.image + '" alt=""></span><span class="cat-name">' + c.label + '</span><span class="muted small">' + c.blurb + ' · ' + list.length + ' items</span></button>';
    }).join('');
    $$('#homeCategories .cat-card').forEach(function (b) { b.addEventListener('click', function () { state.cat = b.dataset.cat; goto('visualizer'); }); });
    initCompare($('#homeCompare'), living, vs, { pos: 50 });
  }

  /* ---------- compare slider ---------- */
  function initCompare(host, room, vs, opts) {
    opts = opts || {};
    var pos = opts.pos != null ? opts.pos : 50, has = vs && vs.length;
    host.innerHTML = '<div class="compare" style="aspect-ratio:' + stageAspect(room) + '">' +
      '<div class="cmp-layer">' + sceneHTML(room, vs, { alt: 'Room with furniture (simulated preview)' }) + '</div>' +
      '<div class="cmp-layer cmp-top">' + sceneHTML(room, [], { alt: 'Original room' }) + '</div>' +
      '<span class="cmp-label l">Original</span><span class="cmp-label r">Simulated preview</span>' +
      '<div class="cmp-handle" tabindex="0" role="slider" aria-label="Compare original and preview" aria-valuemin="0" aria-valuemax="100"><span class="grip">⟷</span></div>' +
      (has ? '' : '<div class="empty-over"><p>Add furniture to see it in the preview.</p></div>') + '</div>' +
      '<div class="btn-row center tight"><button type="button" class="btn btn-ghost btn-sm" data-pos="100">Show original</button><button type="button" class="btn btn-ghost btn-sm" data-pos="50">Split</button><button type="button" class="btn btn-ghost btn-sm" data-pos="0">Show preview</button></div>';
    var cmp = $('.compare', host), top = $('.cmp-top', host), handle = $('.cmp-handle', host);
    function set(v) {
      pos = clamp(v, 0, 100);
      top.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      handle.style.left = pos + '%'; handle.setAttribute('aria-valuenow', round(pos));
      if (opts.onChange) opts.onChange(pos);
    }
    var fromEvent = function (e) { var r = cmp.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }, dragging = false;
    cmp.addEventListener('pointerdown', function (e) { dragging = true; cmp.setPointerCapture(e.pointerId); fromEvent(e); });
    cmp.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    cmp.addEventListener('pointerup', function () { dragging = false; });
    cmp.addEventListener('pointercancel', function () { dragging = false; });
    handle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { set(pos - 5); e.preventDefault(); } else if (e.key === 'ArrowRight') { set(pos + 5); e.preventDefault(); }
    });
    $$('[data-pos]', host).forEach(function (b) { b.addEventListener('click', function () { set(+b.dataset.pos); }); });
    set(pos);
  }

  /* ---------- room selection & upload ---------- */
  function ensureRoom() { if (!state.room) state.room = roomFromSample(DEFAULT_ROOM); }
  function selectRoom(room) {
    state.room = room;
    state.items.forEach(function (it) { it.pl.by = clamp(it.pl.by, room.floorY, 1); });
    renderAll();
  }
  function renderRoomPicker() {
    var html = D.rooms.map(function (r) {
      var on = state.room && state.room.id === r.id;
      return '<button type="button" class="room-tile' + (on ? ' is-active' : '') + '" role="radio" aria-checked="' + on + '" data-room="' + r.id + '"><img src="' + r.image + '" alt=""><span><strong>' + r.type + '</strong><small>' + r.widthCm + ' × ' + r.depthCm + ' cm</small></span></button>';
    }).join('');
    if (state.uploaded) {
      var on2 = state.room && state.room.id === 'upload';
      html += '<button type="button" class="room-tile' + (on2 ? ' is-active' : '') + '" role="radio" aria-checked="' + on2 + '" data-room="upload"><img src="' + esc(state.uploaded.src) + '" alt=""><span><strong>Your photo</strong><small>' + esc(state.uploaded.name) + '</small></span></button>';
    }
    $('#roomPicker').innerHTML = html;
    $$('#roomPicker .room-tile').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.room === 'upload') selectRoom(roomFromUpload()); else selectRoom(roomFromSample(byId(D.rooms, b.dataset.room)));
      });
    });
  }
  var msgUpload = function (t, bad) { var m = $('#uploadMsg'); m.textContent = t; m.className = 'form-msg ' + (bad ? 'bad' : 'ok'); };
  function handleFile(file) {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0) { msgUpload('Unsupported file type. Please choose a JPG, PNG or WebP image.', true); toast('Unsupported file type', 'bad'); return; }
    if (file.size > 10 * 1024 * 1024) { msgUpload('That file is larger than 10 MB. Please choose a smaller photo.', true); toast('File too large', 'bad'); return; }
    var reader = new FileReader();
    reader.onerror = function () { msgUpload('Could not read that file. Please try another.', true); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { msgUpload('That file could not be opened as an image. It may be corrupted.', true); toast('Could not open image', 'bad'); };
      img.onload = function () {
        if (img.naturalWidth < 400 || img.naturalHeight < 300) { msgUpload('The photo is too small (minimum 400 × 300 pixels).', true); return; }
        var src = reader.result;
        try {
          var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          src = c.toDataURL('image/jpeg', 0.82);
        } catch (e) { /* keep original data URL */ }
        state.uploaded = { src: src, aspect: img.naturalWidth / img.naturalHeight, name: file.name.length > 22 ? file.name.slice(0, 19) + '…' : file.name };
        msgUpload('Photo added. Enter the width of the wall in the photo for a better scale estimate.', false);
        toast('Room photo added');
        selectRoom(roomFromUpload());
        var d = $('#roomSettings'); if (d) d.open = true;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- stage ---------- */
  var stageEl = null;
  function renderStage() {
    var host = $('#stageHost'), r = state.room, has = state.items.length > 0;
    $('#modePlace').classList.toggle('is-active', state.mode === 'place'); $('#modePlace').setAttribute('aria-pressed', state.mode === 'place');
    $('#modeCompare').classList.toggle('is-active', state.mode === 'compare'); $('#modeCompare').setAttribute('aria-pressed', state.mode === 'compare');
    $('#toggleGuides').setAttribute('aria-pressed', state.guides); $('#toggleGuides').disabled = state.mode === 'compare';
    $('#placeHint').hidden = state.mode === 'compare';
    if (state.mode === 'compare') {
      initCompare(host, r, views(state.items), { pos: state.comparePos, onChange: function (v) { state.comparePos = v; } });
      stageEl = null; return;
    }
    var guides = '';
    if (state.guides) {
      guides = '<div class="floor-guide" style="top:' + (r.floorY * 100).toFixed(2) + '%"><span>Floor line</span></div>' +
        '<div class="ruler" style="width:' + (10000 / r.widthCm).toFixed(2) + 'cqw"><i></i><span>1 m at back wall</span></div>';
    }
    var empty = has ? '' : '<div class="empty-over"><p><strong>No furniture yet</strong>Choose a sofa, table, bed or cabinet from the catalogue. Add as many pieces as you like.</p><button class="btn btn-primary btn-sm" type="button" id="browseBtn">Browse furniture</button></div>';
    host.innerHTML = '<div class="stage">' + sceneHTML(r, views(state.items), { interactive: true, sel: state.sel, extra: guides + empty, alt: r.name }) + '<span class="sim-badge">Simulated preview</span></div>';
    stageEl = $('.scene', host);
    var bb = $('#browseBtn'); if (bb) bb.addEventListener('click', function () { $('#catalogCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#searchInput').focus({ preventScroll: true }); });
    if (has) bindPlacement();
  }
  function stylePlaced(it) {
    var el = stageEl && $('.placed[data-uid="' + it.uid + '"]', stageEl); if (!el) return;
    el.setAttribute('style', placedStyle(state.room, prodOf(it), it.pl));
    $('img', el).style.transform = it.pl.flip ? 'scaleX(-1)' : '';
  }
  var raf = 0;
  function onPlacementChange(it, syncControls) {
    stylePlaced(it);
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; renderFit(); renderItemsBar(); if (syncControls) syncControlValues(); });
  }
  function syncControlValues() {
    var it = selItem(), pl = it ? it.pl : { scale: 1, rot: 0, light: 100 };
    $('#sizeRange').value = round(pl.scale * 100); $('#sizeOut').textContent = round(pl.scale * 100) + '%';
    $('#rotRange').value = pl.rot; $('#rotOut').textContent = pl.rot + '°';
    $('#lightRange').value = pl.light; $('#lightOut').textContent = pl.light + '%';
    var none = !it;
    $('#placementControls').classList.toggle('is-disabled', none);
    $$('#placementControls input, #placementControls button').forEach(function (el) { el.disabled = none && el.id !== 'clearAllBtn'; });
    $('#clearAllBtn').disabled = !state.items.length;
    $('#dupBtn').disabled = none || state.items.length >= MAX_ITEMS;
  }
  function setSelection(uid) {
    state.sel = uid; state.replacing = false;
    if (stageEl) $$('.placed', stageEl).forEach(function (el) { el.classList.toggle('is-selected', +el.dataset.uid === uid); });
    syncControlValues(); renderItemsBar(); renderSelected(); renderFit(); renderCatalogHint();
  }
  function bindPlacement() {
    var scene = stageEl, mode = null, start = null, cur = null;
    scene.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest('.placed') : null; if (!el) return;
      var it = itemByUid(el.dataset.uid); if (!it) return;
      if (state.sel !== it.uid) setSelection(it.uid);
      cur = it; var p = prodOf(it), pl = it.pl;
      var rect = scene.getBoundingClientRect(), k = rect.width / state.room.widthCm * persp(state.room, pl.by);
      mode = e.target.dataset && e.target.dataset.handle ? 'resize' : 'move';
      scene.setPointerCapture(e.pointerId);
      var cxPx = pl.cx * rect.width, byPx = pl.by * rect.height, hPx = p.h * pl.scale * k;
      start = { rect: rect, dx: (e.clientX - rect.left) - cxPx, dy: (e.clientY - rect.top) - byPx, scale: pl.scale, el: el,
        centerX: rect.left + cxPx, centerY: rect.top + byPx - hPx / 2 };
      start.dist = Math.max(10, Math.hypot(e.clientX - start.centerX, e.clientY - start.centerY));
      el.classList.add('dragging'); e.preventDefault();
    });
    scene.addEventListener('pointermove', function (e) {
      if (!mode || !cur) return;
      var pl = cur.pl;
      if (mode === 'move') {
        pl.cx = clamp((e.clientX - start.rect.left - start.dx) / start.rect.width, 0.02, 0.98);
        pl.by = clamp((e.clientY - start.rect.top - start.dy) / start.rect.height, state.room.floorY, 1);
      } else {
        var d = Math.hypot(e.clientX - start.centerX, e.clientY - start.centerY);
        pl.scale = clamp(Math.round(start.scale * d / start.dist * 100) / 100, 0.6, 1.4);
      }
      onPlacementChange(cur, true);
    });
    var end = function () { mode = null; if (start && start.el) start.el.classList.remove('dragging'); cur = null; };
    scene.addEventListener('pointerup', end); scene.addEventListener('pointercancel', end);
    scene.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('.placed'); if (el && state.sel !== +el.dataset.uid) setSelection(+el.dataset.uid); });
    scene.addEventListener('keydown', function (e) {
      var it = selItem(); if (!it || !e.target.classList || !e.target.classList.contains('placed')) return;
      var pl = it.pl, step = e.shiftKey ? 0.02 : 0.005, used = true;
      if (e.key === 'ArrowLeft') pl.cx = clamp(pl.cx - step, 0.02, 0.98);
      else if (e.key === 'ArrowRight') pl.cx = clamp(pl.cx + step, 0.02, 0.98);
      else if (e.key === 'ArrowUp') pl.by = clamp(pl.by - step, state.room.floorY, 1);
      else if (e.key === 'ArrowDown') pl.by = clamp(pl.by + step, state.room.floorY, 1);
      else if (e.key === '+' || e.key === '=') pl.scale = clamp(pl.scale + 0.02, 0.6, 1.4);
      else if (e.key === '-') pl.scale = clamp(pl.scale - 0.02, 0.6, 1.4);
      else if (e.key === '[') pl.rot = clamp(pl.rot - 3, -45, 45);
      else if (e.key === ']') pl.rot = clamp(pl.rot + 3, -45, 45);
      else if (e.key === 'Delete' || e.key === 'Backspace') removeItem(it.uid);
      else used = false;
      if (used) { e.preventDefault(); if (itemByUid(it.uid)) onPlacementChange(it, true); }
    });
  }

  /* ---------- items: add / replace / remove ---------- */
  function addItem(p, silent) {
    if (state.items.length >= MAX_ITEMS) { toast('You can place up to ' + MAX_ITEMS + ' pieces. Remove one first.', 'bad'); return null; }
    ensureRoom();
    var existing = state.items.map(function (i) { return { p: prodOf(i), pl: i.pl }; });
    var it = { uid: state.uid++, pid: p.id, pl: autoPlace(state.room, p, existing) };
    state.items.push(it); state.sel = it.uid; state.replacing = false;
    renderAll();
    if (!silent) toast('Added ' + p.name + ' (' + state.items.length + ' in room)');
    return it;
  }
  function replaceSelected(p) {
    var it = selItem(); if (!it) return addItem(p);
    var old = prodOf(it); it.pid = p.id; state.replacing = false;
    it.pl.scale = 1; it.pl.rot = 0; it.pl.by = clamp(it.pl.by, state.room.floorY, 1);
    renderAll(); toast('Replaced ' + old.name + ' with ' + p.name);
  }
  function removeItem(uid) {
    var it = itemByUid(uid); if (!it) return;
    var name = prodOf(it).name, idx = state.items.indexOf(it);
    state.items.splice(idx, 1);
    state.sel = state.items.length ? state.items[Math.min(idx, state.items.length - 1)].uid : null;
    state.replacing = false; renderAll(); toast('Removed ' + name);
  }
  function clearItems() { state.items = []; state.sel = null; state.replacing = false; renderAll(); toast('Room cleared'); }
  function onCatalogPick(p) { if (state.replacing && selItem()) replaceSelected(p); else addItem(p); }

  function renderItemsBar() {
    var bar = $('#itemsBar'), r = state.room;
    if (!state.items.length) { bar.innerHTML = ''; bar.hidden = true; return; }
    bar.hidden = false;
    var ev = evalRoom(r, state.items), lv = {}; ev.items.forEach(function (x) { lv[x.uid] = x.g.level; });
    bar.innerHTML = '<span class="items-title">In your room (' + state.items.length + ')</span>' + state.items.map(function (it) {
      var p = prodOf(it);
      return '<span class="item-chip' + (it.uid === state.sel ? ' is-selected' : '') + '"><button type="button" class="chip-main" data-uid="' + it.uid + '" aria-pressed="' + (it.uid === state.sel) + '"><i class="dot ' + lv[it.uid] + '"></i>' + esc(p.name) + '</button><button type="button" class="chip-x" data-rm="' + it.uid + '" aria-label="Remove ' + esc(p.name) + '">×</button></span>';
    }).join('');
    $$('.chip-main', bar).forEach(function (b) { b.addEventListener('click', function () { setSelection(+b.dataset.uid); }); });
    $$('.chip-x', bar).forEach(function (b) { b.addEventListener('click', function () { removeItem(+b.dataset.rm); }); });
  }

  /* ---------- fit panel ---------- */
  function planSVG(room, ev, selUid) {
    var W = 320, pad = 26, sc = Math.min((W - 2 * pad) / room.widthCm, 230 / room.depthCm);
    var rw = room.widthCm * sc, rd = room.depthCm * sc, H = rd + 2 * pad, x0 = (W - rw) / 2, y0 = pad;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '" class="plan" role="img" aria-label="Top-down plan of the room with ' + ev.items.length + ' piece(s) of furniture">' +
      '<rect x="' + x0 + '" y="' + y0 + '" width="' + rw.toFixed(1) + '" height="' + rd.toFixed(1) + '" fill="var(--beige)" stroke="var(--charcoal)" stroke-width="2"/>' +
      '<text x="' + (x0 + rw / 2) + '" y="' + (y0 - 9) + '" text-anchor="middle" class="plan-t">' + room.widthCm + ' cm (back wall)</text>' +
      '<text x="' + (x0 - 9) + '" y="' + (y0 + rd / 2) + '" text-anchor="middle" class="plan-t" transform="rotate(-90 ' + (x0 - 9) + ' ' + (y0 + rd / 2) + ')">' + room.depthCm + ' cm</text>';
    ev.items.forEach(function (r) {
      var g = r.g, p = r.p, it = itemByUid(r.uid), fw = p.w * sc, fd = p.d * sc, cx = x0 + g.xc * sc, cy = y0 + (g.distFront - g.fp.d / 2) * sc;
      var col = g.level === 'ok' ? 'var(--ok)' : g.level === 'warn' ? 'var(--warn)' : 'var(--bad)', isSel = r.uid === selUid;
      s += '<g transform="rotate(' + it.pl.rot + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"><rect x="' + (cx - fw / 2).toFixed(1) + '" y="' + (cy - fd / 2).toFixed(1) + '" width="' + fw.toFixed(1) + '" height="' + fd.toFixed(1) + '" rx="3" fill="' + col + '" fill-opacity="' + (isSel ? '.38' : '.2') + '" stroke="' + col + '" stroke-width="' + (isSel ? 3 : 1.5) + '"/></g>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (cy + 3).toFixed(1) + '" text-anchor="middle" class="plan-t' + (isSel ? ' strong' : '') + '">' + (isSel || ev.items.length === 1 ? p.w + ' × ' + p.d : '') + '</text>';
    });
    return s + '<text x="' + (x0 + rw / 2) + '" y="' + (y0 + rd + 16) + '" text-anchor="middle" class="plan-t muted">front of room (camera)</text></svg>';
  }
  function bar(label, val, max, unit, level) {
    return '<div class="bar-row"><div class="bar-top"><span>' + label + '</span><strong>' + round(val) + ' ' + unit + ' of ' + round(max) + ' ' + unit + '</strong></div><div class="bar"><i class="' + level + '" style="width:' + clamp(val / max * 100, 0, 100).toFixed(1) + '%"></i></div></div>';
  }
  var msgList = function (ms) { return '<ul class="msgs">' + ms.map(function (m) { return '<li class="' + m.level + '"><span class="ico" aria-hidden="true">' + (m.level === 'ok' ? '✓' : m.level === 'warn' ? '!' : '✕') + '</span><span>' + esc(m.text) + '</span></li>'; }).join('') + '</ul>'; };
  function renderFit() {
    var r = state.room, body = $('#fitBody'), pill = $('#fitPill');
    if (!r) return;
    $('#dimW').value = r.widthCm; $('#dimD').value = r.depthCm; $('#dimH').value = r.ceilingCm;
    $('#floorLine').hidden = !r.uploaded; $('#dimFloor').value = round(r.floorY * 100); $('#floorOut').textContent = round(r.floorY * 100) + '%';
    $('#dimPersp').value = r.persp; $('#perspOut').textContent = (+r.persp).toFixed(1);
    if (!state.items.length) {
      pill.textContent = 'Add furniture'; pill.className = 'pill';
      body.innerHTML = '<div class="empty"><p><strong>No furniture in the room yet.</strong></p><p class="muted">Add products to compare their real dimensions with this room: ' + r.widthCm + ' cm wide, ' + r.depthCm + ' cm deep, ' + r.ceilingCm + ' cm ceiling.</p></div>';
      return;
    }
    var ev = evalRoom(r, state.items), it = selItem() || state.items[0], cur = ev.items.filter(function (x) { return x.uid === it.uid; })[0], p = cur.p, g = cur.g;
    pill.textContent = ev.label; pill.className = 'pill ' + ev.level;
    var wl = g.fp.w > r.widthCm ? 'bad' : g.wallShare > 0.85 ? 'warn' : 'ok';
    body.innerHTML = '<div class="fit-grid"><div class="fit-plan">' + planSVG(r, ev, it.uid) + '</div><div class="fit-info">' +
      '<p class="fit-sel"><span class="muted small">Selected</span><strong>' + esc(p.name) + '</strong></p>' +
      '<div class="dim-chips"><span><small>Width</small><b>' + p.w + ' cm</b></span><span><small>Depth</small><b>' + p.d + ' cm</b></span><span><small>Height</small><b>' + p.h + ' cm</b></span></div>' +
      bar('Wall width used', g.fp.w, r.widthCm, 'cm', wl) + bar('Room depth used', g.fp.d, r.depthCm, 'cm', g.fp.d > r.depthCm ? 'bad' : 'ok') +
      bar('Ceiling height used', p.h, r.ceilingCm, 'cm', p.h > r.ceilingCm ? 'bad' : g.ceilingGap < 20 ? 'warn' : 'ok') +
      '</div></div>' + msgList(g.msgs) +
      (ev.roomMsgs.length ? '<h3 class="h3-sm">Whole room</h3>' + msgList(ev.roomMsgs) : '') +
      '<p class="muted small">Estimate based on ' + (r.uploaded ? 'your entered wall width' : 'the sample room dimensions') + ' (' + r.widthCm + ' cm) and depth perspective ' + (+r.persp).toFixed(1) + '. Footprints are shown as bounding boxes when rotated.</p>';
  }

  /* ---------- selected product & catalogue ---------- */
  var dimsText = function (p) { return p.w + ' × ' + p.d + ' × ' + p.h + ' cm'; };
  var inShortlist = function (id) { return state.shortlist.indexOf(id) >= 0; };
  var catLabel = function (id) { var c = byId(D.categories, id); return c ? c.label.replace(/s$/, '') : id; };
  function renderSelected() {
    var it = selItem(), el = $('#selectedCard');
    if (!it) { el.innerHTML = '<h2>Selected product</h2><p class="muted">Nothing selected. Click a product below to add it to your room, then click any piece in the room to select it.</p>'; return; }
    var p = prodOf(it), inSL = inShortlist(p.id);
    el.innerHTML = '<div class="sel-top"><img src="' + p.image + '" alt="' + esc(p.name) + '"><div><p class="eyebrow">' + esc(catLabel(p.category)) + '</p><h2>' + esc(p.name) + '</h2><p class="price">' + money(p.price) + '</p></div></div>' +
      '<dl class="spec"><div><dt>W × D × H</dt><dd>' + dimsText(p) + '</dd></div><div><dt>Colour</dt><dd>' + esc(p.color) + '</dd></div><div><dt>Material</dt><dd>' + esc(p.material) + '</dd></div></dl>' +
      '<div class="btn-row tight"><button class="btn btn-secondary btn-sm" id="selShort" type="button">' + (inSL ? 'Remove from shortlist' : 'Add to shortlist') + '</button><button class="btn btn-ghost btn-sm" id="selDetails" type="button">View product details</button></div>';
    $('#selShort').addEventListener('click', function () { toggleShortlist(p.id); });
    $('#selDetails').addEventListener('click', function () { openProduct(p.id); });
  }
  function renderCatalogHint() {
    $('#catHint').textContent = state.replacing ? 'Replace mode: click a product to swap it in for the selected piece.' : 'Click a product to add it to the room.';
    $('#catHint').classList.toggle('is-alert', state.replacing);
  }
  function filteredProducts() {
    var q = state.q.trim().toLowerCase();
    var list = D.products.filter(function (p) {
      if (state.cat !== 'all' && p.category !== state.cat) return false;
      return !q || (p.name + ' ' + p.color + ' ' + p.material + ' ' + p.category + ' ' + p.description).toLowerCase().indexOf(q) >= 0;
    }).slice(), s = state.sort;
    if (s === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (s === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    else if (s === 'width-asc') list.sort(function (a, b) { return a.w - b.w; });
    else if (s === 'width-desc') list.sort(function (a, b) { return b.w - a.w; });
    else if (s === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return list;
  }
  function renderCatalog() {
    var chips = [{ id: 'all', label: 'All' }].concat(D.categories);
    $('#catChips').innerHTML = chips.map(function (c) { return '<button type="button" class="chip' + (state.cat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + c.label + '</button>'; }).join('');
    $$('#catChips .chip').forEach(function (b) { b.addEventListener('click', function () { state.cat = b.dataset.cat; renderCatalog(); }); });
    var list = filteredProducts();
    $('#resultCount').textContent = list.length + ' of ' + D.products.length;
    $('#searchInput').value = state.q; $('#sortSelect').value = state.sort;
    renderCatalogHint();
    var grid = $('#productGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><p><strong>No matches.</strong></p><p class="muted">Try a different search or category.</p><button class="btn btn-ghost btn-sm" id="clearFilters" type="button">Clear filters</button></div>';
      $('#clearFilters').addEventListener('click', function () { state.q = ''; state.cat = 'all'; renderCatalog(); });
      return;
    }
    var counts = {}; state.items.forEach(function (i) { counts[i.pid] = (counts[i.pid] || 0) + 1; });
    var cur = selItem();
    grid.innerHTML = list.map(function (p) {
      var n = counts[p.id] || 0, sel = cur && cur.pid === p.id;
      return '<article class="product' + (sel ? ' is-selected' : '') + '"><button type="button" class="product-main" data-id="' + p.id + '" aria-label="' + (state.replacing ? 'Replace selected piece with ' : 'Add ') + esc(p.name) + ' to the room">' +
        (n ? '<span class="in-room">' + n + ' in room</span>' : '') + '<span class="product-img"><img src="' + p.image + '" alt="' + esc(p.name) + '" loading="lazy"></span>' +
        '<span class="product-name">' + esc(p.name) + '</span><span class="product-meta">' + dimsText(p) + '</span><span class="product-price">' + money(p.price) + '</span></button>' +
        '<div class="product-actions"><button type="button" class="link-btn" data-details="' + p.id + '">Details</button><button type="button" class="link-btn" data-short="' + p.id + '">' + (inShortlist(p.id) ? '★ Shortlisted' : '☆ Shortlist') + '</button></div></article>';
    }).join('');
    $$('.product-main', grid).forEach(function (b) { b.addEventListener('click', function () { onCatalogPick(byId(D.products, b.dataset.id)); }); });
    $$('[data-details]', grid).forEach(function (b) { b.addEventListener('click', function () { openProduct(b.dataset.details); }); });
    $$('[data-short]', grid).forEach(function (b) { b.addEventListener('click', function () { toggleShortlist(b.dataset.short); }); });
  }

  /* ---------- product dialog ---------- */
  function dimDiagram(p) {
    var W = 300, H = 200, pad = 34, sc = Math.min((W - 2 * pad) / p.w, (H - 2 * pad) / p.h), w = p.w * sc, h = p.h * sc, x = (W - w) / 2, y = (H - h) / 2 + 4;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dim-diagram" role="img" aria-label="Front view with width ' + p.w + ' cm and height ' + p.h + ' cm">' +
      '<image href="' + p.image + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" preserveAspectRatio="none"/>' +
      '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="var(--wood)" stroke-dasharray="4 3"/>' +
      '<line x1="' + x + '" x2="' + (x + w) + '" y1="' + (y - 12) + '" y2="' + (y - 12) + '" stroke="var(--charcoal)"/><text x="' + (W / 2) + '" y="' + (y - 17) + '" text-anchor="middle" class="plan-t strong">' + p.w + ' cm</text>' +
      '<line x1="' + (x - 12) + '" x2="' + (x - 12) + '" y1="' + y + '" y2="' + (y + h) + '" stroke="var(--charcoal)"/><text x="' + (x - 18) + '" y="' + (y + h / 2) + '" text-anchor="middle" class="plan-t strong" transform="rotate(-90 ' + (x - 18) + ' ' + (y + h / 2) + ')">' + p.h + ' cm</text></svg>';
  }
  function openProduct(id) {
    var p = byId(D.products, id), r = state.room || roomFromSample(DEFAULT_ROOM), dlg = $('#productDialog');
    var share = round(p.w / r.widthCm * 100), tall = round(p.h / r.ceilingCm * 100);
    var lvl = p.w > r.widthCm || p.d > r.depthCm || p.h > r.ceilingCm ? 'bad' : (share > 85 ? 'warn' : 'ok');
    var note = lvl === 'bad' ? 'Too large for the "' + esc(r.name) + '" dimensions.' : lvl === 'warn' ? 'Would take up ' + share + '% of the wall in "' + esc(r.name) + '". Check clearance.' : 'Would use about ' + share + '% of the wall width in "' + esc(r.name) + '" and ' + tall + '% of the ceiling height.';
    var avail = { in: 'ok', low: 'warn', order: 'info' }[p.availability.status];
    $('#productDialogBody').innerHTML = '<button class="dlg-close" type="button" aria-label="Close" id="pdClose">×</button><div class="pd-grid"><div class="pd-media">' + dimDiagram(p) + '<p class="muted small center">Front view, to scale (illustration)</p></div><div class="pd-info">' +
      '<p class="eyebrow">' + esc(catLabel(p.category)) + '</p><h2 id="pdTitle">' + esc(p.name) + '</h2><p class="price lg">' + money(p.price) + '</p><p>' + esc(p.description) + '</p>' +
      '<dl class="spec"><div><dt>Dimensions (W × D × H)</dt><dd>' + dimsText(p) + '</dd></div><div><dt>Colour</dt><dd>' + esc(p.color) + '</dd></div><div><dt>Material</dt><dd>' + esc(p.material) + '</dd></div><div><dt>Availability</dt><dd><span class="avail ' + avail + '">' + esc(p.availability.label) + '</span></dd></div></dl>' +
      '<div class="callout ' + lvl + '"><strong>Quick fit check</strong><span>' + note + '</span></div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="pdPreview" type="button">Add to my room</button><button class="btn btn-secondary" id="pdShort" type="button">' + (inShortlist(p.id) ? 'Remove from shortlist' : 'Add to shortlist') + '</button></div></div></div>';
    $('#pdClose').addEventListener('click', function () { dlg.close(); });
    $('#pdPreview').addEventListener('click', function () { dlg.close(); previewProduct(p); });
    $('#pdShort').addEventListener('click', function () { toggleShortlist(p.id); openProduct(p.id); });
    if (!dlg.open) dlg.showModal();
  }
  function previewProduct(p) { ensureRoom(); location.hash !== '#visualizer' ? (location.hash = 'visualizer') : route(); addItem(p); }

  /* ---------- shortlist ---------- */
  function toggleShortlist(id) {
    var i = state.shortlist.indexOf(id), p = byId(D.products, id);
    if (i >= 0) { state.shortlist.splice(i, 1); toast('Removed ' + p.name + ' from shortlist'); }
    else { state.shortlist.push(id); toast('Added ' + p.name + ' to shortlist'); }
    store.set('rv_shortlist', state.shortlist);
    updateCounts(); renderCatalog(); renderSelected();
    if (!$('[data-page="shortlist"]').hidden) renderShortlist();
  }
  function renderShortlist() {
    var items = state.shortlist.map(function (id) { return byId(D.products, id); }), body = $('#shortlistBody');
    $('#copyShortlist').disabled = $('#clearShortlist').disabled = !items.length;
    if (!items.length) {
      body.innerHTML = '<div class="card pad empty big"><h2>Your shortlist is empty</h2><p class="muted">Add products from the visualizer to compare their size and price side by side.</p><a class="btn btn-primary" href="#visualizer">Browse furniture</a></div>';
      return;
    }
    var r = state.room || roomFromSample(DEFAULT_ROOM), total = items.reduce(function (s, p) { return s + p.price; }, 0);
    var cards = items.map(function (p) {
      return '<article class="card sl-card"><img src="' + p.image + '" alt="' + esc(p.name) + '"><h3>' + esc(p.name) + '</h3><p class="price">' + money(p.price) + '</p><p class="muted small">' + dimsText(p) + '</p>' +
        '<div class="btn-row tight"><button class="btn btn-primary btn-sm" data-prev="' + p.id + '" type="button">Add to room</button><button class="btn btn-ghost btn-sm danger" data-rm="' + p.id + '" type="button">Remove</button></div></article>';
    }).join('');
    var rows = [['Category', function (p) { return catLabel(p.category); }], ['Price', function (p) { return money(p.price); }], ['Width', function (p) { return p.w + ' cm'; }], ['Depth', function (p) { return p.d + ' cm'; }], ['Height', function (p) { return p.h + ' cm'; }],
      ['Colour', function (p) { return esc(p.color); }], ['Material', function (p) { return esc(p.material); }], ['Availability', function (p) { return esc(p.availability.label); }],
      ['Share of wall (' + esc(r.name) + ')', function (p) { return round(p.w / r.widthCm * 100) + '%'; }]];
    var table = '<div class="table-wrap"><table class="compare-table"><thead><tr><th></th>' + items.map(function (p) { return '<th>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (row) { return '<tr><th scope="row">' + row[0] + '</th>' + items.map(function (p) { return '<td>' + row[1](p) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    body.innerHTML = '<div class="sl-grid">' + cards + '</div><p class="sl-total"><span>' + items.length + ' item' + (items.length > 1 ? 's' : '') + '</span><strong>Total ' + money(total) + '</strong></p><h2 class="h2-sm">Side-by-side comparison</h2>' + table +
      '<p class="muted small">Shortlist is saved in this browser only. There is no checkout in this demo.</p>';
    $$('[data-prev]', body).forEach(function (b) { b.addEventListener('click', function () { previewProduct(byId(D.products, b.dataset.prev)); }); });
    $$('[data-rm]', body).forEach(function (b) { b.addEventListener('click', function () { toggleShortlist(b.dataset.rm); }); });
  }

  /* ---------- saved designs ---------- */
  var memImages = {};
  function openSaveDialog() {
    if (!state.items.length) { toast('Add furniture to the room before saving', 'bad'); return; }
    var n = state.items.length, first = prodOf(state.items[0]).name;
    $('#saveName').value = (n === 1 ? first : first + ' + ' + (n - 1) + ' more') + ' in ' + state.room.name.toLowerCase();
    $('#saveMsg').textContent = ''; $('#saveDialog').showModal(); $('#saveName').select();
  }
  function saveDesign(name) {
    var r = state.room, d = {
      id: 'd' + Date.now(), name: name, roomId: r.id,
      items: state.items.map(function (i) { return { pid: i.pid, pl: JSON.parse(JSON.stringify(i.pl)) }; }),
      roomDims: { widthCm: r.widthCm, depthCm: r.depthCm, ceilingCm: r.ceilingCm, floorY: r.floorY, persp: r.persp },
      savedAt: new Date().toISOString()
    };
    if (r.uploaded) { d.image = r.src; d.aspect = r.aspect; }
    state.saved.unshift(d);
    var ok = store.set('rv_saved_v2', state.saved);
    if (!ok) {
      if (r.uploaded) { memImages[d.id] = d.image; delete d.image; d.photoSessionOnly = true; ok = store.set('rv_saved_v2', state.saved); }
      toast(ok ? 'Saved (your photo is kept for this session only)' : 'Browser storage unavailable. Saved for this session only.', 'warn');
    } else toast('Design saved');
    updateCounts();
  }
  function designRoom(d) {
    var base = byId(D.rooms, d.roomId), dm = d.roomDims || {};
    if (base) return { id: base.id, name: base.name, src: base.image, aspect: base.aspect, uploaded: false, sample: base,
      widthCm: dm.widthCm || base.widthCm, depthCm: dm.depthCm || base.depthCm, ceilingCm: dm.ceilingCm || base.ceilingCm, floorY: base.floorY, persp: dm.persp != null ? dm.persp : base.persp };
    var src = d.image || memImages[d.id]; if (!src) return null;
    return { id: 'upload', name: 'Your photo', src: src, aspect: d.aspect || 1.5, uploaded: true, sample: null,
      widthCm: dm.widthCm, depthCm: dm.depthCm, ceilingCm: dm.ceilingCm, floorY: dm.floorY || 0.62, persp: dm.persp != null ? dm.persp : 1 };
  }
  var designItems = function (d) { return d.items || (d.productId ? [{ pid: d.productId, pl: d.placement }] : []); }; // supports older single-item designs
  function renderSaved() {
    $('#storageNote').textContent = storageOK ? 'Designs are saved in this browser only.' : 'Browser storage is unavailable, so designs last for this session only.';
    var grid = $('#savedGrid');
    if (!state.saved.length) {
      grid.innerHTML = '<div class="card pad empty big"><h2>No saved designs yet</h2><p class="muted">Place furniture in a room and press “Save design”.</p><a class="btn btn-primary" href="#visualizer">Open the visualizer</a></div>';
      return;
    }
    grid.innerHTML = state.saved.map(function (d) {
      var r = designRoom(d), raw = designItems(d), its = r ? resolveItems(r, raw) : [];
      var thumb = r && its.length ? sceneHTML(r, views(its), { alt: d.name }) : '<div class="scene missing"><p>Photo not available in this session</p></div>';
      var date = new Date(d.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      var names = its.map(function (i) { return prodOf(i).name; });
      return '<article class="card saved-card"><div class="saved-thumb">' + thumb + (d.sample ? '<span class="tag">Sample</span>' : '') + '</div><div class="pad"><h3>' + esc(d.name) + '</h3>' +
        '<p class="muted small">' + its.length + ' piece' + (its.length === 1 ? '' : 's') + ': ' + esc(names.join(', ')) + '</p><p class="muted small">' + (r ? esc(r.name) : 'Room') + ' · ' + date + '</p>' +
        '<div class="btn-row tight"><button class="btn btn-primary btn-sm" data-open="' + d.id + '" type="button"' + (r && its.length ? '' : ' disabled') + '>Reopen</button><button class="btn btn-ghost btn-sm danger" data-del="' + d.id + '" type="button">Delete</button></div></div></article>';
    }).join('');
    $$('[data-open]', grid).forEach(function (b) { b.addEventListener('click', function () { reopen(b.dataset.open); }); });
    $$('[data-del]', grid).forEach(function (b) { b.addEventListener('click', function () {
      var d = byId(state.saved, b.dataset.del);
      if (!window.confirm('Delete “' + d.name + '”?')) return;
      state.saved = state.saved.filter(function (x) { return x.id !== d.id; }); store.set('rv_saved_v2', state.saved);
      updateCounts(); renderSaved(); toast('Design deleted');
    }); });
  }
  function reopen(id) {
    var d = byId(state.saved, id), r = designRoom(d), its = r ? resolveItems(r, designItems(d)) : [];
    if (!r || !its.length) { toast('This design can’t be reopened', 'bad'); return; }
    if (r.uploaded) state.uploaded = { src: r.src, aspect: r.aspect, name: 'Saved photo' };
    state.dims[r.id] = { widthCm: r.widthCm, depthCm: r.depthCm, ceilingCm: r.ceilingCm, floorY: r.floorY, persp: r.persp };
    state.room = r; state.items = its; state.sel = its[0].uid; state.mode = 'place'; state.replacing = false;
    goto('visualizer'); toast('Reopened “' + d.name + '”');
  }

  /* ---------- retailer dashboard ---------- */
  function renderRetailer() {
    var A = D.analytics, prods = D.products.slice().sort(function (a, b) { return b.previews - a.previews; });
    var totalPrev = prods.reduce(function (s, p) { return s + p.previews; }, 0);
    var catTotals = D.categories.map(function (c) { return { c: c, n: D.products.filter(function (p) { return p.category === c.id; }).reduce(function (s, p) { return s + p.previews; }, 0) }; }).sort(function (a, b) { return b.n - a.n; });
    var maxP = prods[0].previews, maxC = catTotals[0].n;
    var kpi = function (label, val, sub) { return '<div class="card kpi"><span class="muted small">' + label + '</span><strong>' + val + '</strong><span class="muted small">' + sub + '</span></div>'; };
    var avgFit = round(prods.reduce(function (s, p) { return s + p.fitRate; }, 0) / prods.length);
    var top5 = prods.slice(0, 6).map(function (p) { return '<div class="hbar"><span class="hb-l">' + esc(p.name) + '</span><span class="hb-t"><i style="width:' + (p.previews / maxP * 100).toFixed(1) + '%"></i></span><b>' + p.previews + '</b></div>'; }).join('');
    var cats = catTotals.map(function (x) { return '<div class="hbar"><span class="hb-l">' + x.c.label + '</span><span class="hb-t alt"><i style="width:' + (x.n / maxC * 100).toFixed(1) + '%"></i></span><b>' + round(x.n / totalPrev * 100) + '%</b></div>'; }).join('');
    $('#retailerBody').innerHTML = '<div class="kpis">' +
      kpi('Sample products', D.products.length, D.categories.length + ' categories') + kpi('Saved room designs', state.saved.length, 'Live count from this browser') +
      kpi('Total previews', totalPrev.toLocaleString('en-GB'), A.visitorsLabel) + kpi('Average fit rate', avgFit + '%', 'Previews flagged "Fits your space"') + '</div>' +
      '<div class="two-col"><div class="card pad"><h2 class="h2-sm">Most-previewed products</h2>' + top5 + '</div><div class="card pad"><h2 class="h2-sm">Category popularity</h2>' + cats + '<p class="muted small">Share of all previews.</p></div></div>' +
      '<div class="card pad"><h2 class="h2-sm">Weekly activity</h2>' + trendChart(A) + '</div>' +
      '<div class="card pad"><h2 class="h2-sm">Product performance</h2><div class="table-wrap"><table class="compare-table perf"><thead><tr><th>Product</th><th>Category</th><th>Previews</th><th>Shortlisted</th><th>Preview → shortlist</th><th>Fit rate</th></tr></thead><tbody>' +
      prods.map(function (p) { return '<tr><th scope="row">' + esc(p.name) + '</th><td>' + catLabel(p.category) + '</td><td>' + p.previews + '</td><td>' + p.shortlists + '</td><td>' + round(p.shortlists / p.previews * 100) + '%</td><td><span class="mini-bar"><i style="width:' + p.fitRate + '%"></i></span> ' + p.fitRate + '%</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="muted small">Insight (sample): items with a low fit rate, such as the ' + esc(prods.slice().sort(function (a, b) { return a.fitRate - b.fitRate; })[0].name) + ', are often previewed in rooms too small for them. Showing dimensions early helps customers self-select.</p></div>';
  }
  function trendChart(A) {
    var W = 640, H = 220, pl = 40, pb = 28, pt = 14, n = A.weeklyPreviews.length, max = Math.ceil(Math.max.apply(null, A.weeklyPreviews) / 100) * 100;
    var bw = (W - pl - 10) / n, y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="trend" role="img" aria-label="Weekly previews and shortlist additions over 8 weeks, both rising">';
    for (var g = 0; g <= 4; g++) { var v = max / 4 * g; s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="plan-t muted">' + round(v) + '</text>'; }
    var pts = [];
    A.weeklyPreviews.forEach(function (v, i) {
      var x = pl + i * bw + bw * 0.18, w = bw * 0.64;
      s += '<rect x="' + x + '" y="' + y(v) + '" width="' + w + '" height="' + (H - pb - y(v)) + '" rx="4" fill="var(--green)"><title>' + A.weekLabels[i] + ': ' + v + ' previews</title></rect>';
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 9) + '" text-anchor="middle" class="plan-t muted">' + A.weekLabels[i] + '</text>';
      pts.push((x + w / 2) + ',' + y(A.weeklyShortlists[i]));
    });
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--wood)" stroke-width="3" stroke-linejoin="round"/>';
    pts.forEach(function (pt2, i) { var c = pt2.split(','); s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="4" fill="var(--wood)"><title>' + A.weekLabels[i] + ': ' + A.weeklyShortlists[i] + ' shortlist adds</title></circle>'; });
    return s + '</svg><div class="legend"><span><i class="sw g"></i>Previews</span><span><i class="sw w"></i>Shortlist additions</span></div>';
  }

  /* ---------- misc ---------- */
  function updateCounts() { $('#savedCount').textContent = state.saved.length; $('#shortlistCount').textContent = state.shortlist.length; }
  function renderAll() {
    if (!state.room) return;
    renderRoomPicker(); renderStage(); syncControlValues(); renderItemsBar(); renderSelected(); renderCatalog(); renderFit();
  }
  function applyDims(e) {
    e.preventDefault();
    var r = state.room, w = +$('#dimW').value, d = +$('#dimD').value, h = +$('#dimH').value, m = $('#dimsMsg');
    var bad = function (t) { m.textContent = t; m.className = 'form-msg bad'; };
    if (!(w >= 150 && w <= 1500)) return bad('Wall width must be between 150 and 1500 cm.');
    if (!(d >= 150 && d <= 1500)) return bad('Room depth must be between 150 and 1500 cm.');
    if (!(h >= 200 && h <= 500)) return bad('Ceiling height must be between 200 and 500 cm.');
    r.widthCm = w; r.depthCm = d; r.ceilingCm = h; r.persp = +$('#dimPersp').value;
    if (r.uploaded) r.floorY = (+$('#dimFloor').value) / 100;
    state.dims[r.id] = { widthCm: w, depthCm: d, ceilingCm: h, floorY: r.floorY, persp: r.persp }; store.set('rv_dims', state.dims);
    state.items.forEach(function (it) { it.pl.by = clamp(it.pl.by, r.floorY, 1); });
    m.textContent = 'Room dimensions updated. Furniture is redrawn at the new scale.'; m.className = 'form-msg ok';
    renderAll();
  }

  function bind() {
    $('#navToggle').addEventListener('click', function () { var o = $('#mainNav').classList.toggle('open'); this.setAttribute('aria-expanded', o); });
    $$('[data-scroll]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); $('#' + a.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); }); });
    window.addEventListener('hashchange', route);
    $('#uploadBtn').addEventListener('click', function () { $('#roomFile').click(); });
    $('#roomFile').addEventListener('change', function (e) { handleFile(e.target.files[0]); e.target.value = ''; });
    var dz = $('#dropzone');
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { handleFile(e.dataTransfer && e.dataTransfer.files[0]); });
    $('#resetRoom').addEventListener('click', function () {
      state.uploaded = null; $('#uploadMsg').textContent = '';
      if (state.room) { delete state.dims[state.room.id]; store.set('rv_dims', state.dims); }
      state.room = roomFromSample(DEFAULT_ROOM);
      renderAll(); toast('Room reset to the sample living room');
    });
    $('#modePlace').addEventListener('click', function () { state.mode = 'place'; renderStage(); });
    $('#modeCompare').addEventListener('click', function () { state.mode = 'compare'; renderStage(); });
    $('#toggleGuides').addEventListener('click', function () { state.guides = !state.guides; renderStage(); });
    $('#saveDesign').addEventListener('click', openSaveDialog);
    var slider = function (id, key, conv) { $(id).addEventListener('input', function () { var it = selItem(); if (!it) return; it.pl[key] = conv(this.value); onPlacementChange(it, true); }); };
    slider('#sizeRange', 'scale', function (v) { return v / 100; }); slider('#rotRange', 'rot', Number); slider('#lightRange', 'light', Number);
    $('#flipBtn').addEventListener('click', function () { var it = selItem(); if (it) { it.pl.flip = !it.pl.flip; onPlacementChange(it); } });
    $('#dupBtn').addEventListener('click', function () { var it = selItem(); if (it) addItem(prodOf(it)); });
    $('#resetPlacement').addEventListener('click', function () {
      var it = selItem(); if (!it) return;
      var others = state.items.filter(function (o) { return o !== it; }).map(function (o) { return { p: prodOf(o), pl: o.pl }; });
      it.pl = autoPlace(state.room, prodOf(it), others); renderStage(); syncControlValues(); renderFit(); renderItemsBar(); toast('Placement reset');
    });
    $('#replaceBtn').addEventListener('click', function () {
      if (!selItem()) return; state.replacing = true; renderCatalog();
      $('#catalogCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#searchInput').focus({ preventScroll: true }); toast('Pick a product to replace the selected piece');
    });
    $('#removeBtn').addEventListener('click', function () { if (state.sel) removeItem(state.sel); });
    $('#clearAllBtn').addEventListener('click', clearItems);
    $('#searchInput').addEventListener('input', function () { state.q = this.value; renderCatalog(); $('#searchInput').focus(); });
    $('#sortSelect').addEventListener('change', function () { state.sort = this.value; renderCatalog(); });
    $('#dimsForm').addEventListener('submit', applyDims);
    $('#dimFloor').addEventListener('input', function () { $('#floorOut').textContent = this.value + '%'; });
    $('#dimPersp').addEventListener('input', function () { $('#perspOut').textContent = (+this.value).toFixed(1); });
    $('#dimsReset').addEventListener('click', function () {
      var r = state.room;
      if (r.sample) { delete state.dims[r.id]; r.widthCm = r.sample.widthCm; r.depthCm = r.sample.depthCm; r.ceilingCm = r.sample.ceilingCm; r.persp = r.sample.persp; }
      else { r.widthCm = 400; r.depthCm = 450; r.ceilingCm = 250; r.floorY = 0.62; r.persp = 1; state.dims.upload = {}; }
      store.set('rv_dims', state.dims); $('#dimsMsg').textContent = 'Restored default values.'; $('#dimsMsg').className = 'form-msg ok'; renderAll();
    });
    $('#saveForm').addEventListener('submit', function (e) {
      e.preventDefault(); var n = $('#saveName').value.trim();
      if (!n) { $('#saveMsg').textContent = 'Please enter a name for this design.'; $('#saveMsg').className = 'form-msg bad'; return; }
      saveDesign(n); $('#saveDialog').close();
    });
    $('#saveCancel').addEventListener('click', function () { $('#saveDialog').close(); });
    $$('dialog').forEach(function (dlg) { dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); });
    $('#clearShortlist').addEventListener('click', function () {
      if (!window.confirm('Clear your whole shortlist?')) return;
      state.shortlist = []; store.set('rv_shortlist', state.shortlist); updateCounts(); renderShortlist(); toast('Shortlist cleared');
    });
    $('#copyShortlist').addEventListener('click', function () {
      var text = D.brand.name + ' shortlist\n' + state.shortlist.map(function (id) { var p = byId(D.products, id); return '- ' + p.name + ' (' + dimsText(p) + '), ' + money(p.price); }).join('\n');
      var done = function () { toast('Shortlist summary copied'); };
      var fallback = function () {
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy automatically', 'bad'); } ta.remove();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
  }

  function init() {
    $$('[data-brand]').forEach(function (el) { el.textContent = D.brand[el.dataset.brand]; });
    document.title = D.brand.name + ' – Furniture-in-your-room visualizer (demo)';
    updateCounts(); bind(); route();
  }
  init();
})();
