/* 魂斗茉莉 MOLI FORCE — a jungle run-and-gun cartridge for the MOLINK console, stage 1 only.
   Plugs into moli_arcade.js: MoliContra(ctx, MoliKit) → { step, draw, key, tap, music, release, done, … }.
   single player, moli on the box art. ↑↑↓↓←→←→ B A on the title screen: 30 lives.
   Keyboard: B = J (fire), A = K (jump). The level, enemies and music are original, in the spirit of the 1987 genre. */
(function () {
'use strict';
window.MoliContra = function (g, K) {
const { W, H, R, cv, text, disc, tone, PIX, CJK } = K;
const TS = 16, COLS = 208, LW = COLS * TS, CAM_MAX = LW - W;
const WS = 212, WFEET = WS + 12;               // swimmer's waterline; where a swimmer's "feet" are
const BOSS_X = 201 * TS;                        // left face of the defence wall
const INK = '#141217', WHITE = '#fcfcfc', YEL = '#f5c518', RED = '#d82800', GREY = '#8c8c94';
const SKIN = '#f0b890';

/* ---------- level: the stage-1 layout, one char per 16px tile ----------
   ' ' night sky · ',' foliage · 't' jungle trunks · '#' boulder cliff · 'G' grass top (one-way floor)
   '~' water · 'B' bridge (blows up). Only grass tops and bridges hold you up; cliffs are scenery. */
const MAP = [
  '                                                                                                                                                                                                         ttttttt',
  '                                                                                      ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,   ttttttt',
  '                                                                                      ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, ttttttt',
  '                                                                                      tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,ttttttt',
  '                                                                                      ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,tttttttttt,,,,,,,,tttttttttttttttttttt,,,,ttt ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,ttttttt',
  '  ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,        ,,,,,,,,,,        ,,,,,,,,,,,,GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGttttttttttGGGGGGGGGGtttttttt tttttttttGGGGtttttttttttttttttttttttttttttttttttttttttttttttt',
  '  ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,        ,,,,,,,,,,        ,,,,,,,,,,,,################################,,,,,,,,,,##########tt,,,,tt ttttttt,,####tt,,,,tttttttttttttttttttttt,,,,,,,,tttttttttttt',
  '  GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGBBBBBBBBGGGGGGGGGGBBBBBBBBGGGGGGGGGGGGGGGG##########################GGGGGGGGGGGGGG########ttGGGGtttt tttttGGGG##ttGGGGtttttt##ttttttttttttttGGGGGGGGtttttttttttt',
  '  ##############################################        ##########        ################################################################,,####tt, ,,tttt######tt####,,,,,,##tttttttttt,,,,########,,tttttttttt',
  '~~########GGGGGG##########GGGG##################~~~~~~~~##########~~~~~~~~##########################GGGGGGGGGGGGGG######################GGGGGG##ttGGGGtttt######tt##GGGGGGGGGGttttttttttGGGG########GGtttttttttt',
  '~~######################################GGGGGG##~~~~~~~~##########~~~~~~~~####################GGGG##################################GG##########tt####,,,,####GGtt############tttt,,,,tt######GGGGGG##,,tttttttt',
  '~~##############GG####GG########################~~~~~~~~##########~~~~~~~~##############################################GGGG##GGGG##############tt##GGGGGG######tt############ttttGGGGtt##############GGtttttttt',
  '~~~~~~~~~~##############~~####~~~~~~##########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~####################~~############################################tt##############tt############,,tt####tt################,ttttttt',
  '~~~~~~~~~~~~~~~~~~GGGG~~~~~~~~~~~~~~~~GGGG~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~GGGGGG~~~~~~~~~~~~~~GGGGGGGGGGGG########################ttGG########GG##tt########GGGGGGtt####tt####GGGGGGGGGGGGGGGGGGGG',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#################################tt##############tt##############tt####tt########################',
];
const cell = (c, r) => MAP[Math.max(0, Math.min(14, r))][Math.max(0, Math.min(COLS - 1, c))];
const waterAt = x => cell(Math.floor(x / TS), 14) === '~';
const JUNGLE = 86;                              // the palm coast gives way to deep jungle here
/* placed enemies: x in tiles (centre), `row` = the ledge they stand on, `y` = rows for things set into a cliff */
const PLACED = [
  { t: 'capsule', at: 2, y: 64, item: 'R' },
  { t: 'rifle', x: 19.9, row: 13 },
  { t: 'pill', x: 21, y: 10, item: 'M' },
  { t: 'rifle', x: 39.9, row: 13 },
  { t: 'capsule', at: 61, y: 95, item: 'S' },
  { t: 'turret', x: 79, y: 10 },
  { t: 'rifle', x: 80, row: 7 },
  { t: 'bush', x: 84, row: 7 },
  { t: 'bush', x: 97, row: 5 },
  { t: 'pill', x: 99, y: 10, item: 'F' },
  { t: 'turret', x: 103, y: 8 },
  { t: 'turret', x: 115, y: 8 },
  { t: 'cannon', x: 129, y: 10 },
  { t: 'cannon', x: 137, y: 4 },
  { t: 'capsule', at: 136, y: 92, item: 'R' },
  { t: 'capsule', at: 138, y: 190, item: 'L' },
  { t: 'pill', x: 143, y: 12, item: 'S' },
  { t: 'rifle', x: 148, row: 9 },
  { t: 'cannon', x: 173, y: 8 },
  { t: 'turret', x: 187, y: 12 },
  { t: 'turret', x: 195, y: 12 },
];

/* ---------- pre-rendered stage: every pixel of the scenery, painted once ---------- */
const hsh = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const PAL = { k: [0, 0, 0], rd: [64, 44, 0], rm: [136, 112, 0], ry: [240, 188, 60], gd: [0, 148, 0], gl: [128, 208, 16],
  wb: [0, 112, 236], wl: [60, 188, 252], ww: [252, 252, 252], sg: [188, 188, 188], sd: [116, 116, 116], st: [92, 92, 124] };
const PEAKS = [[124, 40], [150, 32], [188, 40], [214, 32], [348, 40], [374, 32], [412, 40], [438, 32], [476, 40], [502, 32], [540, 40], [566, 32], [604, 40], [630, 32], [1276, 40], [1302, 32]];
function rockPix(x, y) {
  /* egg-shaped boulders, lit from the upper left, two to a 32px block and staggered */
  const u = x & 31, v = y & 31;
  let best = 9, nx = 0, ny = 0;
  for (const [cx, cy] of [[8, 13], [24, 29], [24, -3]]) {
    const dy = (v - cy) / 14.5, taper = dy < 0 ? 1 - dy * 0.55 : 1, dx = (u - cx) / 8 * taper, d = dx * dx + dy * dy;
    if (d < best) { best = d; nx = dx; ny = dy; }
  }
  const j = (hsh(x, y) - 0.5) * 0.16;
  if (best > 1) return hsh(x >> 1, y >> 1) < 0.55 ? PAL.k : PAL.rd;
  if (best > 0.86 + j) return PAL.k;
  if (best > 0.7 + j) return PAL.rd;
  const l = -0.62 * nx - 0.7 * ny + j;
  return l > 0.3 ? PAL.ry : l > -0.28 ? PAL.rm : PAL.rd;
}
function grassPix(x, y) {
  const v = y & 15, h = hsh(x, y);
  if (v === 0 || v === 15) return PAL.k;
  if (v < 5) return v === 1 && h < 0.12 ? PAL.k : PAL.gd;
  if (v === 5) return h < 0.35 ? PAL.gl : PAL.gd;
  if (v < 12) return h < 0.3 ? PAL.gd : PAL.gl;
  return h < (v - 11) * 0.24 ? PAL.k : h < 0.5 ? PAL.gd : PAL.gl;
}
function bushPix(x, v) {                         // a row of shrubs whose tops sit (16 - height) into the tile
  const h = 5 + Math.round(Math.abs(Math.sin(x * Math.PI / 12)) * 5 + Math.abs(Math.sin(x * 0.9)) * 1.5);
  const top = 16 - h;
  if (v < top) return null;
  if (v === top) return hsh(x, 3) < 0.7 ? PAL.gl : PAL.gd;
  return hsh(x, v) < 0.28 ? PAL.gl : hsh(x, v + 40) < 0.12 ? PAL.k : PAL.gd;
}
function trunkPix(x, y) {
  const u = (x + Math.floor(hsh(Math.floor(x / 11), 5) * 3)) % 11;
  if (u === 0 || (u === 6 && hsh(x, y >> 3) < 0.5)) return PAL.k;
  return hsh(x, y) < 0.06 ? PAL.k : PAL.rd;
}
function waterPix(x, y) {
  const c = Math.floor(x / TS), r = Math.floor(y / TS), v = y & 15, u = x & 15;
  const up = cell(c, r - 1), solid = k => k === '#' || k === 'G';
  if (solid(up) && v < 3) return v === 0 || hsh(x, y) < 0.5 ? PAL.ww : PAL.wl;
  if (!solid(up) && up !== '~' && v === 0) return PAL.wl;
  if ((solid(cell(c - 1, r)) && u < 2) || (solid(cell(c + 1, r)) && u > 13)) return hsh(x, y) < 0.6 ? PAL.ww : PAL.wl;
  const wave = hsh(x >> 3, y) < 0.09 && (y & 3) === 1;
  return wave ? PAL.wl : PAL.wb;
}
function mountainPix(x, y) {
  let hit = null;
  for (const [px, top] of PEAKS) {
    const hw = (y - top) * 1.2;
    if (hw >= 0 && Math.abs(x - px) <= hw && (!hit || top < hit[1])) hit = [px, top, hw];
  }
  if (!hit) return null;
  const [px, top, hw] = hit, e = Math.abs(x - px) / Math.max(1, hw), h = hsh(x, y);
  if (e > 0.85 && h < (e - 0.85) * 5) return PAL.k;
  if (x < px) return h < 0.12 + e * 0.25 + (y - top) * 0.004 ? PAL.sg : PAL.ww;
  return h < 0.3 + e * 0.3 ? PAL.k : h < 0.8 ? PAL.sg : PAL.sd;
}
const LV = cv(LW, H);
(lg => {
  const img = lg.createImageData(LW, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < LW; x++) {
    const c = Math.floor(x / TS), r = Math.floor(y / TS), k = cell(c, r), v = y & 15;
    let col = PAL.k;
    if (k === '#') col = rockPix(x, y);
    else if (k === 'G') col = grassPix(x, y);
    else if (k === '~') col = waterPix(x, y);
    else if (c >= JUNGLE && (k === 't' || k === ' ' && r >= 3 || (k === ',' && r >= 3))) {
      col = trunkPix(x, y);
      if (cell(c, r + 1) === 'G') col = bushPix(x, v) || col;
    } else if ((k === ' ' || k === 'B') && c < JUNGLE) {
      col = mountainPix(x, y) || (hsh(x, y) < 0.004 ? (hsh(y, x) < 0.3 ? PAL.sg : PAL.st) : PAL.k);
    }
    const i = (y * LW + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  lg.putImageData(img, 0, 0);
  const P = (x, y, w, h, c) => R(lg, x, y, w, h, 'rgb(' + c + ')');
  /* palm coast: a thick line of palms and shrubs above the top grass */
  for (let c = 0; c < JUNGLE; c++) {
    if (cell(c, 5) !== ',') continue;
    for (let x = c * TS; x < c * TS + TS; x++) for (let v = 0; v < 16; v++) { const b = bushPix(x, v); if (b) P(x, 96 + v, 1, 1, b); }
  }
  for (let x = 8; x < JUNGLE * TS; x += 13) {
    if (cell(Math.floor(x / TS), 5) !== ',' || cell(Math.floor((x + 8) / TS), 5) !== ',') continue;
    const top = 82 + Math.floor(hsh(x, 1) * 6), lean = hsh(x, 2) < 0.5 ? -1 : 1;
    for (let y = top + 3; y < 104; y++) { const tx = x + Math.round(Math.sin((y - top) / 9) * lean); P(tx, y, 2, 1, (y & 3) ? PAL.rd : PAL.rm); }
    for (let k = 0; k < 6; k++) {
      const dir = k < 3 ? -1 : 1, spread = [0.35, 0.8, 1.25][k % 3];
      for (let s = 0; s < 9; s++) {
        const fx = x + dir * Math.round(s * spread), fy = top + Math.round(s * s * 0.09 * (1.4 - spread * 0.5)) - (s < 3 ? 1 : 0) + (k % 3 === 0 ? -1 : 0);
        P(fx, fy, 2, 1, s < 5 ? PAL.gl : PAL.gd);
        if (s > 2 && s % 2) P(fx, fy + 1, 1, 2, PAL.gd);
      }
    }
  }
  /* jungle roof: big fern fronds drooping over the trunks */
  for (let x = JUNGLE * TS - 8; x < LW; x += 12) {
    const c = Math.floor(x / TS); if (cell(c, 1) !== ',' && cell(c + 1, 1) !== ',') continue;
    for (const [oy, len] of [[18, 12], [36 + Math.floor(hsh(x, 9) * 6), 10]]) {
      if (oy > 40 && cell(c, 3) !== ',' && hsh(x, 7) < 0.6) continue;
      const dir = hsh(x, oy) < 0.5 ? -1 : 1;
      for (let s = 0; s < len; s++) {
        const fx = x + dir * s, fy = oy + Math.round(s * s * 0.06);
        P(fx, fy, 1, 1, PAL.gd);
        const lf = 5 - Math.abs(s - len / 2) * 0.6;
        for (let q = 1; q < lf; q++) { P(fx - dir * Math.round(q * 0.5), fy - q, 1, 1, q < 2 ? PAL.gl : PAL.gd); P(fx - dir * Math.round(q * 0.5), fy + q, 1, 1, q < 3 ? PAL.gl : PAL.gd); }
      }
    }
  }
  for (let x = JUNGLE * TS; x < LW; x++) if (cell(Math.floor(x / TS), 1) === ',') { for (let y = 12; y < 20; y++) if (hsh(x, y) < 0.6 - (y - 12) * 0.06) P(x, y, 1, 1, hsh(y, x) < 0.4 ? PAL.gl : PAL.gd); }
})(LV.getContext('2d'));

/* moli in commando gear: pixel frames from assets/moli_force_sprites.js, pre-built facing right [0] and left [1] */
/* sprite frames arrive as palette-letter rows; pixel grids are composited here, then baked facing right [0] and left [1] */
const gridOf = fr => fr.rows.map(r => [...r].map(ch => ch === '.' ? -1 : ch.charCodeAt(0) - 97));
function bake(grid, pal, ax, tip) {
  const h = grid.length, w = grid[0].length;
  const c = [0, 1].map(m => {
    const o = cv(w, h), x2 = o.getContext('2d');
    grid.forEach((row, y) => row.forEach((i, x) => { if (i >= 0) R(x2, m ? w - 1 - x : x, y, 1, 1, pal[i]); }));
    return o;
  });
  return { c, w, h, ax, tip };
}
/* running legs, drawn over a sprite whose own legs were cut away below `cut`.
   one leg cycle of 6 phases (knee, foot relative to the hip, facing +x); the far leg runs half a cycle behind */
const LEGCYC = [[[4, 5], [8, 11]], [[3, 6], [3, 12]], [[0, 6], [-2, 12]], [[-3, 6], [-7, 11]], [[-2, 5], [-6, 7]], [[4, 3], [3, 7]]];
function withLegs(src, cut, ph, o) {
  const h0 = src.length, sc = o.scale || 1, fwd = o.fwd;
  const grid = src.map((r, y) => r.map((v, x) => (y >= cut && (o.keepX === undefined || fwd * (x - o.ax) < o.keepX)) ? -1 : v));
  const H2 = cut + Math.round(12 * sc) + 1, pad = 10, w = grid[0].length + pad * 2;
  const G = []; for (let y = 0; y < H2; y++) G.push(new Array(w).fill(-1));
  grid.forEach((r, y) => r.forEach((v, x) => { if (y < H2) G[y][x + pad] = v; }));
  const body = G.map(r => r.map(v => v >= 0));
  const hx = o.ax + pad, hy = cut - 1;
  const leg = (dx, cyc, near) => {
    const [kn, ft] = LEGCYC[cyc], m = G.map(r => r.map(() => 0));
    const P = [[hx + dx, hy], [hx + dx + fwd * Math.round(kn[0] * sc), hy + Math.round(kn[1] * sc)], [hx + dx + fwd * Math.round(ft[0] * sc), hy + Math.round(ft[1] * sc)]];
    const st = (x, y, v) => { for (let j = 0; j < o.thick; j++) for (let i = 0; i < o.thick; i++) { const X = x + i - (o.thick >> 1), Y = y + j - 1; if (Y >= 0 && Y < H2 && X >= 0 && X < w) m[Y][X] = Math.max(m[Y][X], v); } };
    for (let k = 0; k < 2; k++) { const [a, b] = [P[k], P[k + 1]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1); for (let t = 0; t <= n; t++) st(Math.round(a[0] + (b[0] - a[0]) * t / n), Math.round(a[1] + (b[1] - a[1]) * t / n), 1); }
    const [fx, fy] = P[2];
    for (let j = -2; j <= 0; j++) for (let i = -2; i <= 4; i++) { const X = fx + fwd * i, Y = fy + j; if (Y >= 0 && Y < H2 && X >= 0 && X < w) m[Y][X] = 2; }
    for (let y = 0; y < H2; y++) for (let x = 0; x < w; x++) if (!m[y][x] && !body[y][x] && (m[y - 1]?.[x] || m[y + 1]?.[x] || m[y][x - 1] || m[y][x + 1])) G[y][x] = 0;
    for (let y = 0; y < H2; y++) for (let x = 0; x < w; x++) if (m[y][x]) {
      const hsh = ((x * 7 + y * 13) ^ (x * y)) % 5;
      G[y][x] = m[y][x] === 2 ? (y === fy - 2 ? o.bootHi : y === fy ? 0 : o.boot) : near ? (hsh === 0 ? o.spot : hsh === 1 ? o.hi : o.fill) : (hsh === 0 ? o.spot : o.dark);
    }
  };
  leg(-fwd, (ph + 3) % 6, false); leg(fwd, ph, true);
  // trim the pad columns back off
  let x0 = w, x1 = 0; G.forEach(r => r.forEach((v, x) => { if (v >= 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }));
  return { grid: G.map(r => r.slice(x0, x1 + 1)), ax: o.ax + pad - x0 };
}
const SPR = {};
(() => {
  const D = window.MOLI_FORCE_SPRITES; if (!D) return;
  for (const k in D.frames) { const fr = D.frames[k]; SPR[k] = bake(gridOf(fr), D.pal, fr.ax, fr.tip); }
  /* camo trousers + brown boots; run cycles for plain, diagonal-up and diagonal-down aim */
  const MO = { fwd: 1, thick: 4, fill: 6, dark: 6, spot: 7, hi: 8, boot: 9, bootHi: 10 };
  for (const [name, src, cut, keepX] of [['run', 'stand', 25], ['rdiag', 'diag', 30], ['rdown', 'down', 24, 4]]) {
    const fr = D.frames[src], g0 = gridOf(fr);
    for (let i = 0; i < 6; i++) {
      const r = withLegs(g0, cut, i, { ...MO, ax: fr.ax, keepX }), dh = r.grid.length - g0.length;
      SPR[name + i] = bake(r.grid, D.pal, r.ax, fr.tip && [fr.tip[0], fr.tip[1] - dh]);
    }
  }
  /* treading water while aiming up / diagonally: the standing aim frames, cut at the waterline */
  for (const [name, src, cut] of [['swimup', 'up', 37], ['swimdiag', 'diag', 22]]) {
    const fr = D.frames[src], g0 = gridOf(fr).slice(0, cut);
    SPR[name] = bake(g0, D.pal, fr.ax, fr.tip && [fr.tip[0], fr.tip[1] + (fr.rows.length - cut)]);
  }
})();
window.MOLI_FORCE_DEBUG = { SPR };
const ESPR = {};
window.MOLI_FORCE_DEBUG.ESPR = ESPR;
(() => {
  const D = window.MOLI_FORCE_ENEMIES; if (!D) return;
  for (const k in D.frames) { const fr = D.frames[k]; ESPR[k] = bake(gridOf(fr), D.pal, fr.ax, fr.tip); }
  /* white fatigues, grey boots, a longer leg than moli's; enemy frames face left */
  const fr = D.frames.run0, g0 = gridOf(fr);
  for (let i = 0; i < 6; i++) ESPR['run' + i] = bake(withLegs(g0, 21, i, { fwd: -1, thick: 4, scale: 1.25, ax: fr.ax, fill: 1, dark: 2, spot: 2, hi: 1, boot: 3, bootHi: 2 }).grid, D.pal, 0, null);
  for (let i = 0; i < 6; i++) ESPR['run' + i].ax = withLegs(g0, 21, i, { fwd: -1, thick: 4, scale: 1.25, ax: fr.ax, fill: 1, dark: 2, spot: 2, hi: 1, boot: 3, bootHi: 2 }).ax;
})();
function espr(k, X, Y, f) {
  const s = ESPR[k]; if (!s) return false;
  g.drawImage(s.c[f < 0 ? 0 : 1], f < 0 ? X - s.ax : X - (s.w - 1 - s.ax), Y - s.h);
  return true;
}
/* rifleman frame for an aim angle, and where its barrel ends */
const rifleFrame = a => Math.sin(a) < -0.45 ? 'aimup' : Math.sin(a) > 0.45 ? 'aimdn' : 'aim0';
function rifleTip(e, a) {
  const f = Math.cos(a) < 0 ? -1 : 1, s = ESPR[rifleFrame(a)];
  return s ? [e.x - f * s.tip[0], e.y + s.tip[1]] : [e.x + Math.cos(a) * 12, e.y - 22 + Math.sin(a) * 12];
}
/* draw frame k with its body centre on X and its bottom row on Y */
function spr(k, X, Y, f) {
  const s = SPR[k]; if (!s) return false;
  g.drawImage(s.c[f > 0 ? 0 : 1], f > 0 ? X - s.ax : X - (s.w - 1 - s.ax), Y - s.h);
  return true;
}
/* which frame moli is showing right now (standing / running poses only) */
function pose() {
  const ph = (p.anim >> 2) % 6, running = p.ground && (keys.L || keys.R);
  if (p.ay < 0) return p.ax ? (running ? 'rdiag' + ph : 'diag') : 'up';
  if (p.ay > 0 && p.ax) return running ? 'rdown' + ph : 'down';
  return running ? 'run' + ph : 'stand';
}

/* moli tucked into a somersault: one frame, turned in exact quarter steps (and mirrored) */
const BALL = [[], []];
(() => {
  const b = cv(20, 20), c = b.getContext('2d');
  disc(c, 10, 10, 8, INK); R(c, 4, 6, 1, 7, '#4d4858');
  R(c, 5, 3, 9, 2, RED); R(c, 3, 5, 2, 3, RED); R(c, 1, 7, 2, 1, RED);
  R(c, 11, 6, 5, 5, WHITE); R(c, 12, 7, 3, 3, INK); R(c, 13, 7, 1, 1, '#4d4858');
  R(c, 14, 12, 5, 2, GREY); R(c, 12, 12, 3, 3, INK);
  R(c, 4, 16, 4, 2, INK); R(c, 8, 17, 4, 2, INK);
  for (let m = 0; m < 2; m++) for (let k = 0; k < 4; k++) {
    const o = cv(20, 20), oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
    oc.translate(10, 10); if (m) oc.scale(-1, 1); oc.rotate(k * Math.PI / 2); oc.drawImage(b, -10, -10);
    BALL[m].push(o);
  }
})();

/* ---------- audio ---------- */
let nbuf = null;
function noise(d, f, vol, delay = 0) {
  const ac = K.ac; if (!ac || K.muted) return;
  if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const dd = nbuf.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1; }
  const t0 = ac.currentTime + delay, s = ac.createBufferSource(), lp = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = nbuf; s.loop = true; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f, t0); lp.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.25), t0 + d);
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
  s.connect(lp); lp.connect(gn); gn.connect(K.out || ac.destination); s.start(t0, Math.random() * 0.8); s.stop(t0 + d + 0.05);
}
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const arp = (notes, st, vol = 0.04, type = 'square') => notes.forEach((n, i) => n && tone(hz(n), st * 0.95, type, 0, vol, i * st));
const SFX = {
  shot: () => tone(1250, 0.05, 'square', 420, 0.022),
  spread: () => tone(720, 0.08, 'square', 240, 0.03),
  laser: () => tone(1900, 0.2, 'sawtooth', 280, 0.022),
  fire: () => tone(260, 0.14, 'triangle', 620, 0.07),
  ping: () => tone(1700, 0.04, 'square', 1500, 0.018),
  kill: () => { noise(0.14, 1800, 0.07); tone(420, 0.1, 'square', 110, 0.025); },
  boom: () => noise(0.5, 900, 0.18),
  big: () => { noise(1.1, 600, 0.26); noise(0.6, 2000, 0.08, 0.05); },
  power: () => arp([72, 76, 79, 84, 88, 91], 0.05),
  die: () => arp([76, 72, 69, 64, 60, 57, 52], 0.07, 0.045),
  splash: () => noise(0.25, 3200, 0.05),
  enemy: () => tone(540, 0.05, 'square', 760, 0.012),
  code: () => arp([60, 64, 67, 72, 0, 67, 72, 76, 79, 84], 0.06, 0.045),
  oneup: () => arp([76, 79, 88, 84, 86, 91], 0.07),
  blip: () => tone(880, 0.05, 'square', 0, 0.03),
  deny: () => { tone(160, 0.12, 'square', 0, 0.045); tone(120, 0.16, 'square', 0, 0.045, 0.12); },
  start: () => arp([57, 64, 69, 0, 69, 72, 76, 0, 81], 0.075, 0.045),
  pause: () => arp([88, 84, 88, 84], 0.07, 0.03),
  clear: () => arp([69, 72, 76, 81, 0, 79, 81, 84, 0, 88, 0, 88, 88, 93], 0.1, 0.045),
  over: () => arp([69, 0, 67, 64, 0, 62, 60, 0, 57], 0.13, 0.04, 'triangle'),
};
/* BGM: an original driving A-minor march — pulse lead + third, triangle octave bass, noise kit */
const LEAD = [
  [69, 4], [72, 2], [76, 2], [74, 2], [72, 2], [71, 2], [72, 2],
  [69, 6], [0, 2], [64, 2], [67, 2], [69, 2], [71, 2],
  [72, 4], [77, 4], [76, 2], [74, 2], [72, 4],
  [74, 6], [71, 2], [67, 4], [0, 4],
  [76, 2], [76, 2], [0, 2], [76, 2], [79, 4], [76, 4],
  [74, 2], [72, 2], [74, 2], [76, 2], [72, 8],
  [77, 4], [74, 4], [72, 4], [69, 4],
  [68, 4], [71, 4], [76, 6], [0, 2],
];
const ROOTS = [45, 45, 41, 43, 45, 45, 38, 40], BASS = [0, 12, 0, 12, 0, 12, 7, 12];
const SC = [9, 11, 0, 2, 4, 5, 7];
const below = n => { const i = SC.indexOf(n % 12); if (i < 0) return n - 4; const j = (i + 5) % 7; let m = n - n % 12 + SC[j]; if (m >= n) m -= 12; return m; };
const song = { on: false, t: 0, step: 0, li: 0, left: 0, bus: null };
function voice(type, f, t0, d, vol) {
  const ac = K.ac, o = ac.createOscillator(), gn = ac.createGain();
  if (typeof type === 'number') o.setPeriodicWave(K.pulse(type)); else o.type = type;
  o.frequency.value = f;
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 0.006); gn.gain.setTargetAtTime(vol * 0.6, t0 + 0.02, 0.06); gn.gain.setTargetAtTime(0, t0 + d * 0.85, 0.015);
  o.connect(gn); gn.connect(song.bus); o.start(t0); o.stop(t0 + d + 0.1);
}
function hit(t0, f, d, vol) {
  const ac = K.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = nbuf; fl.type = f > 4000 ? 'highpass' : 'bandpass'; fl.frequency.value = f;
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
  s.connect(fl); fl.connect(gn); gn.connect(song.bus); s.start(t0, Math.random() * 0.5); s.stop(t0 + d + 0.02);
}
function songStop() {
  if (!song.on) return; song.on = false;
  const ac = K.ac;
  if (song.bus && ac) { const b = song.bus; b.gain.setTargetAtTime(0, ac.currentTime, 0.03); setTimeout(() => b.disconnect(), 400); }
  song.bus = null;
}
function songPump(fast) {
  const ac = K.ac; if (!ac || K.muted) { songStop(); return; }
  if (!song.on) {
    song.on = true; song.t = ac.currentTime + 0.06; song.step = 0; song.li = 0; song.left = 0;
    song.bus = ac.createGain(); song.bus.gain.value = 1; song.bus.connect(ac.destination);
    if (!nbuf) noise(0.01, 100, 0.0001);
  }
  const sx = fast ? 0.066 : 0.074;
  if (song.t < ac.currentTime - 0.25) song.t = ac.currentTime + 0.02;
  while (song.t < ac.currentTime + 0.18) {
    const s = song.step % 128, bar = s >> 4, inBar = s & 15, t0 = song.t;
    if (song.left === 0) {
      const [n, len] = LEAD[song.li];
      if (n) { voice(0.25, hz(n), t0, Math.min(len, 4) * sx, 0.045); voice(0.125, hz(below(n)), t0, Math.min(len, 3) * sx, 0.02); }
      song.left = len; song.li = (song.li + 1) % LEAD.length;
    }
    song.left--;
    if (inBar % 2 === 0) voice('triangle', hz(ROOTS[bar] + BASS[inBar >> 1]), t0, sx * 1.7, 0.12);
    if (inBar === 0 || inBar === 8 || inBar === 10) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.09); gn.gain.setValueAtTime(0.22, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1); o.connect(gn); gn.connect(song.bus); o.start(t0); o.stop(t0 + 0.12); }
    if (inBar === 4 || inBar === 12) hit(t0, 1800, 0.13, 0.09);
    if (inBar % 2 === 1) hit(t0, 7000, 0.035, inBar % 4 === 3 ? 0.035 : 0.018);
    song.t += sx; song.step++;
  }
}

