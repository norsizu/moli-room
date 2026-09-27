/* Ambience: the world outside moli's window, synthesised live (no samples).
   wind · rain (hiss + roof rumble + patter) · thunder · birds in the morning · crickets and frogs at night · cicadas on hot summer days · a wind chime at the window · the cat purring when petted.
   An open window lets the world in; shut, it is muffled and quieter.
   Browsers only allow audio after a gesture: call unlock() from a pointer/key handler. */
(function () {
'use strict';
window.Ambience = function () {
  let ac = null, out = null, lp = null, on = true, vol = 0.7;
  /* the mixer: each layer follows the real weather (null), is forced on (true) / off (false) like a white-noise app,
     or — wind, rain, thunder, snow — set to a level 1..3 (the host turns that into the weather it shows and passes it back in S) */
  const force = { wind: null, rain: null, thunder: null, snow: null, birds: null, bugs: null, frogs: null, chime: null };
  const pick = (k, real, onLevel) => force[k] === true ? Math.max(real, onLevel) : force[k] === false ? 0 : real;
  const T0 = (p, v, k) => p.setTargetAtTime(v, ac.currentTime, k);
  const S = { cover: 0, tv: -1, tvVol: 0.5, wind: 0, gust: 0, rain: 0, snow: 0, day: 1, dusk: 0, temp: 20, month: 9, duck: 0, hour: 8, open: 1, wetness: 0, purr: 0, chime: 0, chimeHit: 0 };
  const lv = { wind: 0, rain: 0, snow: 0, birds: 0, bugs: 0, frogs: 0, thunder: 0, chime: 0 };   // what is audible right now, for the mixer UI
  const rnd = (a, b) => a + Math.random() * (b - a);
  const L = {};            // continuous layers: { g: GainNode, ... }
  const timers = { eave: [0.4, 1.1, 1.9], puddle: 0.5, glass: 0.2, creak: 8, flump: 6, bird: 2, cricket: [0.3, 0.9, 1.6], frog: [0.5, 1.8, 3.1, 4.4], cicada: 6, patter: 0, gustWalk: 0 };
  let gustV = 0, gustT = 0, purrPh = 0, chimeSeen = 0;

  function noiseBuf(kind, sec = 4) {
    const n = ac.sampleRate * sec, b = ac.createBuffer(2, n, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let last = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
        else d[i] = w;
      }
    }
    return b;
  }
  function loop(buf, ...chain) {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.loopEnd = buf.duration;
    let n = s; for (const c of chain) { n.connect(c); n = c; }
    s.start(0, Math.random() * buf.duration);
    return n;
  }
  const filt = (type, f, Q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; return b; };
  const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const pan = p => { const s = ac.createStereoPanner ? ac.createStereoPanner() : gain(1); if (s.pan) s.pan.value = p; return s; };

  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    out = gain(0); lp = filt('lowpass', 9000, 0.5);   // lp: the window/room between you and the world
    lp.connect(out); out.connect(ac.destination);
    out.gain.setTargetAtTime(on ? vol : 0, ac.currentTime, 0.8);
    const white = noiseBuf('white'), brown = noiseBuf('brown', 6), pink = noiseBuf('pink');
    L.white = white;
    /* wind: a moving band of brown noise, plus a thin whistle that only shows up in gusts */
    L.windF = filt('bandpass', 420, 0.8); L.windG = gain(0); loop(brown, L.windF, L.windG).connect(lp);
    L.whistF = filt('bandpass', 1100, 9); L.whistG = gain(0); loop(pink, L.whistF, L.whistG).connect(lp);
    /* rain: bright hiss + the dull roar of it landing on the roof */
    L.rainG = gain(0); loop(white, filt('highpass', 900), filt('lowpass', 7000), L.rainG).connect(lp);
    L.roofG = gain(0); loop(pink, filt('lowpass', 700), L.roofG).connect(lp);
    L.patterBus = gain(1); L.patterBus.connect(lp);
    /* rain on the garden's leaves: a softer, mid-range wash */
    L.rainLeafG = gain(0); loop(pink, filt('bandpass', 1700, 0.6), L.rainLeafG).connect(lp);
    /* leaves rustling in the gusts */
    L.leafF = filt('bandpass', 3200, 0.7); L.leafG = gain(0); loop(white, L.leafF, L.leafG).connect(lp);
    /* a distant howl in a gale: two resonant bands that drift against each other */
    L.howlF1 = filt('bandpass', 320, 14); L.howlF2 = filt('bandpass', 470, 16); L.howlG = gain(0);
    loop(pink, L.howlF1, L.howlG); loop(brown, L.howlF2, L.howlG); L.howlG.connect(lp);
    /* the window, shut, whistles through its gap: this one is in the room, so it skips the window filter */
    L.gapF = filt('bandpass', 1100, 28); L.gapG = gain(0); loop(pink, L.gapF, L.gapG).connect(out);
    L.glassBus = gain(1); L.glassBus.connect(out);                 // drops ticking on the glass
    /* snow: the hush of a snowy day, a low soft air */
    L.hushG = gain(0); loop(pink, filt('lowpass', 380, 0.5), L.hushG).connect(lp);
    /* thunder bus with an echo off the hills */
    L.thBus = gain(1); L.thBus.connect(lp);
    const dl = ac.createDelay(2), fb = gain(0.32), ef = filt('lowpass', 520, 0.6), wet = gain(0.4);
    dl.delayTime.value = 0.62; L.thBus.connect(dl); dl.connect(ef); ef.connect(fb); fb.connect(dl); ef.connect(wet); wet.connect(lp);
    L.natureBus = gain(1); L.natureBus.connect(lp);
    /* the cat's purr, right here in the room (skips the window): a low rumble chopped ~26 times a second by the larynx,
       a touch of buzz on top; update() breathes it in and out */
    L.purrO = ac.createOscillator(); L.purrO.type = 'triangle'; L.purrO.frequency.value = 26;
    const am = gain(0.5), depth = gain(0.5); L.purrO.connect(depth); depth.connect(am.gain);
    L.purrG = gain(0); loop(brown, filt('lowpass', 240, 0.8), am, L.purrG).connect(out);
    L.buzzO = ac.createOscillator(); L.buzzO.type = 'sawtooth'; L.buzzO.frequency.value = 52;
    const bz = gain(0.5), bzd = gain(0.5); L.purrO.connect(bzd); bzd.connect(bz.gain);
    L.buzzO.connect(filt('lowpass', 320, 1)).connect(bz); L.buzzG = gain(0); bz.connect(L.buzzG); L.buzzG.connect(out);
    L.purrO.start(); L.buzzO.start();
  }

  /* ---------- one-shots ---------- */
  function drop(t, rain) {
    const s = ac.createBufferSource(); s.buffer = L.white;
    const f = filt('bandpass', rnd(1800, 5200), rnd(6, 14)), g = gain(0), p = pan(rnd(-0.8, 0.8));
    s.connect(f); f.connect(g); g.connect(p); p.connect(L.patterBus);
    const a = rnd(0.05, 0.22) * rain;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, t + rnd(0.03, 0.08));
    s.start(t, Math.random() * 3, 0.1);
  }
  function tone(t, dur, f0, f1, amp, p = 0, type = 'sine', bus) {
    bus = bus || L.natureBus;
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = gain(0), pn = pan(p);
    o.connect(g); g.connect(pn); pn.connect(bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(0.012, dur * 0.25)); g.gain.exponentialRampToValueAtTime(0.0003, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  /* a few made-up but plausible songbirds */
  const BIRDS = [
    (t, p, a, bus) => { const n = 2 + (Math.random() * 4 | 0), f = rnd(3600, 4600); for (let i = 0; i < n; i++) tone(t + i * rnd(0.09, 0.13), 0.07, f * rnd(0.97, 1.05), f * 0.68, a, p, 'sine', bus); },          // sparrow chips
    (t, p, a, bus) => { let x = t; const b = rnd(1700, 2300); for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) { const d = rnd(0.12, 0.26), f = b * rnd(0.9, 1.5); const o = tone(x, d, f, f * rnd(0.8, 1.35), a * 0.8, p, 'sine', bus); o.frequency.linearRampToValueAtTime(f * 1.25, x + d * 0.4); x += d + rnd(0.05, 0.12); } }, // whistler
    (t, p, a, bus) => { const f = rnd(3000, 3800), n = 10 + (Math.random() * 10 | 0); for (let i = 0; i < n; i++) tone(t + i * 0.034, 0.028, f * (1 + i * 0.006), f * 0.9, a * 0.55, p, 'sine', bus); },                  // trill
    (t, p, a, bus) => { tone(t, 0.32, 2600, 3400, a * 0.7, p, 'sine', bus); tone(t + 0.42, 0.45, 3300, 2300, a * 0.7, p, 'sine', bus); },                                                                               // two-note call
  ];
  function cricket(t, voice) {
    const f = [4300, 4700, 5100][voice], p = [-0.6, 0.45, 0.1][voice], a = 0.028 * [1, 0.7, 0.45][voice];
    for (let i = 0; i < 3 + (voice === 1); i++) tone(t + i * 0.034, 0.02, f, f * 0.985, a, p, 'triangle');
  }
  /* pond frogs: a few throaty 'gua-gua' bouts from different corners of the garden */
  function frog(t, v, a) {
    const f0 = [190, 245, 300, 160][v], p = [-0.75, 0.6, -0.15, 0.3][v], n = 2 + (Math.random() * 3 | 0), gap = rnd(0.2, 0.28);
    for (let k = 0; k < n; k++) {
      const t0 = t + k * gap, d = rnd(0.12, 0.17);
      const o = ac.createOscillator(), am = ac.createOscillator(), amg = gain(0.5), g2 = gain(0.5), bp = filt('bandpass', f0 * rnd(3.4, 4.4), 2.2), g = gain(0), pn = pan(p);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 1.12, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.86, t0 + d);
      am.frequency.value = rnd(24, 34); am.connect(amg); amg.connect(g2.gain);      // the rattle of the vocal sac
      o.connect(bp); bp.connect(g2); g2.connect(g); g.connect(pn); pn.connect(L.natureBus);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.012); g.gain.setValueAtTime(a, t0 + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0004, t0 + d);
      o.start(t0); am.start(t0); o.stop(t0 + d + 0.02); am.stop(t0 + d + 0.02);
    }
  }
  /* a glass furin: one bright bell with a detuned twin (the shimmer) and a few inharmonic partials, ringing out */
  const CHIME_F = [2380, 2690, 3170];
  function chime(t, a) {
    const f = CHIME_F[Math.random() * CHIME_F.length | 0] * rnd(0.995, 1.005), d = rnd(1.6, 2.6), pn = pan(rnd(0.05, 0.35));
    pn.connect(L.natureBus);
    for (const [m, amp, dd] of [[1, 1, 1], [1.004, 0.6, 1], [2.76, 0.35, 0.5], [5.4, 0.15, 0.25]]) {
      const o = ac.createOscillator(), g = gain(0); o.frequency.value = f * m; o.connect(g); g.connect(pn);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0002, t + d * dd);
      o.start(t); o.stop(t + d * dd + 0.05);
    }
  }
  function cicada(t) {
    const dur = rnd(4, 8), o = ac.createOscillator(), m = ac.createOscillator(), mg = gain(0.5), g = gain(0), f = filt('bandpass', rnd(4800, 6200), 3), pn = pan(rnd(-0.7, 0.7));
    o.type = 'sawtooth'; o.frequency.value = rnd(4500, 5600); m.frequency.value = rnd(90, 140);
    m.connect(mg.gain); o.connect(f); f.connect(mg); mg.connect(g); g.connect(pn); pn.connect(L.natureBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + dur * 0.35); g.gain.setValueAtTime(0.012, t + dur * 0.75); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); m.start(t); o.stop(t + dur); m.stop(t + dur);
  }
  /* water: a drop landing in a puddle or off the eaves is a tiny bubble — a sine that jumps up in pitch */
  function plink(t, f, a, p, bus) {
    const o = ac.createOscillator(), g = gain(0), pn = pan(p);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(1.6, 2.5), t + rnd(0.03, 0.06));
    o.connect(g); g.connect(pn); pn.connect(bus || L.natureBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
    o.start(t); o.stop(t + 0.1);
  }
  /* a soft noise thud: snow sliding off a branch, a loose shutter knocking */
  function thump(t, fc, dur, a, p, bus) {
    const s = ac.createBufferSource(); s.buffer = L.white; const f = filt('lowpass', fc, 0.8), g = gain(0), pn = pan(p);
    s.connect(f); f.connect(g); g.connect(pn); pn.connect(bus || lp);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.start(t, Math.random() * 3, dur + 0.05);
  }
  /* a branch (or the old fence) creaking under the wind */
  function creak(t, a) {
    const o = ac.createOscillator(), f = filt('bandpass', rnd(500, 900), 4), g = gain(0), pn = pan(rnd(-0.8, 0.8)), d = rnd(0.4, 1);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rnd(60, 90), t);
    for (let x = 0.08; x < d; x += 0.08) o.frequency.linearRampToValueAtTime(rnd(55, 140), t + x);
    o.connect(f); f.connect(g); g.connect(pn); pn.connect(lp);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.1); g.gain.setValueAtTime(a * 0.8, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
    o.start(t); o.stop(t + d + 0.05);
  }
  /* thunder is several different sounds: */
  function rumble(t, dur, fc, peak, p0, p1, swell) {           // a peal: brown noise that darkens as it rolls away across the sky
    const s = ac.createBufferSource(); s.buffer = noiseBuf('brown', dur + 1);
    const f = filt('lowpass', fc, 0.9), g = gain(0), pn = pan(p0);
    s.connect(f); f.connect(g); g.connect(pn); pn.connect(L.thBus);
    if (pn.pan) pn.pan.linearRampToValueAtTime(p1, t + dur);
    f.frequency.setValueAtTime(fc, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, fc * 0.15), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + rnd(0.05, 0.5));
    let x = t + 0.3; while (x < t + dur * 0.75) { g.gain.linearRampToValueAtTime(peak * rnd(swell ? 0.2 : 0.4, swell ? 1.1 : 0.9), x); x += rnd(0.12, swell ? 0.9 : 0.45); }
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.start(t); s.stop(t + dur + 0.2);
  }
  function crackles(t, n, span, a, p0, p1) {                    // the tearing, crackling part of a close strike
    for (let i = 0; i < n; i++) {
      const u = Math.pow(i / n, 1.4), x = t + u * span + rnd(0, 0.03), d = rnd(0.008, 0.04);
      const s = ac.createBufferSource(); s.buffer = L.white; const f = filt('bandpass', rnd(900, 4200), rnd(1, 3)), g = gain(0), pn = pan(p0 + (p1 - p0) * u);
      s.connect(f); f.connect(g); g.connect(pn); pn.connect(L.thBus);
      const aa = a * rnd(0.3, 1) * (1 - u * 0.6);
      g.gain.setValueAtTime(aa, x); g.gain.exponentialRampToValueAtTime(0.0005, x + d);
      s.start(x, Math.random() * 3, d + 0.02);
    }
  }
  /* thunder: distance 0 (right overhead) … 1 (far). Sound arrives after the flash. */
  function thunder(dist = 0.5, kind) {
    if (!ac || !on || force.thunder === false) return;
    lv.thunder = 1;
    const t = ac.currentTime + 0.25 + dist * 4.5, p = rnd(-0.7, 0.7);
    const k = kind || (dist < 0.3 ? (Math.random() < 0.55 ? 'crack' : 'rip') : dist < 0.7 ? (Math.random() < 0.5 ? 'roll' : 'peals') : 'grumble');
    if (k === 'crack') {                 // right overhead: a whip crack, a thump in the chest, then a heavy roll
      const c = ac.createBufferSource(); c.buffer = L.white; const cf = filt('highpass', 1600), cg = gain(0);
      c.connect(cf); cf.connect(cg); cg.connect(L.thBus);
      cg.gain.setValueAtTime(0.65, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.22); c.start(t, 0, 0.3);
      crackles(t + 0.02, 16, 0.5, 0.3, p, p * 0.5);
      const o = ac.createOscillator(), og = gain(0); o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2);
      o.connect(og); og.connect(L.thBus); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.55, t + 0.03); og.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      o.start(t); o.stop(t + 1.4);
      rumble(t + 0.12, rnd(4, 6), 1100, 1, p, -p * 0.5, false);
    } else if (k === 'rip') {            // a crackle that tears right across the sky, then the boom
      crackles(t, 44, 1.5, 0.2, -p, p);
      rumble(t + 0.9, rnd(4, 6.5), 850, 0.95, p, -p, true);
    } else if (k === 'roll') {           // a long rolling peal
      rumble(t, rnd(5, 8), 650, 0.8, p, -p, true);
    } else if (k === 'peals') {          // several overlapping peals bouncing between the clouds
      let x = t; for (let i = 0; i < 3; i++) { rumble(x, rnd(3, 5), rnd(500, 800), 0.6 * rnd(0.7, 1), p + rnd(-0.3, 0.3), rnd(-0.8, 0.8), true); x += rnd(0.8, 1.7); }
    } else {                             // far away: a low grumble you feel more than hear
      rumble(t, rnd(6, 9), rnd(180, 280), 0.5, p, p * 0.6, true);
    }
  }

  /* ---------- the little radio: the user's tunes, looped in order ----------
     the mp3s are pre-baked through a transistor-radio EQ (mono, 240–3400 Hz, squashed, faint hiss; plain <audio>
     can't be filtered live on file://). On top, live WebAudio static: a tuning sweep when she switches it on or the
     station changes track, a low bed of hiss and the odd crackle. It pauses when she stops and resumes where it was. */
  const SONGS = [
    { t: '超级玛丽', bpm: 100 }, { t: '魂斗罗', bpm: 130 }, { t: '猫和老鼠', bpm: 110 }, { t: '俄罗斯方块', bpm: 120 },
    { t: '赤色要塞', bpm: 120 }, { t: '马戏团', bpm: 100 }, { t: '赤影战士', bpm: 120 },
  ].map((s, i) => Object.assign(s, { src: `assets/audio/radio/radio${i + 1}.mp3` }));
  const R = { on: false, song: -1, el: null, g: null, hiss: null, crk: 0, retry: 0, fade: 0 };
  function radioEl(i) {
    if (R.el) R.el.pause();
    R.song = i; R.el = new Audio(SONGS[i].src); R.el.preload = 'auto';
    R.el.onended = () => { radioStart((R.song + 1) % SONGS.length); };
  }
  function radioBuild() {
    R.g = gain(0); R.g.connect(ac.destination);
    R.hiss = gain(0); loop(L.white, filt('highpass', 1200, 0.6), filt('lowpass', 5200, 0.6), R.hiss).connect(R.g);
  }
  /* between-stations noise: a band-pass sweeping across the dial, with a whistle that glides in and out */
  function tuneSweep(t, len) {
    const s = ac.createBufferSource(); s.buffer = L.white; s.loop = true;
    const f = filt('bandpass', 600, 2.5), g = gain(0);
    f.frequency.setValueAtTime(rnd(500, 900), t); f.frequency.exponentialRampToValueAtTime(rnd(2400, 3400), t + len * 0.55); f.frequency.exponentialRampToValueAtTime(1500, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.06); g.gain.setValueAtTime(0.16, t + len * 0.7); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(f); f.connect(g); g.connect(R.g); s.start(t); s.stop(t + len + 0.05);
    const o = ac.createOscillator(), og = gain(0); o.type = 'sine';
    o.frequency.setValueAtTime(rnd(1800, 2600), t); o.frequency.exponentialRampToValueAtTime(rnd(300, 500), t + len * 0.8);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.018, t + len * 0.3); og.gain.linearRampToValueAtTime(0, t + len * 0.85);
    o.connect(og); og.connect(R.g); o.start(t); o.stop(t + len);
  }
  function crackle(t, v) {
    const s = ac.createBufferSource(); s.buffer = L.white; const f = filt('highpass', rnd(1500, 3500)), g = gain(0);
    const d = rnd(0.004, 0.02); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    s.connect(f); f.connect(g); g.connect(R.g); s.start(t, Math.random() * 1.5); s.stop(t + d + 0.01);
  }
  function radioStart(i) {
    if (i == null) i = R.song < 0 ? Math.random() * SONGS.length | 0 : R.song;
    if (i !== R.song || !R.el) radioEl(i);
    R.on = true; R.retry = 0; R.fade = 0;
    if (ac) { if (!R.g) radioBuild(); tuneSweep(ac.currentTime + 0.02, 0.9); }
  }
  function radioTick(dt) {
    if (!R.g) radioBuild();
    const now = ac.currentTime, k = on ? vol * Math.max(0, 1 - S.duck * 1.5) : 0;   // at the console the game owns the speakers: the radio pauses
    R.hiss.gain.setTargetAtTime(R.on ? 0.012 * k : 0, now, 0.3);
    R.g.gain.setTargetAtTime(1, now, 0.1);
    const e = R.el; if (!e) return;
    /* the music comes up after the tuning sweep has settled */
    R.fade = Math.min(1, R.fade + dt / (R.fade < 0.01 ? 0.7 : 0.5) * (R.on ? 1 : 0));
    const want = R.on ? 0.5 * k * R.fade : 0;
    e.volume = Math.max(0, Math.min(1, want));
    const go = R.on && k > 0.001 && S.duck < 0.6;
    if (go && e.paused && !e.ended) { if ((R.retry -= dt) <= 0) { R.retry = 0.5; const pr = e.play(); if (pr && pr.catch) pr.catch(() => {}); } }
    else if (!go && !e.paused) e.pause();
    if (R.on && k > 0 && (R.crk -= dt) <= 0) { R.crk = rnd(0.15, 1.6); crackle(now + 0.01, rnd(0.02, 0.07) * k); }
  }

  /* ---------- the TV's own sound while moli watches a programme ----------
     kind 0 cartoon (xylophone romp, boings, squeaky chatter) · 1 movie (string pad, two people talking) · 2 documentary (narrator, soft pad, birds) */
  const TV = { g: null, bus: null, kind: -1, beat: 0, talk: 0, fx: 0, pad: 0, step: 0, who: 0 };
  function tvBuild() {
    TV.g = gain(0); TV.g.connect(ac.destination);
    const hp = filt('highpass', 220, 0.7), lpf = filt('lowpass', 4200, 0.7);      // a small, boxy TV speaker
    TV.bus = gain(1); TV.bus.connect(hp); hp.connect(lpf); lpf.connect(TV.g);
  }
  /* a mumbled phrase: a buzzy glottal source through two moving formants, chopped into syllables */
  function phrase(t, n, f0, amp, p = 0) {
    const o = ac.createOscillator(), f1 = filt('bandpass', 600, 5), f2 = filt('bandpass', 1500, 7), g = gain(0), g2 = gain(0.6), pn = pan(p);
    o.type = 'sawtooth'; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(pn); pn.connect(TV.bus);
    let x = t; g.gain.setValueAtTime(0, t);
    for (let i = 0; i < n; i++) {
      const d = rnd(0.09, 0.2), fall = 1 - (i / n) * 0.18;
      o.frequency.setValueAtTime(f0 * fall * rnd(0.92, 1.12), x); o.frequency.linearRampToValueAtTime(f0 * fall * rnd(0.85, 1.05), x + d);
      f1.frequency.setValueAtTime(rnd(320, 850), x); f2.frequency.setValueAtTime(rnd(950, 2300), x);
      g.gain.linearRampToValueAtTime(amp, x + 0.025); g.gain.setValueAtTime(amp * rnd(0.6, 1), x + d * 0.7); g.gain.linearRampToValueAtTime(0, x + d);
      x += d + (Math.random() < 0.18 ? rnd(0.12, 0.25) : rnd(0.01, 0.05));
    }
    o.start(t); o.stop(x + 0.05);
    return x - t;
  }
  function tvNote(t, f, d, a, type = 'triangle') {
    const o = ac.createOscillator(), g = gain(0); o.type = type; o.frequency.value = f;
    o.connect(g); g.connect(TV.bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    o.start(t); o.stop(t + d + 0.03);
  }
  function tvPad(t, root, dur, a) {
    for (const k of [0, 7, 12, 16]) for (const det of [-6, 6]) {
      const o = ac.createOscillator(), f = filt('lowpass', 900, 0.5), g = gain(0);
      o.type = 'sawtooth'; o.frequency.value = root * Math.pow(2, k / 12); o.detune.value = det;
      o.connect(f); f.connect(g); g.connect(TV.bus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  function tvTick(dt, kind, level) {
    if (!TV.g) tvBuild();
    const now = ac.currentTime;
    T0(TV.g.gain, on && kind >= 0 ? vol * level : 0, 0.3);
    if (kind !== TV.kind) { TV.kind = kind; TV.beat = now + 0.2; TV.talk = 1 + Math.random() * 2; TV.fx = 2; TV.pad = 0; TV.step = 0; }
    if (kind < 0 || !on) return;
    if (kind === 0) {
      /* cartoon: a skipping xylophone tune in C major pentatonic, 150 bpm eighths, with a boing or a slide whistle now and then */
      while (TV.beat < now + 0.3) {
        const e = 0.2;
        if (TV.step % 8 !== 7 || Math.random() < 0.3) tvNote(TV.beat, 523 * Math.pow(2, PENTA[(TV.step * 3 + (TV.step >> 3) * 2 + (Math.random() < 0.3 ? 1 : 0)) % 8] / 12), 0.25, 0.09);
        if (TV.step % 4 === 0) tvNote(TV.beat, [131, 175, 196, 131][(TV.step >> 4) % 4], 0.3, 0.12, 'sine');
        TV.beat += e; TV.step++;
      }
      TV.fx -= dt;
      if (TV.fx <= 0) {
        TV.fx = rnd(2.5, 6); const t = now + 0.05;
        if (Math.random() < 0.5) tone(t, 0.35, 180, 620, 0.12, 0, 'sine', TV.bus);                   // boing
        else { tone(t, 0.25, 700, 1600, 0.06, 0, 'sine', TV.bus); tone(t + 0.26, 0.3, 1600, 500, 0.06, 0, 'sine', TV.bus); }   // slide whistle
      }
      TV.talk -= dt; if (TV.talk <= 0) TV.talk = phrase(now + 0.05, 3 + (Math.random() * 5 | 0), rnd(380, 520), 0.07) + rnd(1.5, 4);
    } else if (kind === 1) {
      /* movie: slow warm chords under two people talking in turn */
      TV.pad -= dt;
      if (TV.pad <= 0) { TV.pad = 6; tvPad(now + 0.05, [110, 87.3, 98, 130.8][TV.step++ % 4], 6.4, 0.012); }
      TV.talk -= dt;
      if (TV.talk <= 0) { TV.who ^= 1; TV.talk = phrase(now + 0.05, 4 + (Math.random() * 9 | 0), TV.who ? rnd(190, 230) : rnd(105, 125), 0.09, TV.who ? 0.15 : -0.15) + rnd(0.5, 1.6); }
    } else {
      /* documentary: a calm narrator, a soft pad, birds from the footage */
      TV.pad -= dt;
      if (TV.pad <= 0) { TV.pad = 8; tvPad(now + 0.05, [98, 110, 87.3][TV.step++ % 3], 8.5, 0.008); }
      TV.talk -= dt; if (TV.talk <= 0) TV.talk = phrase(now + 0.05, 6 + (Math.random() * 10 | 0), rnd(100, 118), 0.085) + rnd(1.2, 3);
      TV.fx -= dt; if (TV.fx <= 0) { TV.fx = rnd(2, 5); BIRDS[Math.random() * BIRDS.length | 0](now + 0.05, rnd(-0.3, 0.3), 0.05); }
    }
  }

  /* ---------- per-frame ---------- */
  function update(dt, st) {
    Object.assign(S, st);
    if (!ac || ac.state !== 'running') return;
    radioTick(dt);
    tvTick(dt, S.tv == null ? -1 : S.tv, S.tvVol == null ? 0.5 : S.tvVol);
    const now = ac.currentTime, T = (p, v, k = 0.6) => p.setTargetAtTime(v, now, k);
    /* wind: slow random gusting on top of the measured speed */
    gustT -= dt; if (gustT <= 0) { gustT = rnd(0.6, 2.2); gustV = Math.random() * Math.random(); }
    const w = pick('wind', Math.min(1, S.wind / 12), 0.45), rain = pick('rain', S.rain, 0.55), gusty = Math.min(1, Math.max(0, S.gust / Math.max(S.wind, 0.1) - 1));
    const gw = w * (0.7 + 0.6 * gustV * (0.3 + gusty));
    T(L.windG.gain, force.wind === false ? 0 : 0.015 + gw * 0.5, 0.9); T(L.windF.frequency, 260 + gw * 700, 1.2);
    T(L.whistG.gain, Math.max(0, gw - 0.45) * 0.12, 0.8); T(L.whistF.frequency, 700 + gw * 900, 1.5);
    T(L.rainG.gain, rain * 0.22, 1.5); T(L.roofG.gain, rain * 0.55 + S.snow * 0.02, 1.5);
    const shut = 1 - S.open;                                   // glass cuts the highs and a good part of the level
    const snow = pick('snow', S.snow, 0.5), cover = Math.min(1, S.cover || 0), hush = 1 - Math.min(0.45, snow * 0.3 + cover * 0.2);   // snow swallows sound
    T(lp.frequency, (9000 - shut * 6200) * (1 - S.duck * 0.7) * hush, 0.8);
    T(L.rainLeafG.gain, rain * 0.1 * (1 - cover * 0.8), 1.5);
    T(L.leafG.gain, Math.max(0, gw - 0.12) * 0.07 * (1 - cover * 0.7), 0.3); T(L.leafF.frequency, 2400 + gw * 2400, 0.4);
    const howl = Math.max(0, w - 0.4) / 0.6;
    T(L.howlG.gain, howl * 0.05 * (0.4 + gustV), 0.9); T(L.howlF1.frequency, 260 + gw * 200 + gustV * 60, 1.5); T(L.howlF2.frequency, (260 + gw * 200) * 1.47 - gustV * 40, 1.7);
    T(L.gapG.gain, shut * Math.max(0, gw - 0.3) * 0.035, 0.5); T(L.gapF.frequency, 850 + gw * 900 + gustV * 350, 0.6);
    T(L.hushG.gain, snow * 0.06 + cover * 0.008, 2);
    T(out.gain, on ? vol * (1 - S.duck) * (1 - shut * 0.4) : 0, 0.8);   // room sounds fade right out at the console
    lv.wind = force.wind === false ? 0 : Math.max(0.05, w); lv.rain = rain; lv.snow = snow > 0.02 ? Math.min(1, snow + 0.1) : 0; lv.thunder = force.thunder === true || typeof force.thunder === 'number' ? 1 : force.thunder === false ? 0 : lv.thunder * 0.995;
    if (!on) return;
    /* patter */
    if (rain > 0.02) { timers.patter -= dt; while (timers.patter <= 0) { timers.patter += 0.5 / (1 + rain * 25); drop(now + Math.random() * 0.05, rain); } }
    /* the eaves drip in three steady places (and keep dripping a while after the rain stops) */
    const dripK = Math.max(rain, Math.min(1, S.wetness) * 0.25 * (force.rain === false ? 0 : 1));
    if (dripK > 0.02) for (let i = 0; i < 3; i++) {
      timers.eave[i] -= dt;
      if (timers.eave[i] <= 0) { timers.eave[i] = (rain > 0.05 ? rnd(0.25, 0.6) / (0.4 + rain) : rnd(1.2, 3.5)) * [1, 1.3, 0.8][i]; plink(now + 0.02, [820, 1060, 690][i] * rnd(0.97, 1.03), 0.035 * Math.min(1, 0.4 + dripK), [-0.55, 0.2, 0.7][i]); }
    }
    /* puddles: bubbles popping all over the garden in a proper downpour */
    if (rain > 0.12) { timers.puddle -= dt; if (timers.puddle <= 0) { timers.puddle = rnd(0.05, 0.3) / rain; plink(now + 0.02, rnd(450, 1400), 0.02 * rain, rnd(-0.9, 0.9)); } }
    /* with the window shut the drops tick on the glass right in front of you */
    if (rain > 0.05 && shut > 0.3) { timers.glass -= dt; if (timers.glass <= 0) { timers.glass = rnd(0.04, 0.25) / (rain + 0.15); tone(now + 0.01, 0.014, rnd(3200, 6000), 2600, 0.018 * rain * shut, rnd(-0.4, 0.4), 'sine', L.glassBus); } }
    /* a gale: branches creak and something loose knocks */
    if (w > 0.55 && force.wind !== false) { timers.creak -= dt; if (timers.creak <= 0) { timers.creak = rnd(5, 14) / w; if (Math.random() < 0.6) creak(now + 0.05, 0.03 * w); else { thump(now + 0.05, 260, 0.18, 0.12 * w, rnd(-0.6, 0.6)); if (Math.random() < 0.5) thump(now + 0.3, 240, 0.16, 0.08 * w, 0); } } }
    /* snow: now and then a load slides off a branch, soft as a pillow */
    if ((snow > 0.1 || cover > 0.3) && force.snow !== false) { timers.flump -= dt; if (timers.flump <= 0) { timers.flump = rnd(5, 16); thump(now + 0.05, rnd(220, 420), rnd(0.35, 0.7), 0.07 * Math.max(snow, cover), rnd(-0.85, 0.85)); } }
    /* birds: a morning thing — dawn chorus loudest, gone by 10 o'clock, none in the dark or in heavy rain */
    const morning = 1 - Math.min(1, Math.max(0, (S.hour - 9.5) / 0.5));
    const birdy = pick('birds', S.day * morning * (0.6 + S.dusk * 0.8) * (1 - Math.min(1, S.rain * 1.6)) * (1 - S.snow * 0.7) * (1 - Math.min(1, S.wind / 12) * 0.6), 0.9);
    timers.bird -= dt;
    if (timers.bird <= 0) {
      timers.bird = rnd(1.5, 6) / Math.max(0.15, birdy);
      if (birdy > 0.08) BIRDS[Math.random() * BIRDS.length | 0](now + 0.05, rnd(-0.9, 0.9), 0.05 * Math.min(1, birdy) * rnd(0.4, 1));
    }
    /* crickets: night, warm enough, not pouring. Dolbear's law sets the tempo from the temperature. */
    const crick = pick('bugs', (1 - S.day) * Math.min(1, Math.max(0, (S.temp - 10) / 8)) * (1 - Math.min(1, S.rain * 2)) * (1 - S.snow), 0.9);
    if (crick > 0.05) {
      const tc = force.bugs ? Math.max(S.temp, 24) : S.temp, perMin = Math.max(30, 4 * (tc * 9 / 5 + 32 - 50) + 40);
      for (let v = 0; v < 3; v++) {
        if (v > 0 && crick < 0.3 * v) continue;
        timers.cricket[v] -= dt;
        if (timers.cricket[v] <= 0) { timers.cricket[v] = 60 / perMin * rnd(0.92, 1.08) * (v === 2 ? 1.7 : 1); cricket(now + 0.03, v); }
      }
    }
    /* frogs: warm nights from spring to autumn, loudest after rain, hushed in a downpour */
    const frogK = pick('frogs', (1 - S.day) * (S.month >= 4 && S.month <= 10 ? 1 : 0.15) * Math.min(1, Math.max(0, (S.temp - 12) / 6)) * (0.6 + Math.min(1, S.wetness) * 0.6) * (1 - Math.min(1, Math.max(0, S.rain - 0.4) * 2)) * (1 - S.snow), 0.9);
    if (frogK > 0.05) for (let v = 0; v < 4; v++) {
      if (v > 1 && frogK < 0.35 * (v - 1)) continue;
      timers.frog[v] -= dt;
      if (timers.frog[v] <= 0) { timers.frog[v] = rnd(1.6, 5.5) / Math.min(1.4, 0.4 + frogK); frog(now + 0.03, v, 0.05 * Math.min(1, frogK) * rnd(0.5, 1)); }
    }
    /* purring: in on the breath (softer, a little higher), out on the long exhale */
    const purr = Math.min(1, S.purr || 0);
    purrPh = (purrPh + dt / 2.7) % 1;
    const inh = purrPh < 0.4, br = purr * (inh ? 0.55 : 1) * Math.min(1, Math.sin(Math.PI * (inh ? purrPh / 0.4 : (purrPh - 0.4) / 0.6)) * 4);
    T(L.purrG.gain, br * 0.6, 0.05); T(L.buzzG.gain, br * 0.035, 0.05); T(L.purrO.frequency, inh ? 29 : 25, 0.1); T(L.buzzO.frequency, inh ? 58 : 50, 0.1);
    /* the wind chime: the host swings it and counts the clapper's hits; each one rings the glass */
    if (S.chimeHit > chimeSeen) { const n = Math.min(3, S.chimeHit - chimeSeen); for (let i = 0; i < n; i++) chime(now + 0.02 + i * rnd(0.05, 0.12), 0.05 * rnd(0.5, 1)); }
    chimeSeen = S.chimeHit || 0; lv.chime = Math.max(lv.chime * 0.97, S.chime || 0);
    lv.birds = birdy > 0.08 ? Math.min(1, birdy) : 0; lv.bugs = crick > 0.05 ? Math.min(1, crick) : 0; lv.frogs = frogK > 0.05 ? Math.min(1, frogK) : 0;
    /* cicadas: only on hot summer days */
    const cic = force.bugs === false ? 0 : S.day * (S.month >= 6 && S.month <= 9 ? 1 : 0) * Math.max(0, (S.temp - 25) / 5) * (1 - Math.min(1, S.rain * 3));
    timers.cicada -= dt;
    if (timers.cicada <= 0) { timers.cicada = rnd(5, 14); if (cic > 0.1) cicada(now + 0.1); }
  }

  return {
    unlock() {
      try { if (!ac) build(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
    },
    setOn(v) { on = v; if (ac) out.gain.setTargetAtTime(on ? vol : 0, ac.currentTime, 0.4); },
    setVolume(v) { vol = v; },
    get volume() { return vol; },
    force,
    get on() { return on; },
    get running() { return !!ac && ac.state === 'running'; },
    levels: lv,
    update, thunder,
    /* a frog in the pond you can see: the host calls this when one puffs its throat */
    croak(v, a = 0.05) { if (ac && on && ac.state === 'running' && force.frogs !== false) frog(ac.currentTime + 0.02, v & 3, a); },
    /* the radio: play() resumes the playlist (or jumps to index i), stop() pauses it */
    radio: {
      play(i) { if (!R.on || i != null) radioStart(i); },
      stop() { R.on = false; if (R.el) R.el.pause(); },
      next() { radioStart((R.song + 1) % SONGS.length); },
      get playing() { return R.on; },
      get title() { return R.on && R.song >= 0 ? SONGS[R.song].t : ''; },
      get bpm() { return R.on && R.song >= 0 ? SONGS[R.song].bpm : 0; },
      get pos() { return R.el ? R.el.currentTime : 0; }, set pos(t) { if (R.el) R.el.currentTime = t; },
      songs: SONGS.map(s => s.t),
    },
  };
};
})();
