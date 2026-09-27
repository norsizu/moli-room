/* TVAudio: recorded game music coming out of the TV (plain <audio> elements, so it also works from file://).
   Each frame the host says which track fits the screen ({ id, loop, paused, rate } or null) and how loud;
   a new id starts from the top, a one-shot (loop: false) plays once and then stays quiet until the id changes. */
(function () {
'use strict';
window.TVAudio = function (files) {
  const els = {};
  let cur = null, gain = 0, retry = 0;
  const get = id => {
    if (!els[id]) { const e = new Audio(files[id]); e.preload = 'auto'; if ('preservesPitch' in e) e.preservesPitch = true; els[id] = e; }
    return els[id];
  };
  function update(dt, want, vol) {
    const id = want && files[want.id] ? want.id : null;
    if (id !== cur) {
      if (cur) els[cur].pause();
      cur = id; gain = vol; retry = 0;
      if (cur) { const e = get(cur); try { e.currentTime = 0; } catch (err) {} }
    }
    if (!cur) return;
    const e = els[cur];
    e.loop = !!want.loop;
    const r = want.rate || 1; if (e.playbackRate !== r) e.playbackRate = r;
    gain += (vol - gain) * Math.min(1, dt * 5);
    e.volume = Math.max(0, Math.min(1, gain));
    const go = !want.paused && vol > 0.001 && !e.ended;
    if (go && e.paused) { if ((retry -= dt) <= 0) { retry = 0.5; const pr = e.play(); if (pr && pr.catch) pr.catch(() => {}); } }
    else if (!go && !e.paused) e.pause();
  }
  return {
    update,
    get playing() { return cur && !els[cur].paused ? cur : null; },
    preload() { for (const id in files) get(id); },
  };
};
})();
