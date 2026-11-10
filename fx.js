/* Logic Gate Rush - sound, haptics, confetti */
(function () {
  'use strict';

  let ctx = null, snd = true, vib = true;
  const reduce = () => document.documentElement.dataset.calm === '1' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(c, f, t, d, type, v) {
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v || 0.08, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  }
  const SFX = {
    tap:   c => tone(c, 660, 0, 0.06, 'triangle', 0.05),
    add:   c => { tone(c, 440, 0, 0.08, 'square', 0.04); tone(c, 660, 0.06, 0.08, 'square', 0.04); },
    wire:  c => tone(c, 880, 0, 0.07, 'sine', 0.06),
    del:   c => tone(c, 220, 0, 0.12, 'sawtooth', 0.04),
    flip:  c => tone(c, 520, 0, 0.05, 'triangle', 0.05),
    good:  c => { tone(c, 660, 0, 0.09, 'triangle', 0.07); tone(c, 990, 0.07, 0.12, 'triangle', 0.07); },
    bad:   c => { tone(c, 180, 0, 0.18, 'sawtooth', 0.07); tone(c, 140, 0.08, 0.2, 'sawtooth', 0.06); },
    win:   c => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, 0.22, 'triangle', 0.08)),
    tick:  c => tone(c, 1200, 0, 0.03, 'square', 0.03),
    award: c => [784, 988, 1319].forEach((f, i) => tone(c, f, i * 0.09, 0.2, 'sine', 0.08)),
    end:   c => [392, 330, 262].forEach((f, i) => tone(c, f, i * 0.14, 0.25, 'triangle', 0.07))
  };
  function play(name) {
    if (!snd) return;
    const c = ac();
    if (c && SFX[name]) { try { SFX[name](c); } catch (e) {} }
  }
  function vibrate(p) {
    if (vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
  }

  /* ---------- confetti ---------- */
  let cv = null, cx = null, parts = [], raf = 0, dpr = 1;
  function loop() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts = parts.filter(p => p.y < window.innerHeight + 30 && p.life < 160);
    parts.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cx.save();
      cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.globalAlpha = Math.max(0, 1 - p.life / 160);
      cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; cx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  function confetti(opts) {
    if (reduce()) return;
    cv = cv || document.getElementById('fxCanvas');
    if (!cv) return;
    cx = cx || cv.getContext('2d');
    if (!raf) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
    }
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--accent', '--accent2', '--gold', '--text'].map(n => cs.getPropertyValue(n).trim() || '#fff');
    const n = (opts && opts.count) || 90;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 90, y: window.innerHeight * 0.38,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, g: 0.36,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: cols[i % cols.length], life: 0
      });
    }
    if (!raf) loop();
  }

  window.FX = {
    play: play, vibrate: vibrate, confetti: confetti, reduced: reduce,
    setSound: v => { snd = !!v; },
    setVibe: v => { vib = !!v; },
    unlock: ac
  };
})();