/* ---------- state ---------- */
const keys = { L: false, R: false, U: false, D: false, J: false, B: false };
const S = { mode: 'title', t: 0, mt: 0, done: false, lives: 3, cheat: false, cheatT: 0, score: 0, next1up: 20000, continues: 3, overSel: 0, paused: false, idle: 0 };
const CODE = ['U', 'U', 'D', 'D', 'L', 'R', 'L', 'R', 'B', 'J'];
let codeBuf = [];
let plats, bridges, ents, pshots, eshots, items, fx, p, cam, runnerT, boss, jumpBuf = 0, fireEdge = false, shake = 0;
const setMode = m => { S.mode = m; S.mt = 0; };

const RUN_T = '#d82800', RUN_TD = '#881400', RUN_L = '#bcbcbc', RUN_LD = '#747474', RIF = '#d82800', RIF_D = '#881400';
function runs(row, ch) {
  const out = [], s = MAP[row];
  for (let i = 0; i < COLS;) { if (s[i] !== ch) { i++; continue; } let j = i; while (j < COLS && s[j] === ch) j++; out.push([i, j]); i = j; }
  return out;
}
function buildStage() {
  plats = [];
  for (let r = 0; r < 15; r++) for (const [a, b] of runs(r, 'G')) plats.push({ x: a * TS, w: (b - a) * TS, y: r * TS, alive: true, kind: 'grass' });
  bridges = runs(7, 'B').map(([a, b]) => {
    const segs = [];
    for (let x = a; x < b; x += 2) { const pl = { x: x * TS, w: 2 * TS, y: 7 * TS, alive: true, kind: 'bridge', first: x === a, last: x + 2 >= b }; plats.push(pl); segs.push(pl); }
    return { x: a * TS, segs, i: -1, t: 0 };
  });
  ents = PLACED.map(o => {
    const e = Object.assign({ alive: true, t: 0, hp: 1, on: false }, o);
    if (o.t === 'capsule') { e.x = -99; e.y0 = o.y; e.y = o.y; }
    else { e.x = o.x * TS; e.y = o.row !== undefined ? o.row * TS : o.y * TS; }
    if (o.t === 'turret') { e.hp = 8; e.ang = Math.PI; e.cool = 60; }
    if (o.t === 'pill') { e.hp = 6; e.open = 0; }
    if (o.t === 'cannon') { e.hp = 10; e.up = 0; e.dir = 0; e.cool = 40; }
    if (o.t === 'rifle') { e.cool = 50 + Math.round(o.x * 7) % 40; e.face = -1; }
    if (o.t === 'bush') e.phase = 0;
    return e;
  });
  /* the defence wall: two cannons in the tower, a lookout on top and the core at the gate */
  boss = { alive: true, dying: 0, core: 32, flash: 0 };
  ents.push({ t: 'bgun', x: BOSS_X + 4, y: 112, hp: 16, alive: true, cool: 70, on: false });
  ents.push({ t: 'bgun', x: BOSS_X + 4, y: 132, hp: 16, alive: true, cool: 110, on: false });
  ents.push({ t: 'rifle', x: BOSS_X + 22, y: 48, hp: 1, alive: true, cool: 90, face: -1, on: false, boss: true });
  ents.push({ t: 'core', x: BOSS_X + 16, y: 176, alive: true, on: false });
  pshots = []; eshots = []; items = []; fx = [];
  cam = 0; runnerT = 150;
}
function newPlayer(x, y) {
  p = { x, y, vx: 0, vy: 0, face: 1, ground: null, ball: false, swim: false, dive: false, prone: false, drop: null,
        dead: false, deadT: 0, inv: 120, barrier: 0, fireT: 0, gun: 'N', rapid: false, anim: 0, ax: 1, ay: 0, pit: false };
}
window.MOLI_FORCE_DEBUG.P = () => p;
function startStage() { buildStage(); newPlayer(40, -20); p.inv = 0; }
function addScore(n) {
  S.score += n;
  if (S.score >= S.next1up) { S.lives++; S.next1up += S.next1up === 20000 ? 50000 : 70000; SFX.oneup(); }
}

