/* loading screen: moli rides the tuxedo cat along the bar while the room loads. The screen is opaque; even on a fast load she
   rides all the way to the flag (never quicker than MIN_RIDE s), cheers, then the room opens out of an iris centred on her.
   Sprites are copied from moli_circus.js (this runs before any other script). Progress = bytes of the page's scripts that have
   arrived (weights in LOADER_W), then fonts, then the scene build; LOADER.finish() rides her home and fades the screen out. */
(function () {
'use strict';
const INK = '#141217', WHITE = '#fcfcfc', YEL = '#f5c518';
const W = 280, H = 60, FLOOR = 52, X0 = 26, X1 = W - 26, MIN_RIDE = 2.4;
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function sprite(rows, pal) {
  const h = rows.length, w = rows[0].length, c = cvs(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x]; if (pal[ch]) R(g, x, y, 1, 1, pal[ch]); }
  return c;
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
const CAT_PAL = { K: INK, W: WHITE, G: '#b8f818', P: '#fca0b4', w: '#c4c4d2', e: '#0a0a0a' };
const CAT_ROWS = {
  run1: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '.........WWWWWWWWWWWWWWWWWWWWWWw..........',
    '........wwWWWWWWWWWWWWWWWWWWWwwww.........',
    '.......wwwwWWWW.........WWWW.wwwww........',
    '......wwwww.WWWWW......WWWWW..wwwwww......',
    '......wwwww.WWWWW......WWWWW...wwwww......',
    '.......ww....WW.........WW......ww........',
    '..........................................',
  ],
  run2: [
    '.............................K.......KK...',
    '............................KKK.....KKK...',
    '....K.......................KPKK.K.KKPK...',
    '...KKK......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '........WWWwWWWWWWWWWWWWWWWWWWW...........',
    '........WWWww.WWWWWWWWWWWW.wWWW...........',
    '........WWWww..............wWWW...........',
    '.......WWWWWww.............wWWWWW.........',
    '.......WWWWWww.............wWWWWW.........',
    '........WWww................wWW...........',
    '..........................................',
  ],
  run3: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '.......WWWWwWWWWWWWWWWWWWWWWWWWWW.........',
    '......WWWW..wwWWWWWWWWWWWWww.WWWWW........',
    '.....WWWW...wwww.......wwww...WWWWW.......',
    '....WWWWW....wwwww....wwwww....WWWWWW.....',
    '....WWWWW....wwwww....wwwww.....WWWWW.....',
    '.....WW.......ww.......ww........WW.......',
    '..........................................',
  ],
  jump: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWWWwwww....',
    '......WWWWKKWWWWWWWWWWWWWWWWWWWWWWWWWWWw..',
    '...wWWWWWWWwWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    '..WWWWWWWw....WWWWWWWWWWWW.......WWWWWWWW.',
    '.WWWWWW..............................WW...',
    '.WWWWW....................................',
    '..WW......................................',
    '..........................................',
    '..........................................',
  ],
};
const CAT = {}; for (const k in CAT_ROWS) CAT[k] = sprite(CAT_ROWS[k], CAT_PAL);
const RUNSEQ = ['run1', 'run2', 'run3', 'run2'];
const MOLI_ROWS = [
  '.....KKKKKK.....',
  '...KKKKKKKKKK...',
  '..KKKKKKKKKKKK..',
  '.KKKKKKKKKKKKKK.',
  '.KKKKKKWWWWKKKK.',
  'KKKKKKWWWWWWKKKK',
  'KKKKKWWWKKKWWKKK',
  'KKKKKWWKKKKKWKKK',
  'KKKKKWWKKKKKWKKK',
  'KKKKKWWWKKKWWKKK',
  'KKKKKKWWWWWWKKKK',
  'KKKKKKKWWWWKKKKK',
  'KKKKKKKKKKKKKKKK',
  'KKKKKKKKKKKKKKKK',
  'KKKKKKKKKKKYKKKK',
  'KKKKKKKKKKKKKKKK',
  '.KKKKKKKKKKKKKK.',
  '..KKKKKKKKKKKK..',
];
const MOLI = sprite(MOLI_ROWS, { K: INK, W: WHITE, Y: YEL });

const box = document.getElementById('loading'), c = cvs(W, H), g = c.getContext('2d'), pct = document.createElement('div');
c.className = 'ld-cv'; pct.className = 'ld-pct'; box.prepend(c); box.querySelector('.ld-t').before(pct);

