// City Pulse plugin: real cities and their landmarks. Loaded by index.html after the core script, before start().
// Register with CityPulse.registerLandmark(key, { w, h, draw(g, L) }) and CityPulse.registerCity(key, { name, back, b }).
// Landmark heights stay at or under 108 units (the Empire State) so the tour keeps its scale for every city.
(() => {
  const CP = window.CityPulse;
  if (!CP) return;
  const { registerLandmark: lm, registerCity: city } = CP;

  // Far landmarks (hazy, behind the back row; see FAR in index.html): units from the ground, x = 0 at the centre.
  const farTowers = list => Object.assign((g, L) => {      // a distant cluster of towers [x, width, height]
    for (const [x, wd, h] of list) g.fillRect(x, -h, wd, h);
    g.fillStyle = L; for (const [x, wd, h] of list) for (let y = -h + 2; y < -3; y += 3.5) g.fillRect(x + wd / 2 - .4, y, .8, 1.3);
  }, { w: Math.max(...list.map(([x, wd]) => x + wd)) - Math.min(...list.map(([x]) => x)) });
  const casaLoma = (g, L) => {                            // Casa Loma: a castle with round turrets on its hill
    g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(0, -12, 22, 0); g.fill();
    g.fillRect(-11, -18, 22, 9);
    for (const [x, h] of [[-12, 23], [-3, 26], [7, 22], [11, 20]]) {
      g.fillRect(x - 1.4, -h, 2.8, h - 9); g.beginPath(); g.moveTo(x - 1.8, -h); g.lineTo(x, -h - 3.5); g.lineTo(x + 1.8, -h); g.fill();
    }
    g.fillStyle = L; for (let x = -9; x < 10; x += 3) g.fillRect(x, -15, .9, 1.4);
  };
  casaLoma.w = 44;
  const anzac = (g, L) => {                               // the Anzac Bridge: two tall pylons with fans of cables
    g.fillRect(-26, -6, 52, 1.2);
    for (const x of [-11, 11]) { g.fillRect(x - .8, -30, 1.6, 30); }
    g.strokeStyle = g.fillStyle; g.lineWidth = .2; g.beginPath();
    for (const x of [-11, 11]) for (let k = 1; k <= 6; k++) { g.moveTo(x, -29 + k * 2.4); g.lineTo(x - k * 2.4, -6); g.moveTo(x, -29 + k * 2.4); g.lineTo(x + k * 2.4, -6); }
    g.stroke();
    g.fillStyle = L; for (const x of [-11, 11]) g.fillRect(x - .4, -31, .8, .8);
  };
  anzac.w = 52;

  const skyway = (g, L) => {                             // the Sunshine Skyway: a long low span rising to twin pylons and fans of cables
    g.beginPath(); g.moveTo(-34, -2); g.quadraticCurveTo(0, -12, 34, -2); g.lineTo(34, -1); g.quadraticCurveTo(0, -11, -34, -1); g.fill();
    for (const x of [-6, 6]) g.fillRect(x - .7, -22, 1.4, 15);
    g.strokeStyle = g.fillStyle; g.lineWidth = .2; g.beginPath();
    for (const x of [-6, 6]) for (let k = 1; k <= 7; k++) { g.moveTo(x, -21.5 + k * 1.5); g.lineTo(x - k * 3, -8.5 + k * .5); g.moveTo(x, -21.5 + k * 1.5); g.lineTo(x + k * 3, -8.5 + k * .5); }
    g.stroke();
    g.fillStyle = L; for (const x of [-6, 6]) g.fillRect(x - .4, -23, .8, .8);
  };
  skyway.w = 68;
  const stadium = (g, L) => {                            // Bank of America Stadium: a wide bowl with light towers
    g.beginPath(); g.moveTo(-20, 0); g.lineTo(-17, -9); g.quadraticCurveTo(0, -12, 17, -9); g.lineTo(20, 0); g.fill();
    for (const x of [-15, -5, 5, 15]) { g.fillRect(x - .25, -16, .5, 7); g.fillRect(x - 1.2, -17, 2.4, 1.2); }
    g.fillStyle = L; for (const x of [-15, -5, 5, 15]) g.fillRect(x - 1, -16.8, 2, .6);
  };
  stadium.w = 40;
  const path = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const mirror = pts => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];   // right half → whole outline
  const glow = (L, y, min) => L.win(Math.max(L.lit(y), min));                        // lights that never go fully dark
  const sphere = (g, L, cy, r) => {
    const a = L.lit(cy);
    g.globalAlpha = .18 + .3 * a; g.fillStyle = L.win(Math.max(a, .3)); g.beginPath(); g.arc(0, -cy, r * 1.3, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = L.body; g.beginPath(); g.arc(0, -cy, r, 0, 7); g.fill();
    for (let dy = -r + .7; dy < r - .5; dy += .8) {
      const c = Math.sqrt(r * r - dy * dy) - .45; g.fillStyle = L.win(L.lit(cy - dy));
      for (let x = -c; x < c - .2; x += .75) g.fillRect(x, -cy + dy - .25, .4, .4);
    }
    g.strokeStyle = L.win(Math.max(a, .35)); g.lineWidth = .3; g.beginPath(); g.arc(0, -cy, r, 0, 7); g.stroke();
  };

  // CN Tower: three flaring fins round a hexagonal core, the main pod two-thirds up, the SkyPod, then the long mast.
  const cnHw = y => .95 + 5.2 * (1 - y / 64) ** 2.4;
  const CN_POD = mirror([[1, -62.5], [3.4, -64.6], [4.5, -65.8], [4.7, -66.6], [4.7, -69.4], [4.2, -70.2], [3.5, -71.2], [2, -72.6], [.95, -73.2]]);
  const CN_TOP = mirror([[.95, -85.6], [1.75, -86.4], [1.75, -88.2], [.75, -89], [.75, -95], [.5, -95], [.5, -101], [.28, -101], [.07, -108]]);
  lm('cntower', { flat: true, w: 14, h: 108, draw(g, L) {
    g.fillStyle = L.body; g.beginPath(); g.moveTo(cnHw(0), 0);
    for (let y = 1; y <= 64; y++) g.lineTo(cnHw(y), -y);
    g.lineTo(.95, -86); g.lineTo(-.95, -86);
    for (let y = 64; y >= 0; y--) g.lineTo(-cnHw(y), -y);
    g.fill();
    path(g, CN_POD); g.fill(); path(g, CN_TOP); g.fill();
    if (L.edge) {
      g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath();
      for (const s of [-1, 1]) { g.moveTo(s * .95, 0); g.lineTo(s * .95, -63); }
      g.moveTo(-4.7, -66.6); g.lineTo(4.7, -66.6); g.moveTo(-4.7, -69.4); g.lineTo(4.7, -69.4); g.stroke();
    }
    for (let y = 2; y < 62; y += 2.2) { g.fillStyle = L.win(L.lit(y)); g.fillRect(-.2, -y - 1.2, .4, 1.2); }
    for (let y = 75; y < 85; y += 2.2) { g.fillStyle = L.win(L.lit(y)); g.fillRect(-.2, -y - 1.2, .4, 1.2); }
    for (let y = 4; y < 56; y += 4) {
      g.fillStyle = L.win(L.lit(y)); const x = cnHw(y) - .45;
      g.fillRect(x - .2, -y - .2, .4, .4); g.fillRect(-x - .2, -y - .2, .4, .4);
    }
    g.fillStyle = L.win(L.lit(64.5));
    for (let x = -3.3; x < 3.4; x += .8) g.fillRect(x - .18, -65.1, .36, .36);
    g.fillStyle = glow(L, 68, .18);
    for (const y of [-67.6, -69]) for (let x = -4.3; x < 4.2; x += .66) g.fillRect(x, y - .4, .44, .85);
    g.fillStyle = L.win(L.lit(71)); for (let x = -3; x < 3; x += .8) g.fillRect(x, -71.3, .4, .4);
    g.fillStyle = glow(L, 87, .15); for (let x = -1.4; x < 1.4; x += .6) g.fillRect(x, -87.7, .36, .7);
  } });
  // Rogers Centre: the low segmented dome by the tower's foot.
  lm('rogers', { w: 34, h: 15, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-16, -6.5, 32, 6.5);
    g.beginPath(); g.ellipse(0, -6.4, 17, 8.4, 0, Math.PI, 2 * Math.PI); g.fill();
    g.strokeStyle = glow(L, 11, .12); g.lineWidth = .22; g.beginPath();
    for (const k of [.34, .67]) g.ellipse(0, -6.4, 17 * k, 8.4, 0, Math.PI, 2 * Math.PI);
    g.stroke();
    g.fillStyle = glow(L, 6.4, .12); g.fillRect(-16.6, -6.9, 33.2, .45);
    for (const y of [2.2, 4.4]) { g.fillStyle = L.win(L.lit(y)); for (let x = -15; x < 15; x += 1.25) g.fillRect(x, -y - .9, .6, .9); }
  } });
  city('toronto', { name: 'Toronto', back: [.75, 1], far: [casaLoma, farTowers([[-10, 5, 30], [-4, 6, 38], [3, 5, 26], [9, 6, 34]]), farTowers([[-6, 5, 28], [0, 6, 36], [7, 4, 24]])], b: [
    [0, '@rogers'],                                                              // Rogers Centre
    [-1, '@cntower'],                                                            // CN Tower
    [3, 'wide', null, [[11, 22]]],
    [.5, 'ribbon', null, [[9, 35]]],                                             // Royal Bank Plaza
    [.5, 'grid', null, [[10, 44]]],                                              // TD Centre
    [.5, 'cols', null, [[12, 58]]],                                              // First Canadian Place
    [.5, 'tall', ['ziggurat', 5], [[11, 49]]],                                   // Scotia Plaza
    [.5, 'pairs', null, [[10, 47]]],                                             // Commerce Court West
    [.5, 'slim', ['antenna', 6], [[8, 52]]],                                     // Aura
    [.5, 'ribbon', null, [[10, 30]]],
  ]});

  // Opera House: drawn with the sails pointing left, then flipped so they face the harbour and the bridge (right).
  const OP_B = 2.4;
  const qpt = (p0, c, p1, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
  const shellOf = (x0, x1, h, lean) => {                   // front foot, back foot, height, how far the tip overhangs
    const foot = [x0, -OP_B], tip = [x0 - lean, -OP_B - h], back = [x1, -OP_B];
    return { foot, tip, back, h, fc: [x0 + (x1 - x0) * .14, -OP_B - h * .55], bc: [x1 - (x1 - x0) * .04, -OP_B - h * 1.02] };
  };
  const SHELLS = [                                          // back to front: the Concert Hall set, the Opera Theatre set, the restaurant
    [9.5, 3.5, 6, -1.1], [-.5, 8.5, 9.6, 1.4], [-4.5, 4, 8.6, 1.3], [-8, 0, 6.6, 1.2],
    [4.2, -.5, 4.6, -.8], [-5.8, 2, 7.2, 1.1], [-9, -1.6, 6.4, 1.1], [-12.4, -5.2, 4.9, 1],
    [7.6, 11.6, 3.3, .6], [9.8, 12.6, 2.4, .5],
  ].map(s => shellOf(...s));
  lm('operahouse', { w: 30, h: 12, draw(g, L) {
    g.scale(-1, 1);
    g.fillStyle = L.body;
    path(g, [[-14.5, 0], [15, 0], [15, -.6], [14, -.6], [14, -1.2], [13, -1.2], [13, -1.8], [12, -1.8], [12, -OP_B], [-14.5, -OP_B]]); g.fill();
    g.fillStyle = L.win(L.lit(1.2)); for (let x = -14; x < 11.5; x += 1.1) g.fillRect(x, -1.6, .55, .7);
    for (const s of SHELLS) {
      const { foot, tip, back, fc, bc, h } = s;
      g.fillStyle = L.body; g.beginPath(); g.moveTo(...foot); g.quadraticCurveTo(...fc, ...tip); g.quadraticCurveTo(...bc, ...back); g.closePath(); g.fill();
      g.globalAlpha = .55; g.fillStyle = L.win(L.lit(OP_B + h * .3));
      g.beginPath(); g.moveTo(...foot); g.quadraticCurveTo(...fc, ...tip); g.lineTo(tip[0], -OP_B); g.closePath(); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = glow(L, OP_B + h * .7, .3); g.lineWidth = .3;
      g.beginPath(); g.moveTo(...foot); g.quadraticCurveTo(...fc, ...tip); g.quadraticCurveTo(...bc, ...back); g.stroke();
      g.strokeStyle = glow(L, OP_B + h * .5, .14); g.lineWidth = .14; g.beginPath();
      const base = [foot[0] + (back[0] - foot[0]) * .6, -OP_B];
      for (const t of [.25, .5, .75]) { g.moveTo(...base); g.lineTo(...qpt(tip, bc, back, t)); }
      g.stroke();
    }
  } });
  // Harbour Bridge: steel through-arch with its truss, the deck hung below the crown, granite pylons at each end.
  const HB_A = 27, HB_D = 5.4, hbTop = x => 6.6 + 8.6 * (1 - (x / HB_A) ** 2), hbBot = x => 13 * (1 - (x / HB_A) ** 2);
  lm('harbourbridge', { flat: true, w: 72, h: 17, draw(g, L) {
    g.strokeStyle = g.fillStyle = L.body; g.lineWidth = .75; g.beginPath();
    for (const f of [hbTop, hbBot]) { g.moveTo(-HB_A, -f(-HB_A)); for (let x = -HB_A + 1; x <= HB_A; x++) g.lineTo(x, -f(x)); }
    g.stroke();
    g.lineWidth = .28; g.beginPath();
    for (let i = 0, x = -HB_A + 1.8; x < HB_A - .1; i++, x += 1.8) {
      g.moveTo(x, -hbTop(x)); g.lineTo(x, -hbBot(x));
      const p = x - 1.8; g.moveTo(p, -(i % 2 ? hbTop(p) : hbBot(p))); g.lineTo(x, -(i % 2 ? hbBot(x) : hbTop(x)));
      g.moveTo(x, -hbBot(x)); g.lineTo(x, -HB_D);
    }
    g.stroke();
    g.fillRect(-36, -HB_D - .9, 72, .9);
    for (const s of [-1, 1]) {
      path(g, [[s * 27.3, 0], [s * 32.5, 0], [s * 32.2, -9.6], [s * 27.6, -9.6]]); g.fill();
      g.fillRect(s > 0 ? 27.9 : -31.9, -10.5, 4, .9); g.fillRect(s > 0 ? 28.6 : -31.2, -11.2, 2.6, .7);
      g.fillRect(s * 34.5 - .5, -HB_D, 1, HB_D);
      if (L.edge) { g.strokeStyle = L.edge; g.lineWidth = .15; g.strokeRect(s > 0 ? 28.3 : -31.5, -9.2, 3.2, 3); g.strokeStyle = L.body; }
      g.fillStyle = L.win(L.lit(9)); g.fillRect(s * 29.9 - .9, -8.8, .5, 1); g.fillRect(s * 29.9 + .4, -8.8, .5, 1); g.fillStyle = L.body;
    }
    g.fillRect(-1.3, -hbTop(0) - 1.6, .14, 1.6); g.fillRect(1.16, -hbTop(0) - 1.6, .14, 1.6);
    g.fillRect(-1.3, -hbTop(0) - 1.6, .7, .45); g.fillRect(1.3, -hbTop(0) - 1.6, -.7, .45);
    for (let x = -HB_A + .7; x < HB_A; x += 1.4) { g.fillStyle = glow(L, hbTop(x), .1); g.fillRect(x - .2, -hbTop(x) - .55, .4, .4); }
    g.fillStyle = L.win(L.lit(HB_D)); for (let x = -35.5; x < 36; x += 1.2) g.fillRect(x, -HB_D - .6, .5, .3);
  } });
  city('sydney', { name: 'Sydney', back: [.6, .95], far: [anzac, farTowers([[-9, 5, 30], [-3, 6, 36], [4, 5, 27], [10, 5, 22]])], b: [
    [0, 'grid', null, [[10, 28]]],
    [.5, 'ribbon', ['antenna2', 5], [[9, 40]]],                                  // Chifley Tower
    [.5, 'tall', null, [[9, 33]]],
    [.5, 'slim', ['spire', 6], [[1.6, 40, true], [5.6, 4.5], [3.6, 1.2, true]]], // Sydney Tower
    [.5, 'pairs', ['pyramid', 3], [[10, 26]]],
    [.5, 'slim', null, [[8, 44]]],                                               // Crown Sydney
    [.5, 'wide', null, [[11, 20]]],
    [2, '@operahouse'],                                                          // Sydney Opera House
    [1.5, '@harbourbridge'],                                                     // Sydney Harbour Bridge
  ]});

  // Bank of China Tower: triangular shafts stepping up to a sloped top, two masts, the giant X-bracing outlined in light.
  const BOC = [[-5, 0], [-5, -26], [-1.7, -34], [-1.7, -44], [1.7, -52], [1.7, -60], [5, -66], [5, 0]];
  const bocRoof = x => x < -1.7 ? 26 + (x + 5) / 3.3 * 8 : x < 1.7 ? 44 + (x + 1.7) / 3.4 * 8 : 60 + (x - 1.7) / 3.3 * 6;
  lm('bochk', { flat: true, w: 10, h: 74, draw(g, L) {
    g.fillStyle = L.body; path(g, BOC); g.fill();
    g.fillRect(2.35, -74, .3, 13.5); g.fillRect(4.15, -72, .3, 8);
    for (let y = 1.2; y < 64; y += 1.8) {
      g.fillStyle = L.win(L.lit(y) * .8);
      for (let x = -4.4; x < 4.5; x += 1.1) if (y + 1.2 < bocRoof(x + .2) - .5) g.fillRect(x, -y - .8, .4, .7);
    }
    g.save(); path(g, BOC); g.clip(); g.lineWidth = .32;    // the X-braces, each 13-unit module edged in light
    for (let y = 0; y < 66; y += 13) {
      g.strokeStyle = L.win(Math.min(1, L.lit(y + 6) + .3)); g.beginPath();
      g.moveTo(-5, -y); g.lineTo(5, -y - 13); g.moveTo(5, -y); g.lineTo(-5, -y - 13); g.moveTo(-5, -y - 13); g.lineTo(5, -y - 13);
      g.moveTo(-1.7, -y); g.lineTo(-1.7, -y - 13); g.moveTo(1.7, -y); g.lineTo(1.7, -y - 13);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = L.win(Math.min(1, L.lit(40) + .3)); g.lineWidth = .3; path(g, BOC); g.stroke();
  } });
  // Two IFC: a tall shaft with chamfered corners, setbacks near the top and a tall crown of fins rising to the centre.
  const ifcHw = y => 5.5 - .5 * y / 62;
  const IFC_T = [[5.5, 0, 62], [4.5, 62, 66.5], [4, 66.5, 70.6]];
  const IFC_F = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map(x => [x, 82 - Math.abs(x) * 1.75]);
  lm('ifc2', { w: 11, h: 82, draw(g, L) {
    g.fillStyle = L.body;
    path(g, [[-5.5, 0], [5.5, 0], [5, -62.05], [-5, -62.05]]); g.fill();
    for (const [hw, y0, y1] of IFC_T.slice(1)) g.fillRect(-hw, -y1, 2 * hw, y1 - y0 + .05);
    for (const [x, h] of IFC_F) {                          // fin tops slope down towards the corners
      const lo = x === 0 ? 0 : .9, s = Math.sign(x);
      path(g, [[x - .3, -70.5], [x + .3, -70.5], [x + .3, -h + (s > 0 ? lo : 0)], [x - .3, -h + (s < 0 ? lo : 0)]]); g.fill();
    }
    if (L.edge) {
      g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath();
      for (const s of [-1, 1]) { g.moveTo(s * 4.8, 0); g.lineTo(s * 4.3, -62); g.moveTo(s * 3.8, -62); g.lineTo(s * 3.8, -66.5); }
      g.stroke();
    }
    for (let y = 1; y < 69.5; y += 1.6) {
      g.fillStyle = L.win(L.lit(y)); const hw = y < 61 ? ifcHw(y + 1) : y < 65.5 ? 4.5 : 4;
      for (let x = -hw + .55; x < hw - .5; x += .95) g.fillRect(x, -y - 1.1, .38, 1.1);
    }
    g.fillStyle = glow(L, 76, .3);
    for (const [x, h] of IFC_F) g.fillRect(x - .12, -h + 1.2, .24, h - 71.9);
    g.fillRect(-4, -70.9, 8, .3);
  } });
  city('hongkong', { name: 'Hong Kong', back: [1.1, 1], b: [
    [0, 'slim', null, [[8, 40]]],
    [0, 'ribbon', ['antenna', 4], [[7, 48]]],
    [0, 'grid', null, [[7, 34]]],
    [.3, '@ifc2'],                                                               // Two IFC
    [.3, 'slim', null, [[7, 38]]],
    [0, 'grid', null, [[8, 45]]],
    [0, 'tall', null, [[9, 56]]],                                                // Cheung Kong Center
    [.3, '@bochk'],                                                              // Bank of China Tower
    [.3, 'ribbon', null, [[8, 44], [6, 6]]],                                     // Citibank Plaza
    [0, 'slim', null, [[7, 37]]],
    [0, 'pairs', ['antenna', 5], [[7, 50]]],
    [0, 'cols', ['spire', 12], [[9, 58], [6, 4]]],                               // Central Plaza
    [0, 'grid', null, [[8, 46]]],
    [0, 'slim', null, [[7, 33]]],
    [0, 'ribbon', ['dome', 2], [[8, 43]]],                                       // Hopewell Centre
    [0, 'slim', ['antenna', 5], [[7, 50]]],
    [0, 'tall', null, [[8, 38]]],
  ]});

  // Oriental Pearl Tower: big and small spheres strung on three columns, a splayed tripod, then the spire.
  lm('pearl', { flat: true, w: 18, h: 79, draw(g, L) {
    g.fillStyle = g.strokeStyle = L.body;
    for (const x of [-1.5, 0, 1.5]) g.fillRect(x - .45, -46, .9, 46);
    g.fillRect(-.8, -59, 1.6, 14);
    g.lineWidth = 1.1; g.beginPath();
    for (const s of [-1, 1]) { g.moveTo(s * 8, 0); g.lineTo(s * 1.9, -12.5); }
    g.stroke();
    g.beginPath(); g.moveTo(-.5, -60.4); g.lineTo(0, -79); g.lineTo(.5, -60.4); g.fill();
    g.fillRect(-.9, -66, 1.8, .5); g.fillRect(-.6, -70, 1.2, .4);
    for (let y = 21.5; y < 40; y += 2.4) { g.fillStyle = L.win(L.lit(y)); g.fillRect(-.2, -y - 1, .4, 1); }
    sphere(g, L, 15.8, 4.4);
    for (const y of [26, 30.4, 34.8]) sphere(g, L, y, 1);
    sphere(g, L, 44.6, 3.9);
    sphere(g, L, 59.3, 1.5);
  } });
  // Shanghai Tower: a twisting, tapering glass tower; the spiral notch climbs the face to the slanted crown.
  const ST_T = 100, stL = y => 7.3 - 4.2 * (y / ST_T) ** 1.25, stR = y => 7.3 - 4.4 * (y / ST_T) ** .85;
  const stN = y => (stR(y) - stL(y)) / 2 + .85 * Math.cos(y / ST_T * 3.1) * (stR(y) + stL(y)) / 2;   // swings across the face as it twists
  lm('shtower', { flat: true, w: 15, h: 107, draw(g, L) {
    g.fillStyle = L.body; g.beginPath(); g.moveTo(-stL(0), 0);
    for (let y = 0; y <= ST_T; y += 2) g.lineTo(stR(y), -y);
    g.quadraticCurveTo(stR(ST_T) + .2, -104, 2.3, -107); g.lineTo(-stL(ST_T) + .1, -101.6);
    for (let y = ST_T; y >= 0; y -= 2) g.lineTo(-stL(y), -y);
    g.fill();
    for (let y = 1; y < 99; y += 1.4) {                     // dark at the plant floors between the nine zones
      if (y % 11 < 1.4) continue;
      g.fillStyle = L.win(L.lit(y)); const xn = stN(y), r = stR(y) - .6;
      for (let x = -stL(y) + .5; x < r; x += .9) if (Math.abs(x + .2 - xn) > .55) g.fillRect(x, -y - .8, .45, .7);
    }
    g.lineWidth = .35;
    for (let y = 0; y < ST_T; y += 4) {
      g.strokeStyle = glow(L, y + 2, .22); g.beginPath(); g.moveTo(stN(y), -y);
      for (let k = 1; k <= 4; k++) g.lineTo(stN(y + k), -y - k);
      g.stroke();
    }
    g.strokeStyle = glow(L, 103, .3); g.beginPath(); g.moveTo(-stL(ST_T) + .1, -101.6); g.lineTo(2.3, -107); g.stroke();
  } });
  // Shanghai World Financial Center: the tapering slab with the trapezoid opening at the top.
  const SW_HOLE = [[-2, -72], [2, -72], [3.3, -81], [-3.3, -81]];
  lm('swfc', { flat: true, w: 11, h: 83, draw(g, L) {
    g.fillStyle = L.body; g.beginPath();
    g.moveTo(-5.5, 0); g.lineTo(-4.5, -83); g.lineTo(4.5, -83); g.lineTo(5.5, 0); g.closePath();
    SW_HOLE.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fill('evenodd');
    if (L.edge) {
      g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath();
      for (const s of [-1, 1]) { g.moveTo(s * 5.5, 0); g.quadraticCurveTo(s * 3.8, -45, s * 1.5, -71); }
      g.stroke();
    }
    for (let y = 1; y < 82; y += 1.5) {
      g.fillStyle = L.win(L.lit(y)); const hw = 5.5 - y / 83 - .5;
      for (let x = -hw; x < hw - .4; x += 1) {
        if (y > 70.5 && y < 82 && Math.abs(x + .25) < 2.4 + (y - 71) * .13) continue;   // keep the opening clear
        g.fillRect(x, -y - .7, .5, .65);
      }
    }
    g.strokeStyle = glow(L, 76, .35); g.lineWidth = .35; path(g, SW_HOLE); g.stroke();
  } });
  // Jin Mao Tower: pagoda-like segments, each shorter and narrower than the last, then a stepped crown and spire.
  const JM = [];
  for (let i = 0, y = 0, h = 9.5, hw = 4.6; i < 11; i++, y += h, h *= .86, hw -= .2) JM.push([y, y + h, hw]);
  const JM_TOP = JM[JM.length - 1][1], JM_CROWN = [[2.1, 2], [1.7, 1.8], [1.3, 1.6], [.95, 1.4], [.65, 1.2]];
  lm('jinmao', { flat: true, w: 10, h: 71, draw(g, L) {
    g.fillStyle = L.body;
    for (const [y0, y1, hw] of JM) { g.fillRect(-hw, -y1, 2 * hw, y1 - y0 + .05); g.fillRect(-hw - .4, -y1 - .1, 2 * hw + .8, .45); }
    let y = JM_TOP;
    for (const [hw, h] of JM_CROWN) { g.fillRect(-hw, -y - h, 2 * hw, h + .05); g.fillRect(-hw - .25, -y - h, 2 * hw + .5, .3); y += h; }
    g.beginPath(); g.moveTo(-.35, -y); g.lineTo(0, -71); g.lineTo(.35, -y); g.fill();
    for (const [y0, y1, hw] of JM) {
      for (let yy = y0 + .9; yy < y1 - .5; yy += 1.5) {
        g.fillStyle = L.win(L.lit(yy));
        for (let x = -hw + .45; x < hw - .4; x += .9) g.fillRect(x, -yy - .75, .4, .7);
      }
      g.fillStyle = glow(L, y1, .18); g.fillRect(-hw - .4, -y1 - .1, 2 * hw + .8, .18);
    }
    y = JM_TOP;
    for (const [hw, h] of JM_CROWN) { g.fillStyle = glow(L, y, .3); g.fillRect(-hw + .2, -y - h * .7, 2 * hw - .4, h * .35); y += h; }
  } });
  city('shanghai', { name: 'Shanghai', back: [.85, 1], b: [
    [0, 'grid', null, [[10, 28]]],
    [.5, 'ribbon', null, [[8, 36]]],
    [.5, '@pearl'],                                                              // Oriental Pearl Tower
    [1, 'slim', null, [[9, 38]]],
    [.5, '@jinmao'],                                                             // Jin Mao Tower
    [.5, 'tall', null, [[8, 42]]],
    [.5, '@swfc'],                                                               // Shanghai World Financial Center
    [1, '@shtower'],                                                             // Shanghai Tower
    [1, 'ribbon', ['antenna', 4], [[10, 44]]],
    [.5, 'grid', null, [[9, 30]]],
  ]});
  // ---------- Tampa ----------
  // A row of windows between x0 and x1 every dy units from y0 to y1 (heights up), lit by height like any building.
  const rows = (g, L, x0, x1, y0, y1, { dx = 1.2, ww = .5, dy = 1.7, wh = .8 } = {}) => {
    for (let y = y0; y < y1 - wh; y += dy) { g.fillStyle = L.win(L.lit(y)); for (let x = x0; x <= x1 - ww + 1e-6; x += dx) g.fillRect(x, -y - wh, ww, wh); }
  };
  const palm = (g, x, h, lean) => {                       // a palm: a curved trunk and a crown of drooping fronds
    g.lineWidth = .55; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + lean * .3, -h * .6, x + lean, -h); g.stroke();
    g.lineWidth = .35; g.beginPath();
    for (const a of [-2.8, -2.2, -1.6, -1, -.4, .2]) { const ex = x + lean + Math.cos(a) * 3.2, ey = -h + Math.sin(a) * 1.4 + 1.6; g.moveTo(x + lean, -h); g.quadraticCurveTo((x + lean + ex) / 2, -h - 1.2, ex, ey); }
    g.stroke();
  };
  // University of Tampa's Plant Hall (the old Tampa Bay Hotel): a long Moorish hall, horseshoe-arched windows, and slim
  // minarets crowned with onion domes and silver crescents. Palms out front.
  const MINARETS = [[-12, 15], [-7.5, 18.5], [-2.5, 22], [2.5, 20], [7.5, 17], [12, 14]];
  lm('planthall', { flat: true, w: 30, h: 25, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-14, -8, 28, 8); g.fillRect(-15, -8.6, 30, .6);
    for (const [x, h] of MINARETS) {
      g.fillRect(x - .9, -h + 3, 1.8, h - 11);            // the shaft
      g.fillRect(x - 1.3, -h + 3, 2.6, .5);               // a balcony under the dome
      g.beginPath(); g.moveTo(x - 1.3, -h + 3);           // the onion dome
      g.bezierCurveTo(x - 2.4, -h + 1.4, x - .5, -h + .6, x, -h - .4); g.bezierCurveTo(x + .5, -h + .6, x + 2.4, -h + 1.4, x + 1.3, -h + 3); g.fill();
      g.fillRect(x - .08, -h - 1.6, .16, 1.3);
      g.strokeStyle = L.win(Math.max(L.lit(h), .35)); g.lineWidth = .22;   // the silver crescent catches the light
      g.beginPath(); g.arc(x, -h - 2.1, .55, Math.PI * .15, Math.PI * 1.35); g.stroke();
    }
    for (let x = -13; x < 13.2; x += 1.6) {               // horseshoe arches along the hall
      g.fillStyle = L.win(L.lit(3)); g.beginPath(); g.moveTo(x, -1.6); g.lineTo(x, -4.4); g.arc(x + .5, -4.4, .5, Math.PI, 0); g.lineTo(x + 1, -1.6); g.fill();
      g.fillStyle = L.win(L.lit(6)); g.fillRect(x + .2, -7.3, .6, 1.3);
    }
    for (const [x, h] of MINARETS) { g.fillStyle = L.win(L.lit(h - 5)); g.fillRect(x - .25, -h + 5, .5, 1.6); }
    g.fillStyle = L.body; palm(g, -15.5, 11, -1.2); palm(g, 15.2, 12.5, 1.4); palm(g, -10, 9, .8);
  } });
  // Rivergate Tower, "the Beer Can": a round tower, its windows narrowing toward the curved edges, flat top with a rim.
  lm('beercan', { w: 10, h: 34, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-5, -32, 10, 32);
    g.beginPath(); g.ellipse(0, -32, 5, 1.1, 0, Math.PI, 0); g.fill(); g.fillRect(-5.3, -32.6, 10.6, .8); g.fillRect(-.8, -34, 1.6, 1.6);
    for (let y = 1.2; y < 31; y += 1.5) {
      g.fillStyle = L.win(L.lit(y));
      for (let a = -1.35; a <= 1.36; a += .3) {           // columns round the drum: x = 5 sin(a), width shrinks with cos(a)
        const x = 4.4 * Math.sin(a), w = .7 * Math.cos(a); if (w > .12) g.fillRect(x - w / 2, -y - .8, w, .8);
      }
    }
    if (L.edge) { g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath(); for (let y = 6; y < 31; y += 6) { g.moveTo(-5, -y); g.lineTo(5, -y); } g.stroke(); }
  } });
  // The Sykes Building: a crescent of glass, its curved face sweeping up to a rounded top, and a low podium.
  lm('sykes', { w: 12, h: 33, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-6, -5, 12, 5);
    g.beginPath(); g.moveTo(-4.5, -5); g.lineTo(-4.5, -30); g.quadraticCurveTo(-1, -34.5, 3.6, -31.5);
    g.quadraticCurveTo(5.6, -18, 4.5, -5); g.closePath(); g.fill();
    for (let y = 6; y < 31; y += 1.25) {                  // glass bands that follow the curve
      const r = 4.5 + 1 * Math.sin((y - 5) / 26 * Math.PI) - .6, l = -3.8, top = y > 29 ? 2.2 : r;
      g.fillStyle = L.win(L.lit(y)); g.fillRect(l, -y - .55, top - l, .55);
    }
    rows(g, L, -5.3, 5.3, .8, 4.6, { dx: 1.3, ww: .7, dy: 1.6, wh: .9 });
  } });
  // 100 North Tampa (the old Regions Building): a granite-and-pewter-glass tower with setbacks at the 38th and 40th floors,
  // crowned by a stepped pyramid of light cubes that put on a show. Beat chase:
  // rows light from the bottom up as the music gets louder, and a bright row sweeps up through them in time.
  const CUBES = [7, 5, 3, 1], CS = 1.25;               // cubes per row, bottom up, and their size
  lm('hundrednorth', { w: 11, h: 45, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-5.5, -30, 11, 30); g.fillRect(-4.9, -33.1, 9.8, 3.2); g.fillRect(-4.4, -35.5, 8.8, 2.5);
    g.fillRect(-5.7, -30.4, 11.4, .5); g.fillRect(-5.1, -33.4, 10.2, .4);   // granite cornices at the setbacks
    rows(g, L, -4.8, 4.8, 1.2, 29.5, { dx: 1.2, ww: .45, dy: 1.8, wh: 1.1 });
    rows(g, L, -4.2, 4.2, 30.8, 33, { dx: 1.2, ww: .45, dy: 1.8, wh: 1.1 });
    rows(g, L, -3.6, 3.6, 33.6, 35.4, { dx: 1.2, ww: .45, dy: 1.8, wh: 1.1 });
    const level = L.lit(36), lit = Math.round(level * CUBES.length * 1.3), sweep = Math.floor(performance.now() / 260) % (CUBES.length + 2);
    CUBES.forEach((n, row) => {
      const y = -35.5 - (row + 1) * CS, on = row < lit, hot = row === sweep;
      for (let k = 0; k < n; k++) {
        const x = -n * CS / 2 + k * CS, a = hot ? 1 : on ? .45 + .55 * level : .08;
        g.fillStyle = L.body; g.fillRect(x, y, CS, CS);
        g.fillStyle = L.win(a); g.fillRect(x + .12, y + .12, CS - .24, CS - .24);
        g.fillStyle = L.win(a * .6); g.beginPath(); g.moveTo(x + .12, y + .12); g.lineTo(x + .42, y - .18); g.lineTo(x + CS + .18, y - .18); g.lineTo(x + CS - .12, y + .12); g.fill();   // its top
      }
    });
  } });
  // Bank of America Plaza: a 42-storey dark glass tower with notched corners and a stepped, lit top.
  lm('bofaplaza', { w: 12, h: 43, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-6, -40, 12, 40); g.fillRect(-5.4, -41.6, 10.8, 1.7); g.fillRect(-4, -43, 8, 1.5);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-6, -40, .9, 40); g.fillRect(5.1, -40, .9, 40);   // the notched corners
    rows(g, L, -4.6, 4.6, 1.2, 39.5, { dx: 1.05, ww: .55, dy: 1.6, wh: .75 });
    for (const x of [-5.6, 5.6]) for (let y = 2; y < 39; y += 3.2) { g.fillStyle = L.win(L.lit(y) * .6); g.fillRect(x - .15, -y - 1.6, .3, 1.6); }   // slim lights down the notches
    g.fillStyle = L.win(Math.max(L.lit(41), .3)); g.fillRect(-5.4, -40.15, 10.8, .3); g.fillRect(-4, -41.75, 8, .3);   // lit bands at the steps
  } });
  city('tampa', { name: 'Tampa', back: [.6, .9], far: [skyway, farTowers([[-8, 5, 22], [-2, 6, 28], [5, 5, 18]])], b: [
    [0, 'wide', null, [[12, 14]]],
    [.5, '@planthall'],                                                          // Plant Hall, University of Tampa
    [2, 'grid', null, [[10, 22]]],
    [.5, '@sykes'],                                                              // Sykes Building
    [.5, 'ribbon', ['antenna2', 4], [[12, 37]]],                                 // One Tampa City Center
    [.5, '@hundrednorth'],                                                       // 100 North Tampa
    [.5, '@bofaplaza'],                                                          // Bank of America Plaza
    [.5, '@beercan'],                                                            // Rivergate Tower ("the Beer Can")
    [.5, 'slim', null, [[9, 28]]],
    [.5, 'pairs', ['pyramid', 3], [[10, 20]]],
    [.5, 'tall', null, [[9, 25]]],
  ]});

  // ---------- Charlotte ----------
  // Bank of America Corporate Center: a granite shaft that steps in near the top, crowned by a ring of tall metal rods,
  // longest in the middle, lit from within.
  const BOFA = mirror([[7, 0], [7, -40], [6.3, -40], [6.3, -47], [5.4, -47], [5.4, -52], [4.6, -52], [4.6, -54]]);
  lm('bofacc', { w: 14, h: 64, draw(g, L) {
    g.fillStyle = L.body; path(g, BOFA); g.fill();
    for (let x = -4.4; x <= 4.41; x += .55) {             // the crown of rods
      const top = 54 + 9.5 * Math.pow(1 - Math.abs(x) / 4.9, .7);
      g.fillStyle = L.body; g.fillRect(x - .16, -top, .32, top - 53.5);
      g.fillStyle = glow(L, 58, .3); g.fillRect(x - .08, -top + .4, .16, Math.max(0, top - 55.4));
    }
    rows(g, L, -6.2, 6.2, 1.2, 39.5, { dx: 1.05, ww: .45, dy: 1.6, wh: .8 });
    rows(g, L, -5.6, 5.6, 40.6, 46.6, { dx: 1.05, ww: .45, dy: 1.6, wh: .8 });
    rows(g, L, -4.8, 4.8, 47.6, 51.6, { dx: 1.05, ww: .45, dy: 1.6, wh: .8 });
    if (L.edge) { g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath(); for (const x of [-3.5, 0, 3.5]) { g.moveTo(x, 0); g.lineTo(x, -40); } g.stroke(); }
  } });
  // Duke Energy Center: a tall glass box whose top is cut on a slope, its crown a lattice that glows with colour.
  lm('dukeenergy', { w: 13, h: 58, draw(g, L) {
    g.fillStyle = L.body; g.beginPath(); g.moveTo(-6.5, 0); g.lineTo(-6.5, -50); g.quadraticCurveTo(0, -51.5, 6.5, -58); g.lineTo(6.5, 0); g.fill();
    rows(g, L, -5.8, 5.8, 1.2, 49, { dx: 1, ww: .5, dy: 1.5, wh: .75 });
    g.strokeStyle = glow(L, 54, .35); g.lineWidth = .2; g.beginPath();   // the lit crown lattice under the slope
    for (let x = -6; x <= 6; x += 1.5) { const top = x < 0 ? 50.3 + (x + 6.5) * .12 : 51 + x * .95; g.moveTo(x, -49.6); g.lineTo(x, -top + .3); }
    g.moveTo(-6.5, -49.6); g.lineTo(6.5, -49.6); g.stroke();
  } });
  // Truist Center (the old Hearst Tower): Art Deco setbacks rising to a crown of four finials round a central spire.
  const TRUIST = mirror([[5.5, 0], [5.5, -38], [4.6, -38], [4.6, -41.5], [3.6, -41.5], [3.6, -44], [1.2, -44], [.25, -49]]);
  lm('truist', { w: 11, h: 49, draw(g, L) {
    g.fillStyle = L.body; path(g, TRUIST); g.fill();
    for (const x of [-3.2, -1.9, 1.9, 3.2]) { g.beginPath(); g.moveTo(x - .35, -44); g.lineTo(x, -46.4); g.lineTo(x + .35, -44); g.fill(); }
    rows(g, L, -4.7, 4.7, 1.2, 37.5, { dx: 1.2, ww: .4, dy: 1.9, wh: 1.2 });   // tall Deco slit windows
    rows(g, L, -3.8, 3.8, 38.6, 41, { dx: 1.2, ww: .4, dy: 1.9, wh: 1.2 });
    g.fillStyle = glow(L, 43, .25); g.fillRect(-3.4, -43.6, 6.8, .35);
    if (L.edge) { g.strokeStyle = L.edge; g.lineWidth = .15; g.beginPath(); for (const x of [-3, 3]) { g.moveTo(x, 0); g.lineTo(x, -38); } g.stroke(); }
  } });
  // One Wells Fargo Center, "the Jukebox": a shaft topped by a rounded crown with ribs and bands, lit like an old jukebox.
  lm('jukebox', { w: 12, h: 43, draw(g, L) {
    g.fillStyle = L.body; g.fillRect(-6, -35, 12, 35);
    g.beginPath(); g.moveTo(-5.4, -35); g.lineTo(-5.4, -38); g.quadraticCurveTo(-5.2, -43, 0, -43); g.quadraticCurveTo(5.2, -43, 5.4, -38); g.lineTo(5.4, -35); g.fill();
    rows(g, L, -5.3, 5.3, 1.2, 34.5, { dx: 1.1, ww: .5, dy: 1.6, wh: .8 });
    // The crown: ribs that curve over the dome like meridians, bands that wrap round it, and a sheen from lit left to
    // shaded right, so it reads as a rounded, banded drum and dome rather than a flat grille.
    const sh = g.createLinearGradient(-5.4, 0, 5.4, 0); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = sh; g.beginPath(); g.moveTo(-5.4, -35); g.lineTo(-5.4, -38); g.quadraticCurveTo(-5.2, -43, 0, -43); g.quadraticCurveTo(5.2, -43, 5.4, -38); g.lineTo(5.4, -35); g.fill();
    if (L.side) return;
    const c = glow(L, 39, .3); g.strokeStyle = c; g.lineWidth = .22; g.beginPath();
    for (const k of [-.7, -.35, .35, .7]) {                  // meridians: straight up the drum, then curving over to the top
      const x = 5.4 * k; g.moveTo(x, -35.2); g.lineTo(x, -38);
      g.ellipse(0, -38, Math.abs(x), 5, 0, k < 0 ? Math.PI : 0, Math.PI * 1.5, k > 0);
    }
    g.moveTo(0, -35.2); g.lineTo(0, -43);
    for (const [y, hw, sag] of [[36.4, 5.4, .45], [38.4, 5.2, .4], [40.3, 4.2, .3]]) { g.moveTo(-hw, -y); g.ellipse(0, -y, hw, sag, 0, Math.PI, 0, true); }   // bands, sagging toward you
    g.stroke();
  } });
  city('charlotte', { name: 'Charlotte', back: [.7, .9], far: [stadium, farTowers([[-9, 5, 26], [-3, 6, 32], [4, 5, 22], [10, 4, 18]])], b: [
    [0, 'grid', null, [[10, 22]]],
    [.5, 'slim', ['antenna', 4], [[9, 30]]],
    [.5, '@jukebox'],                                                            // One Wells Fargo Center ("the Jukebox")
    [.5, 'ribbon', null, [[11, 34]]],                                            // 301 South College
    [.5, '@bofacc'],                                                             // Bank of America Corporate Center
    [.5, 'cols', null, [[10, 43]]],                                              // 550 South Tryon
    [.5, '@dukeenergy'],                                                         // Duke Energy Center
    [.5, 'pairs', ['pyramid', 3], [[10, 24]]],
    [.5, '@truist'],                                                             // Truist Center
    [.5, 'wide', null, [[12, 18]]],
    [.5, 'tall', ['ziggurat', 3], [[10, 28]]],
  ]});
})();