/* ---------- physics helpers (x = centre, y = feet) ---------- */
function landOn(o, prevY, skip) {
  let best = null;
  for (const pl of plats) if (pl.alive && pl !== skip && prevY <= pl.y + 0.01 && o.y >= pl.y && o.x >= pl.x - 2 && o.x <= pl.x + pl.w + 2 && (!best || pl.y < best.y)) best = pl;
  return best;
}
function support(x, y) {
  for (const pl of plats) if (pl.alive && Math.abs(pl.y - y) < 0.5 && x >= pl.x - 2 && x <= pl.x + pl.w + 2) return pl;
  return null;
}
const floorAt = x => waterAt(x) || plats.some(pl => pl.alive && pl.kind === 'grass' && x >= pl.x + 6 && x <= pl.x + pl.w - 6);
const over = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function pbox() {
  if (p.swim) return p.dive ? null : { x: p.x - 6, y: WS - 14, w: 12, h: 14 };
  if (p.ball) return { x: p.x - 7, y: p.y - 26, w: 14, h: 14 };
  if (p.prone) return { x: p.x - 12, y: p.y - 9, w: 24, h: 9 };
  return { x: p.x - 5, y: p.y - 34, w: 10, h: 34 };
}
function boom(x, y, big) { fx.push({ k: big ? 'big' : 'boom', x, y, t: 0 }); }
function toWater(o) { o.y = WFEET; o.vy = 0; o.swim = true; o.ball = false; SFX.splash(); fx.push({ k: 'splash', x: o.x, y: WS, t: 0 }); }