/* progress */
const WT = window.LOADER_W || {}, TOT = Object.values(WT).reduce((a, b) => a + b, 0) || 1;
let got = 0, stage = 0;
const seen = new Set();
document.addEventListener('load', e => {
  const el = e.target; if (!el || el.tagName !== 'SCRIPT' || !el.src) return;
  const k = Object.keys(WT).find(k => el.src.endsWith('/' + k));
  if (k && !seen.has(k)) { seen.add(k); got += WT[k]; }
}, true);
window.__ldGot = v => { got = v * TOT; };
const target = () => stage >= 3 ? 1 : stage === 2 ? 0.93 : stage === 1 ? 0.86 : Math.min(0.84, 0.84 * got / TOT);

let x = X0, t = 0, last = performance.now(), anim = 0, fin = null, arrived = 0, iris = -1;
const SPEED = (X1 - X0) / MIN_RIDE;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; t += dt;
  const goal = X0 + (X1 - X0) * target(), sp = Math.max(0, Math.min(goal - x, SPEED * dt));
  x += sp; const moving = sp > 0.05;
  if (moving) anim += dt * 60;
  const done = fin && x >= X1 - 0.5;
  if (done && !arrived) arrived = t;
  const hop = arrived ? Math.abs(Math.sin((t - arrived) * 9)) * 4 * Math.max(0, 1 - (t - arrived) / 0.7) : 0;
  draw(x, FLOOR - 2, moving, hop, !!arrived);
  pct.textContent = Math.round((x - X0) / (X1 - X0) * 100) + '%';
  /* iris: a hole opens where moli is standing and swallows the whole screen */
  if (arrived && t - arrived > 0.55) {
    if (iris < 0) { iris = t; const r = c.getBoundingClientRect(); box.style.setProperty('--ix', (r.left + (x / W) * r.width) + 'px'); box.style.setProperty('--iy', (r.top + ((FLOOR - 24) / H) * r.height) + 'px'); box.classList.add('iris'); }
    const k = Math.min(1, (t - iris) / 0.75), e = k * k * (3 - 2 * k), R = e * Math.hypot(innerWidth, innerHeight) * 1.05;
    box.style.setProperty('--ir', R + 'px');
    if (k >= 1) { box.hidden = true; fin.cb && fin.cb(); return; }
  }
  requestAnimationFrame(frame);
}
function draw(rx, ry, moving, hop, cheer) {
  g.clearRect(0, 0, W, H);
  R(g, X0, FLOOR, X1 - X0, 1, 'rgba(29,26,34,.25)');
  R(g, X0, FLOOR, Math.max(0, rx - X0), 2, YEL);
  for (let i = X0; i < X1; i += 8) R(g, i, FLOOR + 4, 3, 1, 'rgba(29,26,34,.18)');
  R(g, X1 + 3, FLOOR - 14, 2, 14, INK); R(g, X1 + 5, FLOOR - 14, 9, 6, '#d23a2e');     // the flag
  rx = Math.round(rx); ry = Math.round(ry);
  const fr = moving ? RUNSEQ[(anim >> 3) % 4] : 'run2', bob = moving && fr !== 'run2' ? 1 : 0;
  g.drawImage(CAT[fr], rx - 21, ry - 24);
  const fy = ry - 16 + bob, top = fy - 21 - Math.round(hop);
  R(g, rx - 4, top + 18, 2, fy - top - 18, INK); R(g, rx + 3, top + 18, 2, fy - top - 18, INK);
  R(g, rx - 6, fy - 1, 4, 1, INK); R(g, rx + 3, fy - 1, 4, 1, INK);
  const sway = Math.sin(t * 9) * 2;
  const arms = cheer ? [[-14, -11], [14, -11]] : [[-12, -3 + sway], [12, -3 - sway]], sy = top + 10;
  for (const [ax, ay] of arms) {
    const sx = rx + (ax < 0 ? -7 : 7);
    for (let i = 0; i <= 8; i++) R(g, Math.round(sx + (ax - (ax < 0 ? -7 : 7)) * i / 8), Math.round(sy + ay * i / 8), 1, 1, INK);
    disc(g, sx + (ax - (ax < 0 ? -7 : 7)), sy + ay, 1.6, INK);
  }
  g.drawImage(MOLI, rx - 8, top);
}
requestAnimationFrame(frame);
window.LOADER = {
  scriptsDone() { stage = Math.max(stage, 1); },
  fontsDone() { stage = Math.max(stage, 2); },
  finish(cb) { stage = 3; fin = { cb }; if (document.hidden) { box.hidden = true; cb && cb(); } },
};
})();
