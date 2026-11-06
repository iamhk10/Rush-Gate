/* Logic Gate Rush - extra games: Truth Table Fill, Circuit Debugger, Boss Rush */
(function () {
  'use strict';
  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, $ = App.$, save = App.save;
  const mk = id => { const s = document.createElement('section'); s.id = 'scr-' + id; s.className = 'screen hidden'; $('#app').appendChild(s); return s; };
  const best = k => (save.arcade[k] = save.arcade[k] || { best: 0, runs: 0 });
  const shell = (id, t, sub) => '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>' + t + '</b><small>' + sub + '</small></div><div class="pill" id="' + id + 'Best"></div></div><div id="' + id + 'Body" class="panel center intro"></div>';
  function endM(k, name, score, info, again) {
    const b = best(k), rec = score > b.best;
    if (rec) b.best = score; b.runs++; App.persist();
    FX.play(rec ? 'win' : 'bad');
    App.modal('<h3>' + name + '</h3><div class="stars" style="font-size:34px;color:var(--gold)">' + score + '</div><p>' + (rec ? '🏆 New best!' : 'Best: ' + b.best) + '</p><p>' + info + '</p>' +
      '<div class="mbtns two"><button class="btn primary" data-act="again">Play again</button><button class="btn ghost" data-act="home">Home</button></div>',
      a => { App.closeModal(); if (a === 'again') again(); else App.nav('home'); });
  }

  /* ---------- Truth Table Fill ---------- */
  (function () {
    const id = 'ttf', el = mk(id); el.innerHTML = shell(id, 'Truth Table Fill', 'Complete the gate table');
    const B = () => $('#ttfBody'); let run = null, tm = null;
    const stop = () => clearInterval(tm);
    function intro() {
      stop(); run = null; $('#ttfBest').textContent = 'Best ' + best(id).best;
      B().innerHTML = '<div style="font-size:44px">📋</div><h2>Truth Table Fill</h2><ul><li>A gate appears with an empty truth table.</li><li>Tap output cells to flip 0 / 1, then press Check.</li><li>10 gates, 60 seconds. Right table +30, each wrong cell −5.</li></ul><button class="btn primary" data-s="1">Start</button>';
    }
    function start() {
      run = { score: 0, n: 0, t: 60, over: false };
      tm = setInterval(() => { if (run.over) return; run.t--; const t = $('#ttfT'); if (t) t.textContent = run.t; if (run.t <= 0) end(); }, 1000);
      next();
    }
    function next() {
      const g = LG.GATE_ORDER[Math.floor(Math.random() * LG.GATE_ORDER.length)], G = LG.GATES[g];
      run.g = g; run.rows = g === 'NOT' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      run.ans = run.rows.map(r => G.fn(r[0], r[1] || 0) ? 1 : 0); run.guess = run.rows.map(() => 0);
      const two = g !== 'NOT';
      B().innerHTML = '<div class="hud"><div class="hs"><small>Gate</small><b>' + run.n + ' / 10</b></div><div class="hs"><small>Score</small><b>' + run.score + '</b></div><div class="hs"><small>Time</small><b id="ttfT">' + run.t + '</b></div></div>' +
        '<div class="stage" style="min-height:0;display:block">' + Draw.gateIcon(g) + '<b style="display:block;margin:6px 0">' + g + '</b>' +
        '<table style="margin:8px auto;border-collapse:separate;border-spacing:8px 6px"><tr><th>A</th>' + (two ? '<th>B</th>' : '') + '<th>Out</th></tr>' +
        run.rows.map((r, i) => '<tr><td>' + r[0] + '</td>' + (two ? '<td>' + r[1] + '</td>' : '') + '<td><button class="ans ttc" data-i="' + i + '" style="width:54px;height:44px;font-size:20px">?</button></td></tr>').join('') +
        '</table></div><button class="btn primary" data-chk="1" style="margin-top:10px;width:100%">Check</button>';
    }
    function check() {
      if (!run || run.over) return;
      const bad = run.guess.filter((v, i) => v !== run.ans[i]).length;
      run.score = Math.max(0, run.score + (bad ? -5 * bad : 30));
      FX.play(bad ? 'bad' : 'good'); FX.vibrate(bad ? 40 : 8);
      run.n++; if (run.n >= 10) end(); else next();
    }
    function end() {
      if (!run || run.over) return; run.over = true; stop();
      endM(id, 'Truth Table Fill', run.score, run.n + ' gates done', () => { intro(); start(); });
    }
    el.addEventListener('click', e => {
      if (e.target.closest('[data-s]')) { FX.unlock(); FX.play('tap'); start(); return; }
      if (e.target.closest('[data-chk]')) { check(); return; }
      const c = e.target.closest('.ttc');
      if (c && run && !run.over) { const i = +c.dataset.i; run.guess[i] ^= 1; c.textContent = run.guess[i]; FX.play('tap'); }
    });
    App.register(id, { enter: intro, leave: () => { stop(); if (run) run.over = true; } });
  })();

  /* ---------- Circuit Debugger (timed) and Boss Rush (5 puzzles, 1 life) ---------- */
  function quiz(id, title, sub, icon, rules, boss) {
    const el = mk(id); el.innerHTML = shell(id, title, sub);
    const B = () => $('#' + id + 'Body'); let run = null, tm = null;
    const stop = () => clearInterval(tm);
    function intro() {
      stop(); run = null; $('#' + id + 'Best').textContent = 'Best ' + best(id).best;
      B().innerHTML = '<div style="font-size:44px">' + icon + '</div><h2>' + title + '</h2><ul>' + rules.map(r => '<li>' + r + '</li>').join('') + '</ul><button class="btn primary" data-s="1">Start</button>';
    }
    function start() {
      run = { score: 0, round: 0, ok: 0, t: 60, lock: false, over: false };
      if (!boss) tm = setInterval(() => { if (run.over) return; run.t--; const t = $('#' + id + 'T'); if (t) t.textContent = run.t; if (run.t <= 0) end(); }, 1000);
      next();
    }
    function next() {
      const r = LG.qfRound(boss ? 6 + run.round : run.round, null, null);
      run.ans = r.answer; run.claim = boss ? null : (Math.random() < 0.5 ? r.answer : 1 - r.answer); run.lock = false;
      B().innerHTML = '<div class="hud"><div class="hs"><small>' + (boss ? 'Puzzle' : 'Score') + '</small><b>' + (boss ? (run.round + 1) + ' / 5' : run.score) + '</b></div>' +
        '<div class="hs"><small>' + (boss ? 'Life' : 'Time') + '</small><b id="' + id + 'T">' + (boss ? '❤️' : run.t) + '</b></div></div>' +
        '<div class="stage in" id="' + id + 'St">' + Draw.treeSvg(r.tree) + '</div>' +
        (boss ? '<div class="answers"><button class="ans" data-v="0">0</button><button class="ans" data-v="1">1</button></div>'
              : '<div class="answers"><button class="ans" data-v="ok">✅ Correct</button><button class="ans" data-v="bug">🐞 Bug!</button></div>');
      if (!boss) { const o = B().querySelector('#qfOut'); if (o) o.textContent = run.claim; }
    }
    function answer(v) {
      if (!run || run.over || run.lock) return; run.lock = true;
      const ok = boss ? (+v === run.ans) : ((v === 'ok') === (run.claim === run.ans));
      $('#' + id + 'St').classList.add(ok ? 'good' : 'bad'); FX.play(ok ? 'good' : 'bad'); FX.vibrate(ok ? 8 : 40);
      const o = B().querySelector('#qfOut'); if (o) o.textContent = run.ans;
      if (ok) { run.ok++; run.score += boss ? 20 : 10; }
      else if (boss) { setTimeout(end, 800); return; }
      else { run.score = Math.max(0, run.score - 5); run.t -= 3; }
      run.round++;
      if (boss && run.round >= 5) { run.score += 50; setTimeout(end, 800); return; }
      setTimeout(() => { if (run && !run.over) next(); }, ok ? 400 : 750);
    }
    function end() {
      if (!run || run.over) return; run.over = true; stop();
      endM(id, title, run.score, boss ? (run.ok === 5 ? '🏆 Boss defeated! 5 / 5' : 'Reached puzzle ' + (run.ok + 1) + ' / 5') : run.ok + ' correct', () => { intro(); start(); });
    }
    el.addEventListener('click', e => {
      if (e.target.closest('[data-s]')) { FX.unlock(); FX.play('tap'); start(); return; }
      const b = e.target.closest('[data-v]'); if (b) answer(b.dataset.v);
    });
    App.register(id, { enter: intro, leave: () => { stop(); if (run) run.over = true; } });
  }
  quiz('dbg', 'Circuit Debugger', 'Is the shown output right?', '🐞',
    ['A circuit appears with an output already filled in.', 'Trace the gates. Tap <b>Correct</b> if it is right, <b>Bug!</b> if not.', '60 seconds. Right +10. Wrong −5 points and −3 seconds.'], false);
  quiz('boss', 'Boss Rush', '5 hard circuits, 1 life', '👹',
    ['5 hard circuits in a row, with XOR and big trees.', 'Predict each output (0 or 1).', 'One wrong answer ends the run. Clear all 5 for a +50 bonus.'], true);
})();