/* ---------- player ---------- */
const RUN = 1.15, JUMP = -4.6, GRAV = 0.2;   // apex ~50px: clears a 3-tile step (every ledge checked reachable)
function stepPlayer() {
  const dir = (keys.R ? 1 : 0) - (keys.L ? 1 : 0);
  if (p.dead) {
    p.deadT++;
    if (!p.ground && !p.swim && !p.pit) {
      const py = p.y; p.vy = Math.min(p.vy + GRAV, 5); p.y += p.vy; p.x += p.vx;
      if (p.vy > 0) { const pl = landOn(p, py, null); if (pl) { p.y = pl.y; p.ground = pl; p.vx = 0; } }
      if (!p.ground && p.y >= WFEET && waterAt(p.x)) { p.y = WFEET; p.swim = true; p.vx = 0; SFX.splash(); }
      if (p.y > H + 30) p.pit = true;
    }
    if (p.deadT > 110) {
      S.lives--;
      if (S.lives <= 0) { songStop(); SFX.over(); setMode('over'); S.overSel = 0; return; }
      let x = cam + 48; while (x < cam + W - 40 && !floorAt(x)) x += 8;
      newPlayer(x, -24);
    }
    return;
  }
  if (p.inv > 0) p.inv--;
  if (p.barrier > 0) p.barrier--;
  p.anim++;
  if (p.swim) {
    p.dive = keys.D; p.prone = false;
    if (dir) p.face = dir;
    if (!p.dive && dir) {
      p.x += dir * 0.9;
      const fx_ = p.x + dir * 6;
      const pl = plats.find(q => q.alive && q.y >= WFEET - 34 && q.y < WFEET && fx_ >= q.x && fx_ <= q.x + q.w);
      if (pl) { p.swim = false; p.ground = pl; p.y = pl.y; p.x += dir * 4; }
      else if (!waterAt(fx_)) p.x -= dir * 0.9;
    }
  } else if (p.ground) {
    p.prone = keys.D && !dir && !keys.U;
    if (dir) { p.face = dir; if (!keys.D || !keys.U) p.x += dir * RUN; }
    if (jumpBuf > 0) {
      jumpBuf = 0;
      if (p.prone) { p.drop = p.ground; p.ground = null; p.vy = 0.5; p.y += 1; p.prone = false; }
      else { p.ground = null; p.vy = JUMP; p.ball = true; p.spin = 0; }
    }
  } else {
    p.prone = false;
    if (dir) { p.face = dir; p.x += dir * RUN; }
    p.vy = Math.min(p.vy + GRAV, 5);
    const py = p.y; p.y += p.vy;
    if (p.drop && p.y > p.drop.y + 8) p.drop = null;
    if (p.vy > 0) { const pl = landOn(p, py, p.drop); if (pl) { p.y = pl.y; p.ground = pl; p.vy = 0; p.ball = false; } }
    if (!p.ground && p.y >= WFEET && waterAt(p.x)) toWater(p);
    else if (!p.ground && p.y > H + 20) { p.inv = 0; p.barrier = 0; killPlayer(); p.pit = true; p.deadT = 40; return; }
  }
  if (jumpBuf > 0) jumpBuf--;
  const right = boss.alive ? BOSS_X - 8 : LW - 8;
  p.x = Math.max(cam + 6, Math.min(p.x, cam + W - 6, right));
  if (p.ground) { const s = support(p.x, p.y); if (!s) { p.ground = null; p.vy = 0.3; p.ball = false; } else p.ground = s; }

  /* aim: 8 ways; down on the ground = lie prone, down in the air = shoot straight down */
  let ax = dir, ay = keys.U ? -1 : 0;
  if (keys.D && !keys.U && !p.swim && (!p.ground || dir)) ay = 1;
  if (p.swim && ay > 0) ay = 0;
  if (!ax && !ay) ax = p.face;
  if (p.ground && !ax && ay === 0) ax = p.face;
  p.ax = ax; p.ay = ay;
  const GUN = { N: [14, 4, 3.6], M: [6, 6, 4], S: [16, 10, 3.3], L: [26, 1, 6.5], F: [18, 4, 2.6] }[p.gun];
  if (p.fireT > 0) p.fireT--;
  if (fireEdge) { if (p.fireT > 4) p.fireT = 4; fireEdge = false; }
  if (keys.B && p.fireT <= 0 && !p.dive) shoot(GUN);
}
function muzzle() {
  const f = p.face, ax = p.ax, ay = p.ay;
  if (p.swim) { const t = SPR.swim0 && SPR[ay < 0 ? (ax ? 'swimdiag' : 'swimup') : 'swim0'].tip; if (t) return [p.x + f * t[0], WS + 2 + t[1]]; return ay < 0 ? (ax ? [p.x + f * 14, WS - 19] : [p.x + f * 2, WS - 32]) : [p.x + f * 15, WS - 6]; }
  if (p.ball) return [p.x + ax * 10, p.y - 19 + ay * 10];
  const k = p.prone ? 'prone' : pose(), t = SPR[k] && SPR[k].tip;
  if (t) return [p.x + f * t[0], p.y + t[1]];
  if (p.prone) return [p.x + f * 20, p.y - 6];
  if (ay < 0) return ax ? [p.x + f * 14, p.y - 34] : [p.x + f * 2, p.y - 47];
  if (ay > 0) return ax ? [p.x + f * 14, p.y - 10] : [p.x, p.y - 2];
  return [p.x + f * 15, p.y - 21];
}
function shoot([cd, max, sp]) {
  const live = pshots.length;
  if (p.gun !== 'S' && p.gun !== 'L' && live >= max) return;
  if (p.gun === 'S' && live > max - 5) return;
  const [mx, my] = muzzle(), n = Math.hypot(p.ax, p.ay), dx = p.ax / n, dy = p.ay / n, k = p.rapid ? 1.35 : 1;
  p.fireT = cd;
  if (p.gun === 'S') {
    for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) { const c = Math.cos(a), s = Math.sin(a); pshots.push({ k: 'S', x: mx, y: my, vx: (dx * c - dy * s) * sp * k, vy: (dx * s + dy * c) * sp * k, t: 0, dmg: 1 }); }
    SFX.spread();
  } else if (p.gun === 'L') {
    pshots.length = 0;
    pshots.push({ k: 'L', x: mx, y: my, vx: dx * sp * k, vy: dy * sp * k, t: 0, dmg: 3, pierce: new Set() });
    SFX.laser();
  } else if (p.gun === 'F') {
    pshots.push({ k: 'F', x: mx, y: my, bx: mx, by: my, vx: dx * sp * k, vy: dy * sp * k, t: 0, dmg: 2 });
    SFX.fire();
  } else {
    pshots.push({ k: p.gun, x: mx, y: my, vx: dx * sp * k, vy: dy * sp * k, t: 0, dmg: 1 });
    SFX.shot();
  }
}
function killPlayer() {
  if (p.dead || p.inv > 0 || p.barrier > 0 || (p.swim && p.dive)) return;
  p.dead = true; p.deadT = 0; p.gun = 'N'; p.rapid = false; p.prone = false; p.ball = false;
  if (!p.swim) { p.ground = null; p.vy = -3; p.vx = -p.face * 0.9; }
  SFX.die();
}

