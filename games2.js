/* Logic Gate Rush v3 - more arcade games: Bug Hunt, Table Fill, Circuit ID */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, A = window.Arcade;
  const $ = App.$, save = App.save, esc = App.esc;

  /* shared bits ---------------------------------------------------------- */
  function intro(id, o) {
    $('#' + id + 'Best').textContent = 'Best ' + save.arcade[id].best;
    $('#' + id + 'Play').classList.add('hidden');
    const i = $('#' + id + 'Intro');
    i.classList.remove('hidden');
    i.innerHTML = '<div style="font-size:44px">' + o.icon + '</div><h2>' + o.title + '</h2><ul>' + o.rules.map(r => '<li>' + r + '</li>').join('') + '</ul>' +
      '<div class="best">Best score: ' + save.arcade[id].best + '</div><button class="btn primary" id="' + id + 'Start">Start (' + o.secs + 's)</button>';
  }
  function finish(id, name, fileId, run, again) {
    run.over = true;
    const q = save.arcade[id];
    const record = run.score > q.best;
    if (record) q.best = run.score;
    q.runs++;
    App.persist();
    const total = run.correct + run.wrong;
    A.endModal({
      id: fileId, name: name, score: run.score, best: q.best, record: record,
      stats: [['Solved', run.correct], ['Accuracy', total ? Math.round(run.correct / total * 100) + '%' : '–'], ['Best combo', run.bestCombo]],
      again: again
    });
  }
  const newRun = () => ({ score: 0, combo: 0, bestCombo: 0, correct: 0, wrong: 0, round: 0, lock: false, over: false });
  function onRight(id, run, clock, pts, bonus, max) {
    run.combo++; run.correct++; run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.score += pts;
    clock.add(bonus);
    const st = $('#' + id + 'Stage');
    st.classList.remove('in'); st.classList.add('good'); A.floatText(st, '+' + pts);
    FX.play('good'); FX.vibrate(8);
    A.bump($('#' + id + 'Score')); A.hud(id, run, clock.left(), max);
  }
  function onWrong(id, run, clock, penalty, max) {
    run.combo = 0; run.wrong++;
    clock.add(-penalty);
    const st = $('#' + id + 'Stage');
    st.classList.remove('in'); st.classList.add('bad'); A.floatText(st, '−' + penalty + 's', true);
    FX.play('bad'); FX.vibrate(40);
    A.hud(id, run, clock.left(), max);
    setTimeout(() => st.classList.remove('bad'), 380);
  }
  const mult = run => 1 + Math.floor(run.combo / 4);

  /* ======================= BUG HUNT ======================= */
  (function () {
    const id = 'bh', MAX = 75;
    const el = $('#scr-bh');
    el.innerHTML = A.timedShell(id, 'Bug Hunt', 'Find the wrong gate', '🐞');
    $('#bhCtl').innerHTML = '';
    let run = null, clock = null, rd = null, wrongTaps = 0;

    function showIntro() {
      intro(id, {
        icon: '🐞', title: 'Bug Hunt', secs: 60,
        rules: ['A circuit is wired up, but <b>one gate is wrong</b>.', 'Compare each gate with the <b>spec</b> (the correct expression) and tap the faulty one.',
          'Symbols: <b>·</b> AND, <b>+</b> OR, <b>⊕</b> XOR, <b>\'</b> NOT.',
          'Right: <b>+2 seconds</b>. Wrong tap: <b>−3 seconds</b> and your combo resets.']
      });
    }
    function start() {
      FX.unlock();
      run = newRun();
      $('#bhIntro').classList.add('hidden');
      $('#bhPlay').classList.remove('hidden');
      clock = A.makeClock(s => A.hud(id, run, s, MAX), end);
      clock.start(60, MAX);
      next();
    }
    function next() {
      rd = LG.bhRound(run.round);
      run.lock = false; wrongTaps = 0;
      const st = $('#bhStage');
      st.className = 'stage';
      st.innerHTML = '<div class="spec"><small>Spec: the circuit should compute</small><b>Y = ' + esc(rd.spec) + '</b></div>' +
        Draw.treeSvg(rd.tree, { named: true, tap: true, outText: rd.shown }) +
        '<div class="bh-note">Circuit shows <b>Y = ' + rd.shown + '</b>, but it should be <b>' + rd.expected + '</b> for these inputs. Tap the faulty gate.</div>';
      const svg = st.querySelector('.qsvg');
      if (svg) svg.classList.add('rev');
      void st.offsetWidth; st.classList.add('in');
    }
    function tap(g) {
      if (!run || run.over || run.lock) return;
      const gid = +g.dataset.gid;
      if (gid === rd.faultyId) {
        run.lock = true;
        g.classList.add('found');
        onRight(id, run, clock, Math.round(10 * mult(run) * (1 + rd.gates / 6)), 2, MAX);
        setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 650);
      } else {
        g.classList.add('wrong');
        wrongTaps++;
        onWrong(id, run, clock, 3, MAX);
      }
    }
    function end() {
      if (!run || run.over) return;
      finish(id, 'Bug Hunt', 'bug-hunt', run, () => { showIntro(); start(); });
    }
    el.addEventListener('click', e => {
      if (e.target.id === 'bhStart') { FX.play('tap'); start(); return; }
      const g = e.target.closest('.bgate');
      if (g) tap(g);
    });
    App.register(id, { enter: showIntro, leave: () => { if (clock) clock.stop(); if (run) run.over = true; } });
    window.__bh = { get rd() { return rd; }, get run() { return run; } };
  })();

  /* ======================= TABLE FILL ======================= */
  (function () {
    const id = 'tf', MAX = 90;
    const el = $('#scr-tf');
    el.innerHTML = A.timedShell(id, 'Table Fill', 'Complete the truth table', '🧾');
    $('#tfCtl').innerHTML = '';
    let run = null, clock = null, rd = null, cells = [];

    function showIntro() {
      intro(id, {
        icon: '🧾', title: 'Table Fill', secs: 75,
        rules: ['Read the circuit, then fill the <b>Y column</b> of its truth table.', 'Tap a cell to cycle <b>blank → 0 → 1</b>.',
          'Press <b>Check</b> when every row is filled. Correct: <b>+4 seconds</b>. Wrong: <b>−5 seconds</b> and the bad rows turn red.',
          'Tables get bigger and circuits get trickier.']
      });
    }
    function start() {
      FX.unlock();
      run = newRun();
      $('#tfIntro').classList.add('hidden');
      $('#tfPlay').classList.remove('hidden');
      clock = A.makeClock(s => A.hud(id, run, s, MAX), end);
      clock.start(75, MAX);
      next();
    }
    function tableHtml() {
      const k = rd.inputs.length, rows = 1 << k;
      let h = '<table class="tf"><tr>' + rd.inputs.map(n => '<th>' + n + '</th>').join('') + '<th class="y">Y</th></tr>';
      for (let i = 0; i < rows; i++) {
        h += '<tr>';
        for (let j = 0; j < k; j++) h += '<td>' + ((i >> (k - 1 - j)) & 1) + '</td>';
        h += '<td class="cell" data-r="' + i + '"><button class="tcell" data-r="' + i + '" aria-label="Row ' + (i + 1) + ' output">·</button></td></tr>';
      }
      return h + '</table>';
    }
    function next() {
      rd = LG.tfRound(run.round);
      cells = new Array(1 << rd.inputs.length).fill(-1);
      run.lock = false;
      const st = $('#tfStage');
      st.className = 'stage';
      st.innerHTML = Draw.treeSvg(rd.tree, { named: true, noVal: true }) + tableHtml() +
        '<button class="btn primary" id="tfCheck" disabled>Check</button>';
      void st.offsetWidth; st.classList.add('in');
    }
    function paint(btn, v) {
      btn.textContent = v < 0 ? '·' : v;
      btn.classList.toggle('on', v === 1);
      btn.classList.toggle('zero', v === 0);
      btn.classList.remove('bad');
    }
    function check() {
      if (!run || run.over || run.lock || cells.some(c => c < 0)) return;
      const wrong = [];
      rd.out.forEach((v, i) => { if (cells[i] !== v) wrong.push(i); });
      if (!wrong.length) {
        run.lock = true;
        $('#tfStage').querySelectorAll('.tcell').forEach(b => b.classList.add('ok'));
        onRight(id, run, clock, Math.round(10 * mult(run) * rd.out.length / 4), 4, MAX);
        setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 700);
      } else {
        wrong.forEach(i => { const b = $('#tfStage').querySelector('.tcell[data-r="' + i + '"]'); if (b) b.classList.add('bad'); });
        onWrong(id, run, clock, 5, MAX);
      }
    }
    function end() {
      if (!run || run.over) return;
      finish(id, 'Table Fill', 'table-fill', run, () => { showIntro(); start(); });
    }
    el.addEventListener('click', e => {
      if (e.target.id === 'tfStart') { FX.play('tap'); start(); return; }
      if (!run || run.over || run.lock) return;
      const c = e.target.closest('.tcell');
      if (c) {
        const r = +c.dataset.r;
        cells[r] = cells[r] === -1 ? 0 : cells[r] === 0 ? 1 : 0;
        paint(c, cells[r]);
        FX.play('flip'); FX.vibrate(6);
        const chk = $('#tfCheck');
        if (chk) chk.disabled = cells.some(v => v < 0);
        return;
      }
      if (e.target.id === 'tfCheck') check();
    });
    App.register(id, { enter: showIntro, leave: () => { if (clock) clock.stop(); if (run) run.over = true; } });
    window.__tf = { get rd() { return rd; }, get run() { return run; } };
  })();

  /* ======================= CIRCUIT ID ======================= */
  (function () {
    const id = 'ci', MAX = 75;
    const el = $('#scr-ci');
    el.innerHTML = A.timedShell(id, 'Circuit ID', 'Name that circuit', '🔎');
    let run = null, clock = null, rd = null;

    function showIntro() {
      intro(id, {
        icon: '🔎', title: 'Circuit ID', secs: 60,
        rules: ['A circuit is shown. Pick the <b>Boolean expression</b> it computes.', 'Read it from left to right: inner gates first.',
          'Right: <b>+2 seconds</b>. Wrong: <b>−4 seconds</b> and your combo resets.',
          'Symbols: <b>·</b> AND, <b>+</b> OR, <b>⊕</b> XOR, <b>\'</b> NOT.']
      });
    }
    function start() {
      FX.unlock();
      run = newRun();
      $('#ciIntro').classList.add('hidden');
      $('#ciPlay').classList.remove('hidden');
      clock = A.makeClock(s => A.hud(id, run, s, MAX), end);
      clock.start(60, MAX);
      next();
    }
    function next() {
      rd = LG.ciRound(run.round);
      run.lock = false;
      const st = $('#ciStage');
      st.className = 'stage';
      st.innerHTML = Draw.treeSvg(rd.tree, { named: true, noVal: true, outText: 'Y' });
      $('#ciCtl').innerHTML = '<div class="opts">' + rd.options.map((o, i) => '<button class="opt" data-o="' + i + '">Y = ' + esc(o) + '</button>').join('') + '</div>';
      void st.offsetWidth; st.classList.add('in');
    }
    function pick(btn) {
      if (!run || run.over || run.lock) return;
      const i = +btn.dataset.o;
      if (i === rd.answer) {
        run.lock = true;
        btn.classList.add('ok');
        onRight(id, run, clock, Math.round(10 * mult(run) * (1 + rd.gates / 5)), 2, MAX);
        setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 520);
      } else {
        btn.disabled = true; btn.classList.add('bad');
        onWrong(id, run, clock, 4, MAX);
      }
    }
    function end() {
      if (!run || run.over) return;
      finish(id, 'Circuit ID', 'circuit-id', run, () => { showIntro(); start(); });
    }
    el.addEventListener('click', e => {
      if (e.target.id === 'ciStart') { FX.play('tap'); start(); return; }
      const o = e.target.closest('.opt');
      if (o) pick(o);
    });
    App.register(id, { enter: showIntro, leave: () => { if (clock) clock.stop(); if (run) run.over = true; } });
    window.__ci = { get rd() { return rd; }, get run() { return run; } };
  })();
})();