/* ---------- enemies ---------- */
function ebox(e) {
  switch (e.t) {
    case 'runner': case 'rifle': return { x: e.x - 5, y: e.y - 32, w: 10, h: 32 };
    case 'bush': return e.phase === 2 ? { x: e.x - 5, y: e.y - 26, w: 10, h: 16 } : null;
    case 'turret': return { x: e.x - 12, y: e.y - 12, w: 24, h: 24 };
    case 'pill': return e.open > 6 ? { x: e.x - 12, y: e.y - 12, w: 24, h: 24 } : null;
    case 'cannon': return e.up >= 12 ? { x: e.x - 12, y: e.y + 16 - e.up, w: 24, h: e.up } : null;
    case 'capsule': return { x: e.x - 8, y: e.y - 5, w: 16, h: 10 };
    case 'bgun': return { x: e.x - 14, y: e.y - 5, w: 16, h: 10 };
    case 'core': return boss.alive ? { x: BOSS_X + 4, y: 162, w: 24, h: 28 } : null;
  }
  return null;
}
const aimY = () => p.prone ? p.y - 5 : p.swim ? WS - 6 : p.y - 20;
function aimShot(x, y, sp = 1.7) {
  const dx = p.x - x, dy = aimY() - y, n = Math.hypot(dx, dy) || 1;
  eshots.push({ x, y, vx: dx / n * sp, vy: dy / n * sp, t: 0 });
  SFX.enemy();
}
function spawnRunner() {
  const fromLeft = cam > 64 && Math.random() < 0.2, x = fromLeft ? cam - 6 : cam + W + 6;
  const opts = plats.filter(pl => pl.alive && pl.kind === 'grass' && x >= pl.x && x <= pl.x + pl.w);
  if (!opts.length) return;
  const pl = opts[Math.floor(Math.random() * opts.length)];
  ents.push({ t: 'runner', x, y: pl.y, vx: fromLeft ? 1.1 : -1.1, vy: 0, ground: pl, alive: true, hp: 1, t0: 0, anim: 0, on: true, hopped: false });
}
function damage(e, n) {
  if (e.t === 'core') { boss.core -= n; boss.flash = 4; SFX.ping(); if (boss.core <= 0) winBoss(); return; }
  e.hp -= n;
  if (e.t === 'turret' || e.t === 'pill' || e.t === 'bgun' || e.t === 'cannon') { e.flash = 4; SFX.ping(); }
  if (e.hp > 0) return;
  e.alive = false;
  if (e.t === 'runner') { addScore(100); SFX.kill(); fx.push({ k: 'fall', x: e.x, y: e.y, f: e.vx > 0 ? 1 : -1, t: 0 }); }
  else if (e.t === 'rifle' || e.t === 'bush') { addScore(300); SFX.kill(); fx.push({ k: 'fall', x: e.x, y: e.y - (e.t === 'bush' ? 8 : 0), f: e.face || -1, t: 0 }); }
  else if (e.t === 'capsule') { addScore(500); SFX.boom(); boom(e.x, e.y); items.push({ k: e.item, x: e.x, y: e.y, vx: 0.7, vy: -3.2, ground: null, t: 0 }); }
  else if (e.t === 'pill') { addScore(500); SFX.boom(); boom(e.x, e.y, true); e.dead = true; items.push({ k: e.item, x: e.x, y: e.y - 4, vx: -0.6, vy: -3.6, ground: null, t: 0 }); }
  else { addScore(e.t === 'bgun' ? 1000 : 500); SFX.boom(); boom(e.x, e.y + (e.t === 'cannon' ? 4 : 0), true); e.dead = true; }
}
function winBoss() {
  boss.alive = false; boss.dying = 1; addScore(10000); SFX.big(); songStop();
  for (const e of ents) if (e.alive && e.t !== 'core' && e.x > BOSS_X - 40) { e.alive = false; e.dead = true; }
  eshots.length = 0;
}
function stepEnts() {
  for (const e of ents) {
    if (!e.alive) continue;
    if (e.t === 'capsule') {
      if (!e.on) { if (cam >= e.at * TS) { if (cam - e.at * TS > 64) { e.alive = false; continue; } e.on = true; e.x = cam - 10; } else continue; }
      e.t0 = (e.t0 || 0) + 1; e.x += 1.6 + (cam - (e.lc || cam)); e.lc = cam; e.y = e.y0 + Math.sin(e.t0 * 0.055) * 22;
      if (e.x > cam + W + 20) e.alive = false;
      continue;
    }
    if (!e.on) { if (e.x < cam + W + 24) e.on = true; else continue; }
    if (e.x < cam - 48 && e.t !== 'core') { e.alive = false; continue; }
    if (e.flash) e.flash--;
    const vis = e.x > cam - 8 && e.x < cam + W + 8;
    const near = Math.abs(p.x - e.x) < 260 && !p.dead;
    switch (e.t) {
      case 'runner': {
        e.anim++;
        if (e.ground) {
          e.x += e.vx;
          const s = support(e.x, e.y);
          if (!s) {
            e.ground = null;
            if (!e.hopped && Math.random() < 0.45) { e.vy = -3.2; e.hopped = true; } else e.vy = 0.3;
          } else e.ground = s;
        } else {
          e.x += e.vx * 0.9; const py = e.y; e.vy = Math.min(e.vy + 0.2, 5); e.y += e.vy;
          if (e.vy > 0) { const pl = landOn(e, py, null); if (pl) { e.y = pl.y; e.ground = pl; e.vy = 0; } }
          if (e.y >= WFEET - 6 && waterAt(e.x)) { e.alive = false; fx.push({ k: 'splash', x: e.x, y: WS, t: 0 }); }
          if (e.y > H + 20) e.alive = false;
        }
        if (e.x < cam - 20 || e.x > cam + W + 20) e.alive = false;
        break;
      }
      case 'rifle': {
        e.face = p.x < e.x ? -1 : 1;
        if (vis && near && --e.cool <= 0) { e.cool = 100 + Math.floor(Math.random() * 40); const a = Math.atan2(aimY() - (e.y - 22), p.x - e.x); e.aim = a; aimShot(...rifleTip(e, a)); }
        break;
      }
      case 'bush': {
        e.tm = (e.tm || 0) + 1;
        const cyc = e.tm % 170;
        e.phase = cyc < 90 ? 0 : cyc < 100 ? 1 : cyc < 160 ? 2 : 1;
        e.face = p.x < e.x ? -1 : 1;
        if (vis && cyc === 120 && !p.dead) aimShot(...(ESPR.bush ? [e.x - e.face * ESPR.bush.tip[0], e.y + ESPR.bush.tip[1]] : [e.x + e.face * 10, e.y - 21]));
        break;
      }
      case 'turret': {
        if (!vis) break;
        const want = Math.atan2(aimY() - e.y, p.x - e.x), step = Math.PI / 6;
        const target = Math.round(want / step) * step;
        let d = target - e.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) > 0.01 && S.t % 10 === 0) e.ang += Math.sign(d) * step;
        if (near && --e.cool <= 0) { e.cool = 75; if (Math.abs(d) < 0.3) { eshots.push({ x: e.x + Math.cos(e.ang) * 16, y: e.y + Math.sin(e.ang) * 16, vx: Math.cos(e.ang) * 1.8, vy: Math.sin(e.ang) * 1.8, t: 0 }); SFX.enemy(); } }
        break;
      }
      case 'cannon': {
        /* rises out of the ground once you come close, then only ever aims left: level, 30° up or 30° down */
        if (p.x > e.x - 200 && !p.dead) e.up = Math.min(26, e.up + 0.5);
        if (e.up < 26 || !vis) break;
        const dy = aimY() - (e.y + 16 - 13);
        e.dir = dy < -30 ? -1 : dy > 30 ? 1 : 0;
        if (near && p.x < e.x && --e.cool <= 0) {
          e.cool = 90; const vx = -0.866, vy = e.dir * 0.5;
          eshots.push({ x: e.x + vx * 18, y: e.y + 3 + vy * 18, vx: vx * 1.8, vy: vy * 1.8, t: 0 }); SFX.enemy();
        }
        break;
      }
      case 'pill': {
        e.tm = (e.tm || 0) + 1;
        const cyc = e.tm % 170;
        e.open = cyc < 80 ? Math.max(0, (e.open || 0) - 1) : Math.min(12, (e.open || 0) + 1);
        break;
      }
      case 'bgun': {
        if (!vis || !boss.alive) break;
        if (--e.cool <= 0) { e.cool = 80 + Math.floor(Math.random() * 50); eshots.push({ x: e.x - 14, y: e.y, vx: -(0.7 + Math.random() * 1.5), vy: -1.2 - Math.random() * 0.8, t: 0, arc: true }); SFX.enemy(); }
        break;
      }
    }
    if (!p.dead && (e.t === 'runner') && over(ebox(e), pbox() || { x: -99, y: -99, w: 0, h: 0 })) killPlayer();
  }
  ents = ents.filter(e => e.alive || e.dead);
  /* runners keep coming, like they always do, until the wall is in sight */
  if (cam < CAM_MAX - 160 && --runnerT <= 0) {
    runnerT = 70 + Math.floor(Math.random() * 80);
    if (ents.filter(e => e.alive && e.t === 'runner').length < 4) spawnRunner();
  }
}

/* ---------- shots, items, bridges, fx ---------- */
const inWall = s => boss.alive && s.x > BOSS_X + 2 && s.y > 44 && !(s.x < BOSS_X + 28 && s.y > 160);
function stepShots() {
  const pb = pbox();
  for (const s of pshots) {
    s.t++;
    if (s.k === 'F') { s.bx += s.vx; s.by += s.vy; const a = s.t * 0.35, r = 7; s.x = s.bx + Math.cos(a) * r * (p.face); s.y = s.by + Math.sin(a) * r; }
    else { s.x += s.vx; s.y += s.vy; }
    if (s.x < cam - 16 || s.x > cam + W + 16 || s.y < -16 || s.y > H + 8) { s.gone = true; continue; }
    for (const e of ents) {
      if (!e.alive || !e.on) continue;
      const b = ebox(e); if (!b) continue;
      const r = s.k === 'L' ? 3 : 2;
      if (s.x + r > b.x && s.x - r < b.x + b.w && s.y + r > b.y && s.y - r < b.y + b.h) {
        if (s.pierce) { if (s.pierce.has(e)) continue; s.pierce.add(e); } else s.gone = true;
        damage(e, s.dmg);
        if (!s.pierce) break;
      }
    }
    if (!s.gone && inWall(s)) { s.gone = true; fx.push({ k: 'spark', x: s.x, y: s.y, t: 0 }); }
  }
  pshots = pshots.filter(s => !s.gone);
  for (const s of eshots) {
    s.t++;
    if (s.arc) { s.vy += 0.05; }
    s.x += s.vx; s.y += s.vy;
    if (s.arc && s.y >= 206) { s.gone = true; boom(s.x, 204); continue; }
    if (s.x < cam - 8 || s.x > cam + W + 8 || s.y < -8 || s.y > H) { s.gone = true; continue; }
    if (pb && !p.dead && s.x > pb.x - 1 && s.x < pb.x + pb.w + 1 && s.y > pb.y - 1 && s.y < pb.y + pb.h + 1) { s.gone = true; killPlayer(); }
  }
  eshots = eshots.filter(s => !s.gone);
  for (const it of items) {
    it.t++;
    if (!it.ground && !it.float) {
      const py = it.y; it.vy = Math.min(it.vy + 0.14, 3); it.y += it.vy; it.x += it.vx;
      if (it.vy > 0) { const pl = landOn(it, py, null); if (pl) { it.y = pl.y; it.ground = pl; it.vx = 0; } }
      if (it.y >= WS + 2 && waterAt(it.x)) { it.y = WS + 2; it.float = true; }
      if (it.y > H + 12) it.gone = true;
    } else if (it.ground && !it.ground.alive) { it.ground = null; it.vy = 0; }
    if (it.x < cam - 24) it.gone = true;
    if (pb && !p.dead && over(pb, { x: it.x - 8, y: it.y - 10, w: 16, h: 10 })) {
      it.gone = true; addScore(1000); SFX.power();
      if (it.k === 'R') p.rapid = true; else if (it.k === 'B') p.barrier = 900; else p.gun = it.k;
    }
  }
  items = items.filter(it => !it.gone);
}
function stepBridges() {
  for (const b of bridges) {
    if (b.i < 0) { if (p.x > b.x - 6 && !p.dead) { b.i = 0; b.t = 0; } else continue; }
    if (b.i >= b.segs.length) continue;
    if (++b.t >= 22) {
      b.t = 0; const s = b.segs[b.i++]; s.alive = false;
      boom(s.x + 8, s.y - 4, true); boom(s.x + 24, s.y + 4); SFX.boom(); shake = 6;
      if (p.ground === s) { p.ground = null; p.vy = 0; }
    }
  }
}
function stepFx() {
  for (const f of fx) f.t++;
  fx = fx.filter(f => f.t < (f.k === 'big' ? 34 : f.k === 'fall' ? 36 : f.k === 'boom' ? 24 : f.k === 'splash' ? 20 : 12));
}

function stepPlay() {
  S.t++;
  if (shake) shake--;
  if (boss.dying) {
    boss.dying++;
    if (boss.dying % 7 === 0 && boss.dying < 170) { boom(BOSS_X + 8 + Math.random() * 100, 40 + Math.random() * 160, true); if (boss.dying % 21 === 0) SFX.boom(); shake = 4; }
    if (boss.dying === 200) SFX.clear();
    if (boss.dying > 420) setMode('clear');
  }
  stepPlayer();
  if (S.mode !== 'play') return;
  const target = Math.min(CAM_MAX, Math.floor(p.x - 140));
  if (target > cam && !p.dead) cam = Math.min(target, cam + 2);
  stepBridges(); stepEnts(); stepShots(); stepFx();
}

/* ---------- drawing ---------- */
const sx = x => Math.round(x - cam);
function fl(ox, oy, f, dx, dy, w, h, c) { R(g, f > 0 ? ox + dx : ox - dx - w, oy + dy, w, h, c); }
/* a 2px-thick limb from hip through knee to foot, in facing-relative coords */
function limb(X, Y, f, pts, c) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) fl(X, Y, f, Math.round(ax + (bx - ax) * k / n) - 1, Math.round(ay + (by - ay) * k / n) - 1, 2, 2, c);
  }
  const [fx_, fy] = pts[pts.length - 1];
  fl(X, Y, f, fx_ - 1, fy - 1, 4, 1, c);
}
function moliBody(X, Y, f, band) {
  fl(X, Y, f, -3, -36, 6, 1, INK); fl(X, Y, f, -5, -35, 10, 1, INK); fl(X, Y, f, -6, -34, 12, 19, INK); fl(X, Y, f, -5, -15, 10, 1, INK); fl(X, Y, f, -3, -14, 6, 1, INK);
  fl(X, Y, f, -5, -31, 1, 12, '#4d4858'); fl(X, Y, f, -4, -32, 1, 1, '#4d4858');
  fl(X, Y, f, -6, -33, 12, 2, RED); fl(X, Y, f, -8, -33, 2, 2, RED);
  const w = band % 16 < 8 ? 0 : 1;
  fl(X, Y, f, -11, -32 + w, 3, 1, RED); fl(X, Y, f, -10, -31, 2, 1 + w, RED); fl(X, Y, f, -13, -31 + w * 2, 2, 1, RED);
  fl(X, Y, f, 1, -30, 5, 5, WHITE); fl(X, Y, f, 2, -29, 3, 3, INK); fl(X, Y, f, 3, -29, 1, 1, '#4d4858');
  fl(X, Y, f, 0, -20, 1, 1, YEL);
}
function gun(X, Y, f, ax, ay) {
  if (ay < 0 && !ax) { fl(X, Y, f, 1, -47, 2, 14, GREY); fl(X, Y, f, 0, -36, 4, 3, INK); fl(X, Y, f, 3, -38, 1, 4, '#4c4c58'); return; }
  if (ay) { for (let i = 0; i < 9; i++) fl(X, Y, f, 5 + i, ay < 0 ? -25 - i : -18 + i, 2, 2, GREY); fl(X, Y, f, 4, ay < 0 ? -25 : -19, 3, 3, '#2c2a34'); return; }
  fl(X, Y, f, 4, -22, 11, 2, GREY); fl(X, Y, f, 5, -20, 4, 1, '#4c4c58'); fl(X, Y, f, 6, -20, 2, 3, '#4c4c58'); fl(X, Y, f, 4, -21, 3, 3, '#2c2a34');
}
/* the long NES stride: [back knee, back foot, front knee, front foot] per phase, hips at (-1,-15) and (1,-15) */
const STRIDE = [
  [[-4, -8], [-9, -3], [4, -9], [7, 0]],
  [[-1, -8], [-3, -1], [2, -9], [1, 0]],
  [[4, -9], [7, 0], [-4, -8], [-9, -3]],
  [[2, -9], [1, 0], [-1, -8], [-3, -1]],
];
function legs(X, Y, f, ph, air) {
  if (air) { limb(X, Y, f, [[-1, -15], [-4, -9], [-6, -5]], INK); limb(X, Y, f, [[1, -15], [4, -10], [3, -3]], INK); return; }
  if (ph < 0) { limb(X, Y, f, [[-1, -15], [-2, -7], [-3, 0]], INK); limb(X, Y, f, [[1, -15], [2, -7], [3, 0]], INK); return; }
  const [bk, bf, fk, ff] = STRIDE[ph];
  limb(X, Y, f, [[-1, -15], bk, bf], INK); limb(X, Y, f, [[1, -15], fk, ff], INK);
}
function drawMoli() {
  if (p.inv > 0 && !p.dead && (p.inv >> 2) % 2) return;
  const X = sx(p.x), Y = Math.round(p.y), f = p.face;
  if (p.dead) {
    if (p.pit) return;
    if (!p.ground && !p.swim) { if (!spr('ball' + 'ABCD'[(p.deadT >> 2) % 4], X, Y - 19 + (SPR.ballA.h >> 1), -f)) g.drawImage(BALL[f > 0 ? 1 : 0][(p.deadT >> 2) % 4], X - 10, Y - 29); return; }
    if (p.swim) return;
    if (spr('dead', X, Y, f)) return;
    fl(X, Y, -f, -14, -9, 22, 1, INK); fl(X, Y, -f, -15, -8, 24, 7, INK); fl(X, Y, -f, -14, -1, 22, 1, INK);
    fl(X, Y, -f, 3, -7, 5, 5, WHITE); fl(X, Y, -f, 4, -6, 3, 3, INK); fl(X, Y, -f, -12, -8, 2, 7, RED);
    limb(X, Y, -f, [[-14, -4], [-20, -5], [-24, -2]], INK);
    return;
  }
  if (p.swim) {
    const bob = (p.anim >> 4) % 2;
    if (!p.dive && SPR.swim0) spr(p.ay < 0 ? (p.ax ? 'swimdiag' : 'swimup') : 'swim0', X, WS + 2 + bob, f);
    else if (!p.dive) {
      g.save(); g.beginPath(); g.rect(0, 0, W, WS + 1); g.clip();
      moliBody(X, WS + 22 + bob, f, p.anim); gun(X, WS + 15 + bob, f, p.ax, p.ay);
      g.restore();
    }
    const w = (p.anim >> 3) % 2;
    R(g, X - 10 - w, WS, 5, 1, WHITE); R(g, X + 6 + w, WS, 5, 1, WHITE); R(g, X - 7, WS + 2, 14, 1, '#a4e4fc');
    return;
  }
  if (SPR.stand) {
    if (p.ball) { const k = 'ball' + 'ABCD'[(p.anim >> 2) % 4]; spr(k, X, Y - 19 + (SPR[k].h >> 1), f); }
    else if (p.prone) spr('prone', X, Y, f);
    else { const k = pose(), ph = +k.slice(-1); spr(k, X, Y - (ph === 0 || ph === 3 ? 1 : 0), f); }
  } else if (p.ball) {
    g.drawImage(BALL[f > 0 ? 0 : 1][(p.anim >> 2) % 4], X - 10, Y - 29);
  } else if (p.prone) {
    fl(X, Y, f, -12, -9, 16, 1, INK); fl(X, Y, f, -13, -8, 18, 7, INK); fl(X, Y, f, -12, -1, 16, 1, INK);
    fl(X, Y, f, -11, -8, 1, 5, '#4d4858');
    fl(X, Y, f, -1, -8, 5, 5, WHITE); fl(X, Y, f, 0, -7, 3, 3, INK);
    fl(X, Y, f, 5, -8, 1, 7, INK); fl(X, Y, f, -4, -9, 2, 8, RED);
    fl(X, Y, f, -7, -10 - ((p.anim >> 3) % 2), 3, 1, RED);
    fl(X, Y, f, 5, -7, 15, 2, GREY); fl(X, Y, f, 5, -5, 3, 3, '#2c2a34');
    limb(X, Y, f, [[-13, -5], [-18, -4], [-22, -2]], INK); limb(X, Y, f, [[-13, -3], [-17, -1], [-21, 0]], INK);
  } else {
    const running = p.ground && (keys.L || keys.R);
    const ph = running ? (p.anim >> 3) % 4 : -1, bob = ph === 1 || ph === 3 ? -1 : 0;
    legs(X, Y, f, ph, !p.ground);
    moliBody(X, Y + bob, f, p.anim);
    gun(X, Y + bob, f, p.ax, p.ay);
  }
  if (p.barrier > 0 && (p.barrier > 120 || (p.barrier >> 2) % 2)) {
    const b = pbox(); if (b) { const c = ['#fcfcfc', '#f5c518', '#58d8fc'][(S.t >> 2) % 3]; g.strokeStyle = c; g.lineWidth = 1; g.strokeRect(sx(b.x) - 2.5, b.y - 2.5, b.w + 5, b.h + 5); }
  }
}
/* soldiers are as tall as moli now: 34px, top + trousers, running with the same long stride */
function soldier(X, Y, f, anim, top, topD, leg, legD, pose) {
  if (pose === 'run') {
    const [bk, bf, fk, ff] = STRIDE[(anim >> 3) % 4];
    limb(X, Y, f, [[-1, -14], bk, bf], legD); limb(X, Y, f, [[1, -14], fk, ff], leg);
  } else { limb(X, Y, f, [[-2, -14], [-3, -7], [-4, 0]], legD); limb(X, Y, f, [[1, -14], [2, -7], [2, 0]], leg); }
  fl(X, Y, f, -4, -27, 8, 13, top); fl(X, Y, f, -4, -27, 2, 13, topD); fl(X, Y, f, -4, -15, 8, 1, INK);
  fl(X, Y, f, -3, -33, 6, 6, SKIN); fl(X, Y, f, 1, -31, 1, 1, INK); fl(X, Y, f, -3, -28, 6, 1, '#b07048');
  fl(X, Y, f, -4, -35, 8, 3, topD); fl(X, Y, f, -4, -35, 9, 1, top);
  if (pose === 'run') { const s = (anim >> 3) % 2; fl(X, Y, f, 2, -24 + s, 3, 7, topD); fl(X, Y, f, -4, -25 - s, 3, 7, topD); fl(X, Y, f, 2, -18 + s, 3, 2, SKIN); }
}
function drawEnt(e) {
  const X = sx(e.x), Y = Math.round(e.y);
  if (X < -40 || X > W + 40) return;
  switch (e.t) {
    case 'runner': { const ph = (e.anim >> 2) % 6; if (!espr('run' + ph, X, Y - (ph === 0 || ph === 3 ? 1 : 0), e.vx > 0 ? 1 : -1)) soldier(X, Y, e.vx > 0 ? 1 : -1, e.anim, RUN_T, RUN_TD, RUN_L, RUN_LD, 'run'); break; }
    case 'rifle': {
      if (ESPR.aim0) {
        const a = e.aim !== undefined && Math.sign(Math.cos(e.aim)) === e.face ? e.aim : (e.face > 0 ? 0 : Math.PI);
        const k = rifleFrame(a);
        espr(k === 'aim0' && e.cool > 90 ? 'aim1' : k, X, Y, e.face); break;
      }
      soldier(X, Y, e.face, 0, RIF, RIF_D, RIF, RIF_D, 'stand');
      const a = e.aim !== undefined && Math.abs(Math.cos(e.aim)) > 0.1 ? e.aim : (e.face > 0 ? 0 : Math.PI);
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 1; i < 13; i++) R(g, Math.round(X + ca * i), Math.round(Y - 22 + sa * i), 2, 2, i < 4 ? SKIN : GREY);
      break;
    }
    case 'bush': {
      if (ESPR.bush) {
        const b = ESPR.bush, top = b.h - 13, lift = e.phase === 2 ? 0 : e.phase === 1 ? 5 : 11;
        g.save(); g.beginPath(); g.rect(X - 30, Y - b.h, 60, top); g.clip();
        espr('bush', X, Y + lift, e.face); g.restore();
        g.save(); g.beginPath(); g.rect(X - 30, Y - 13, 60, 13); g.clip();
        espr('bush', X, Y, e.face); g.restore();
        break;
      }
      if (e.phase) {
        const up = e.phase === 2 ? 0 : 6;
        g.save(); g.beginPath(); g.rect(X - 14, 0, 28, Y - 9); g.clip();
        soldier(X, Y + 8 + up, e.face, 0, RIF, RIF_D, RIF, RIF_D, 'stand');
        if (e.phase === 2) fl(X, Y, e.face, 3, -15, 10, 2, GREY);
        g.restore();
      }
      for (const [dx, dy, r] of [[-8, -6, 6], [0, -9, 7], [8, -6, 6], [-3, -4, 5], [5, -4, 5]]) disc(g, X + dx, Y + dy, r, '#009400');
      for (const [dx, dy] of [[-10, -9], [-2, -14], [6, -10], [2, -6], [-6, -5]]) R(g, X + dx, Y + dy, 3, 1, '#80d010');
      break;
    }
    case 'turret': {
      R(g, X - 13, Y - 13, 26, 26, '#000'); R(g, X - 12, Y - 12, 24, 24, e.flash ? WHITE : '#bcbcbc'); R(g, X - 12, Y - 12, 24, 1, WHITE); R(g, X - 12, Y + 11, 24, 1, '#747474'); R(g, X + 11, Y - 12, 1, 24, '#747474');
      for (const [dx, dy] of [[-10, -10], [9, -10], [-10, 9], [9, 9]]) R(g, X + dx, Y + dy, 1, 1, '#000');
      disc(g, X, Y, 8, '#000'); disc(g, X, Y, 7, '#747474'); disc(g, X, Y, 4, e.hp > 3 ? RED : '#fc7460'); R(g, X - 2, Y - 2, 2, 1, '#fc9838');
      const ca = Math.cos(e.ang), sa = Math.sin(e.ang);
      for (let i = 4; i < 17; i++) R(g, Math.round(X + ca * i) - 2, Math.round(Y + sa * i) - 2, 4, 4, i > 14 ? '#000' : '#fcfcfc');
      for (let i = 4; i < 15; i++) R(g, Math.round(X + ca * i) - 1, Math.round(Y + sa * i), 2, 1, '#747474');
      break;
    }
    case 'cannon': {
      /* grey gun box on a round red base, climbing out of the ground */
      const top = Y + 16 - Math.round(e.up);
      g.save(); g.beginPath(); g.rect(X - 30, 0, 60, Y + 16); g.clip();
      R(g, X - 13, top, 26, 26, '#000'); R(g, X - 12, top + 1, 24, 24, e.flash ? WHITE : '#bcbcbc'); R(g, X - 12, top + 1, 24, 1, WHITE); R(g, X - 12, top + 24, 24, 1, '#747474');
      disc(g, X, top + 13, 8, '#000'); disc(g, X, top + 13, 7, RED); disc(g, X - 2, top + 11, 3, '#fc7460');
      for (let i = 5; i < 19; i++) R(g, Math.round(X - i * 0.866) - 2, Math.round(top + 13 + e.dir * i * 0.5) - 2, 5, 5, i > 16 ? '#000' : '#747474');
      g.restore();
      break;
    }
    case 'pill': {
      R(g, X - 13, Y - 13, 26, 26, '#000'); R(g, X - 12, Y - 12, 24, 24, '#bcbcbc'); R(g, X - 12, Y - 12, 24, 1, WHITE);
      const o = e.open || 0;
      R(g, X - 10, Y - 10, 20, 20, INK);
      if (o > 0) {
        disc(g, X, Y, 8, e.flash ? WHITE : '#c01818'); disc(g, X, Y, 5, (S.t >> 3) % 2 ? '#fc7460' : YEL);
        R(g, X - 6, Y - 1, 12, 2, WHITE); R(g, X - 1, Y - 5, 2, 10, WHITE);
      }
      const shut = Math.round((12 - o) * 0.84);
      R(g, X - 10, Y - 10, 20, shut, '#747474'); R(g, X - 10, Y + 10 - shut, 20, shut, '#747474');
      for (let i = 0; i < shut; i += 3) { R(g, X - 10, Y - 10 + i, 20, 1, '#bcbcbc'); R(g, X - 10, Y + 9 - i, 20, 1, '#bcbcbc'); }
      break;
    }
    case 'capsule': {
      const wf = (S.t >> 3) % 2;
      R(g, X - 8, Y - 3, 16, 7, '#bcbcbc'); R(g, X - 7, Y - 4, 14, 1, WHITE); R(g, X - 8, Y + 3, 16, 1, '#747474'); R(g, X - 2, Y - 2, 4, 4, RED);
      R(g, X - 14, Y - 3 - wf * 3, 6, 2, WHITE); R(g, X + 8, Y - 3 - wf * 3, 6, 2, WHITE);
      break;
    }
  }
}
function drawItem(it) {
  const X = sx(it.x), Y = Math.round(it.y + (it.float ? Math.sin(it.t * 0.1) * 1.5 : 0));
  const wf = it.ground || it.float ? 0 : (it.t >> 2) % 2;
  R(g, X - 12, Y - 8 - wf * 2, 6, 3, RED); R(g, X + 6, Y - 8 - wf * 2, 6, 3, RED); R(g, X - 10, Y - 5, 4, 2, '#fc7460'); R(g, X + 6, Y - 5, 4, 2, '#fc7460');
  R(g, X - 6, Y - 11, 12, 11, INK); R(g, X - 5, Y - 10, 10, 9, (it.t >> 3) % 2 ? WHITE : YEL);
  text(g, it.k, X, Y - 10, { align: 'center', color: INK });
}
function drawShot(s) {
  const X = sx(s.x), Y = Math.round(s.y);
  if (s.k === 'L') { for (let i = 0; i < 16; i++) R(g, Math.round(X - s.vx / 6.5 * i) - 1, Math.round(Y - s.vy / 6.5 * i) - 1, 3, 3, i < 3 ? WHITE : '#58d8fc'); return; }
  if (s.k === 'S') { const r = s.t < 8 ? 2 : 3; disc(g, X, Y, r, '#fc3c1c'); R(g, X - 1, Y - 1, 2, 2, WHITE); return; }
  if (s.k === 'F') { disc(g, X, Y, 3, '#fc9838'); R(g, X - 1, Y - 1, 2, 2, YEL); return; }
  R(g, X - 1, Y - 1, 3, 3, WHITE); if (s.k === 'M') R(g, X - 2, Y, 5, 1, WHITE);
}
function drawFx(f) {
  const X = sx(f.x), Y = Math.round(f.y), t = f.t;
  if (f.k === 'boom' || f.k === 'big') {
    const k = f.k === 'big' ? 1.6 : 1;
    if (t < 5) disc(g, X, Y, (3 + t) * k, WHITE);
    else if (t < 14) { disc(g, X, Y, (8 + (t - 5) * 0.6) * k, '#fc9838'); disc(g, X, Y, (5 + (t - 5) * 0.4) * k, YEL); }
    else { const r = (10 - (t - 14) * 0.3) * k; for (const [dx, dy] of [[-4, -3], [4, -2], [0, 3]]) disc(g, X + dx * k, Y + dy * k - (t - 14) * 0.5, Math.max(1, r * 0.5), (t >> 1) % 2 ? '#c84c0c' : '#5c3c2c'); }
  } else if (f.k === 'fall') {
    /* knocked backwards in a little arc, blinking out, then a pop */
    if (!ESPR.fall || t > 28) { const u = Math.max(0, t - 28); if (u < 6) disc(g, X - f.f * 22, Y - 10, 4 + u, WHITE); return; }
    if ((t >> 2) % 2 && t > 16) return;
    espr('fall', X - f.f * t * 0.8, Y - Math.round(t * 1.6 - t * t * 0.045), f.f);
  } else if (f.k === 'pop') {
    if (t < 6) disc(g, X, Y, 4 + t, WHITE); else { for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) R(g, X + dx * (t - 3) * 1.5, Y + dy * (t - 3) * 1.5, 2, 2, '#fc9838'); }
  } else if (f.k === 'splash') {
    for (let i = -2; i <= 2; i++) R(g, X + i * 4, Y - Math.max(0, 8 - Math.abs(i) * 3) * Math.sin(t / 20 * Math.PI) - 1, 2, 2, t < 12 ? WHITE : '#a4e4fc');
  } else if (f.k === 'spark') { R(g, X - 2, Y, 5, 1, YEL); R(g, X, Y - 2, 1, 5, YEL); }
}
/* the exploding bridge: white girder deck with red warning lights, a grey truss hanging under it */
function drawBridge(pl) {
  const x0 = sx(pl.x); if (x0 > W || x0 + pl.w < 0 || !pl.alive) return;
  const y = pl.y;
  R(g, x0, y, pl.w, 1, WHITE); R(g, x0, y + 1, pl.w, 3, '#bcbcbc'); R(g, x0, y + 4, pl.w, 1, '#747474');
  for (let i = 0; i < pl.w; i += 4) R(g, x0 + i, y + 2, 1, 1, '#747474');
  R(g, x0, y + 13, pl.w, 2, '#bcbcbc'); R(g, x0, y + 15, pl.w, 1, '#747474');
  for (let i = 0; i < pl.w; i += 8) for (let k = 0; k < 8; k++) { R(g, x0 + i + k, y + 5 + k, 1, 1, '#bcbcbc'); R(g, x0 + i + 7 - k, y + 5 + k, 1, 1, '#747474'); }
  R(g, x0, y - 9, pl.w, 2, '#bcbcbc'); R(g, x0, y - 7, pl.w, 1, '#747474');
  for (let i = 0; i < pl.w; i += 16) { R(g, x0 + i + 1, y - 7, 2, 7, '#bcbcbc'); R(g, x0 + i + 1, y - 12, 3, 3, (S.t >> 4) % 2 ? RED : '#fc7460'); }
}
function drawWall() {
  const X = sx(BOSS_X); if (X > W) return;
  const dead = !boss.alive;
  const blue = dead ? '#1c1848' : '#24188c', blueL = dead ? '#2c2c50' : '#4428bc', blueD = '#0c0840';
  const gr = dead ? '#5c5c5c' : '#bcbcbc', grD = dead ? '#2c2c2c' : '#747474';
  /* gate: tall blue armour panels */
  R(g, X + 40, 56, 72, 152, blueD);
  for (let x = 0; x < 72; x += 24) for (let y = 58; y < 206; y += 30) {
    R(g, X + 42 + x, y, 20, 28, blue); R(g, X + 42 + x, y, 20, 1, blueL); R(g, X + 42 + x, y, 1, 28, blueL);
    R(g, X + 46 + x, y + 6, 12, 2, blueD); R(g, X + 46 + x, y + 12, 12, 2, blueD);
  }
  R(g, X + 40, 50, 72, 6, gr); R(g, X + 40, 55, 72, 1, grD);
  for (let x = 44; x < 112; x += 8) R(g, X + x, 46, 4, 4, gr);
  /* tower: grey machinery with vents, pipes and lamps */
  R(g, X, 48, 40, 160, '#000');
  for (let y = 50; y < 206; y += 16) { R(g, X + 2, y, 36, 14, gr); R(g, X + 2, y, 36, 1, WHITE); R(g, X + 2, y + 13, 36, 1, grD); R(g, X + 30, y + 3, 6, 8, grD); for (let k = 0; k < 3; k++) R(g, X + 6 + k * 7, y + 5, 4, 1, grD); }
  R(g, X + 34, 48, 3, 160, grD);
  if (!dead) for (let k = 0; k < 3; k++) R(g, X + 8 + k * 10, 58, 4, 3, (S.t >> 3) % 3 === k ? YEL : RED);
  /* core */
  const cx = X + 4, pulse = (S.t >> 3) % 2;
  R(g, cx - 2, 160, 28, 32, '#000');
  if (!dead) {
    R(g, cx, 162, 24, 28, boss.flash ? WHITE : '#881400');
    R(g, cx + 3, 165, 18, 22, pulse ? RED : '#fc3c1c'); R(g, cx + 7, 169, 10, 14, pulse ? '#fc7460' : YEL);
    R(g, cx + 11, 165, 2, 22, '#881400'); R(g, cx + 3, 175, 18, 2, '#881400');
  } else { R(g, cx, 162, 24, 28, INK); R(g, cx + 4, 166, 6, 4, '#5c3c2c'); }
  for (const e of ents) if (e.t === 'bgun' && e.x) {
    const gx = sx(e.x), gy = e.y;
    R(g, gx - 3, gy - 7, 12, 14, '#000');
    if (e.alive) { R(g, gx - 15, gy - 2, 14, 4, e.flash ? WHITE : '#747474'); R(g, gx - 16, gy - 3, 2, 6, '#000'); R(g, gx - 2, gy - 6, 10, 12, e.flash ? WHITE : gr); R(g, gx - 2, gy - 6, 10, 1, WHITE); }
    else R(g, gx - 2, gy - 6, 10, 12, INK);
  }
}
function medal(x, y) { R(g, x, y, 2, 5, '#0058f8'); R(g, x + 4, y, 2, 5, '#0058f8'); R(g, x + 1, y + 4, 4, 2, '#58d8fc'); disc(g, x + 3, y + 8, 3, YEL); R(g, x + 2, y + 7, 2, 2, '#fc9838'); }
function drawHUD() {
  const n = S.lives;
  if (n <= 5) for (let i = 0; i < n; i++) medal(8 + i * 9, 4);
  else { medal(8, 4); text(g, 'x' + n, 18, 6, { color: WHITE, shadow: INK }); }
  if (p && (p.gun !== 'N' || p.rapid)) {
    R(g, 8, 18, 12, 11, INK); R(g, 9, 19, 10, 9, YEL); text(g, p.gun === 'N' ? 'R' : p.gun, 14, 19, { align: 'center', color: INK });
    if (p.rapid && p.gun !== 'N') text(g, '+R', 22, 20, { color: YEL, shadow: INK });
  }
}
function drawPlay(live) {
  const ox = shake ? ((shake % 2) * 2 - 1) * 2 : 0;
  g.save(); g.translate(ox, 0);
  const c0 = Math.round(cam);
  g.drawImage(LV, c0, 0, W, H, 0, 0, W, H);
  /* the water surface shimmers */
  for (let x = -((c0 + (S.t >> 2)) % 24); x < W; x += 24) if (waterAt(c0 + x + 4) && waterAt(c0 + x + 12)) { R(g, x + 2, WS + 4, 8, 1, '#3cbcfc'); }
  for (const pl of plats) if (pl.kind === 'bridge') drawBridge(pl);
  drawWall();
  for (const e of ents) if (e.alive && e.on) drawEnt(e);
  for (const e of ents) if (e.dead && (e.t === 'turret' || e.t === 'pill')) { const X = sx(e.x); R(g, X - 13, e.y - 13, 26, 26, '#000'); R(g, X - 9, e.y - 9, 18, 18, '#402c00'); }
  for (const it of items) drawItem(it);
  drawMoli();
  for (const s of pshots) drawShot(s);
  for (const s of eshots) { const X = sx(s.x), Y = Math.round(s.y); if (s.arc) { disc(g, X, Y, 3, '#fc7460'); R(g, X - 1, Y - 1, 2, 2, WHITE); } else { R(g, X - 1, Y - 1, 3, 3, (S.t >> 2) % 2 ? '#fc7460' : WHITE); } }
  for (const f of fx) drawFx(f);
  g.restore();
  drawHUD();
  if (S.paused) {
    R(g, 0, 0, W, H, 'rgba(0,0,0,.5)');
    text(g, 'PAUSE', W / 2, 92, { align: 'center', shadow: INK });
    text(g, 'SCORE ' + String(S.score).padStart(8, '0'), W / 2, 108, { align: 'center', color: YEL });
    text(g, '回车 继续 · Backspace 返回卡带', W / 2, 126, { align: 'center', size: 12, fam: CJK, color: '#b7b3c6' });
  }
}

/* ---------- title / intro / over / clear ---------- */
let cover = null;
if (window.MOLI_COVERS && window.MOLI_COVERS.contra) { const im = new Image(); im.onload = () => { cover = im; }; im.src = window.MOLI_COVERS.contra; }
function drawTitle(live) {
  R(g, 0, 0, W, H, '#000');
  const ch = 216, cw = Math.round(ch * 2 / 3), cx = W - cw - 10, cy = 12;
  if (cover) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cover, cx, cy, cw, ch); g.imageSmoothingEnabled = false;
    R(g, cx - 1, cy - 1, cw + 2, 1, '#5c5c68'); R(g, cx - 1, cy + ch, cw + 2, 1, '#5c5c68');
  } else { R(g, cx, cy, cw, ch, '#0c2c10'); cam = 0; newPlayer(cx + 50, cy + 150); p.inv = 0; p.face = 1; drawMoli(); }
  const L = 16;
  /* the name follows the room's 中 / EN switch; in English the big line already says it, so the small one steps aside */
  const nm = window.LANG === 'en' ? ['MOLI FORCE', 22] : ['魂斗茉莉', 28];
  text(g, nm[0], L - 1, 24, { size: nm[1], fam: CJK, color: '#fcbcb0' });
  text(g, nm[0], L, 24, { size: nm[1], fam: CJK, color: RED, shadow: '#5c0000' });
  if (!(window.LANG === 'en')) text(g, 'MOLI FORCE', L + 2, 64, { color: YEL, shadow: INK });
  text(g, 'STAGE 1 · 丛林', L + 2, 80, { size: 12, fam: CJK, color: '#b7b3c6' });
  medal(L, 112 + ((S.t >> 4) % 2));
  text(g, '单人丛林突击', L + 12, 110, { size: 12, fam: CJK, color: WHITE });
  text(g, '第一关 试玩版', L + 12, 128, { size: 11, fam: CJK, color: '#6e6a80' });
  if (S.cheat) { if ((S.t >> 3) % 2 || S.cheatT < 60) text(g, '30 LIVES!', L + 2, 164, { color: YEL, shadow: RED }); }
  else if ((S.t >> 5) % 2 === 0) text(g, 'PUSH START', L + 2, 164, { color: WHITE });
  if (live) {
    text(g, 'J 射击 · K 跳跃', L, 190, { size: 11, fam: CJK, color: '#b7b3c6' });
    text(g, '回车 开始 · ⌫ 返回', L, 206, { size: 11, fam: CJK, color: '#6e6a80' });
  } else if ((S.t >> 5) % 2 === 0) text(g, '点击电视 开始游戏', L, 196, { size: 13, fam: CJK, color: YEL });
  text(g, '© MOLINK 1987', L, 224, { size: 8, color: '#4c4c58' });
}
function drawIntro() {
  R(g, 0, 0, W, H, '#000');
  text(g, 'SCORE ' + String(S.score).padStart(8, '0'), 40, 40);
  text(g, 'REST  ' + S.lives, 40, 58);
  text(g, 'HI  00020000', 40, 80, { color: '#8c8799' });
  text(g, 'STAGE 1', W / 2, 120, { align: 'center' });
  text(g, 'JUNGLE', W / 2, 140, { align: 'center', color: YEL });
  text(g, '丛 林', W / 2, 158, { align: 'center', size: 14, fam: CJK, color: '#b7b3c6' });
  if (S.cheat) text(g, '秘籍生效 · 30 条命', W / 2, 196, { align: 'center', size: 12, fam: CJK, color: YEL });
}
function drawOver() {
  R(g, 0, 0, W, H, '#000');
  text(g, 'SCORE ' + String(S.score).padStart(8, '0'), 40, 40);
  text(g, 'GAME OVER', W / 2, 96, { align: 'center', color: RED });
  const opts = S.continues > 0 ? ['CONTINUE', 'END'] : ['END'];
  opts.forEach((o, i) => { text(g, o, W / 2 - 30, 130 + i * 18); if (i === S.overSel) medal(W / 2 - 44, 127 + i * 18); });
  if (S.continues > 0) text(g, '剩余续关 ' + S.continues, W / 2, 180, { align: 'center', size: 12, fam: CJK, color: '#8c8799' });
}
function drawClear() {
  if (S.mt > 300) { K.disclaimer(g, S.mt - 300); return; }
  R(g, 0, 0, W, H, '#000');
  text(g, 'STAGE 1 CLEAR!', W / 2, 70, { align: 'center', color: YEL });
  text(g, '第一关 丛林 · 通关！', W / 2, 92, { align: 'center', size: 16, fam: CJK });
  text(g, 'SCORE ' + String(S.score).padStart(8, '0'), W / 2, 128, { align: 'center' });
  text(g, '防御墙已摧毁 · 仅提供第一关试玩', W / 2, 160, { align: 'center', size: 12, fam: CJK, color: '#b7b3c6' });
  const X = W / 2, Y = 212;
  cam = 0; newPlayer(X, Y); p.inv = 0; p.ay = -1; p.ax = 0; p.anim = S.t; drawMoli();
}

/* ---------- top-level ---------- */
function begin() { S.score = 0; S.next1up = 20000; S.lives = S.cheat ? 30 : 3; S.continues = 3; S.paused = false; SFX.start(); setMode('intro'); }
function step(live) {
  S.mt++;
  if (S.mode === 'title') { S.t++; S.cheatT++; if (live && ++S.idle > 60 * 45) S.done = true; }
  else if (S.mode === 'intro') { S.t++; if (S.mt === 1) startStage(); if (S.mt > 150) setMode('play'); }
  else if (S.mode === 'play') { if (live && !S.paused) stepPlay(); }
  else if (S.mode === 'over') { S.t++; }
  else if (S.mode === 'clear') { S.t++; if (S.mt > 300 + 900) S.done = true; }
}
return {
  get done() { return S.done; },
  get mode() { return S.mode; },
  get playing() { return S.mode === 'play' && !S.paused; },
  hints: [['←→', '移动'], ['↑↓', '瞄准 / 趴下'], ['J', 'B 射击'], ['K', 'A 跳（↓+A 跳下平台）'], ['Enter', '开始 / 暂停'], ['⌫', '返回卡带']],
  step,
  draw(live) {
    g.imageSmoothingEnabled = false;
    if (S.mode === 'title') drawTitle(live);
    else if (S.mode === 'intro') drawIntro();
    else if (S.mode === 'play') drawPlay(live);
    else if (S.mode === 'over') drawOver();
    else drawClear();
  },
  /* recorded music (when the host provides it): title jingle once, stage loop, clear fanfare once */
  get track() {
    if (S.mode === 'title') return { id: 'contra_title' };
    if (S.mode === 'play' && boss.dying) return { id: 'contra_clear' };
    if (S.mode === 'clear') return S.mt < 300 + 600 ? { id: 'contra_clear' } : null;
    if (S.mode === 'play') return p.dead && S.lives <= 0 ? null : { id: 'contra_bgm', loop: true, paused: S.paused };
    return null;
  },
  music(live) {
    if (live && S.mode === 'play' && !S.paused && !boss.dying) songPump(cam >= CAM_MAX - 40); else songStop();
  },
  key(k, down) {
    const was = keys[k]; if (k in keys) keys[k] = down;
    if (!down || was) return;
    S.idle = 0;
    if (S.mode === 'title') {
      codeBuf.push(k); if (codeBuf.length > CODE.length) codeBuf.shift();
      if (!S.cheat && codeBuf.join() === CODE.join()) { S.cheat = true; S.cheatT = 0; SFX.code(); return; }
      if (k === 'S' || (k === 'J' && codeBuf[codeBuf.length - 2] !== 'B')) begin();
      else if (k === 'D' && codeBuf.length < 3) SFX.deny();
    } else if (S.mode === 'play') {
      if (k === 'S') { if (!p.dead && !boss.dying) { S.paused = !S.paused; SFX.pause(); } return; }
      if (k === 'X') { songStop(); S.done = true; return; }
      if (S.paused) return;
      if (k === 'J') jumpBuf = 6;
      if (k === 'B') fireEdge = true;
    } else if (S.mode === 'over') {
      const n = S.continues > 0 ? 2 : 1;
      if (k === 'U' || k === 'D') { S.overSel = (S.overSel + 1) % n; SFX.blip(); }
      else if (k === 'S' || k === 'J') {
        if (n === 2 && S.overSel === 0) { S.continues--; S.score = 0; S.next1up = 20000; S.lives = S.cheat ? 30 : 3; SFX.start(); setMode('intro'); }
        else S.done = true;
      }
    } else if (S.mode === 'clear' && (k === 'S' || k === 'J' || k === 'B')) { if (S.mt > 390) S.done = true; else if (S.mt > 120 && S.mt < 300) S.mt = 300; }
    if (k === 'X' && S.mode !== 'play') { songStop(); S.done = true; }
  },
  tap(u, v) {
    S.idle = 0;
    if (S.mode === 'title') begin();
    else if (S.mode === 'play' && S.paused) S.paused = false;
    else if (S.mode === 'over') this.key('S', true), this.key('S', false);
  },
  release() { for (const k in keys) keys[k] = false; songStop(); },
  stop() { songStop(); },
  sky() { return S.mode === 'play' ? 0x2e7a3a : S.mode === 'title' ? 0xd04030 : 0x505060; },
  debug(x) { S.lives = S.cheat ? 30 : 3; startStage(); setMode('play'); if (x) { cam = Math.max(0, Math.min(CAM_MAX, Math.floor(x - 140))); newPlayer(x, -10); } },
};
};
})();
