/* Logic Gate Rush - arcade games: Quick Fire, Bit Flip, Gate Match */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, Card = window.Card;
  const $ = App.$, save = App.save, esc = App.esc;

  /* ---------- shared timer ---------- */
  function makeClock(onTick, onEnd) {
    let left = 0, last = 0, h = 0, max = 0;
    function stop() { if (h) { clearInterval(h); h = 0; } }
    function tick() {
      const n = performance.now();
      left -= (n - last) / 1000; last = n;
      if (left <= 0) { left = 0; stop(); onTick(0); onEnd(); return; }
      onTick(left);
    }
    return {
      start: function (sec, mx) { left = sec; max = mx || sec; last = performance.now(); stop(); h = setInterval(tick, 100); onTick(left); },
      add: function (s) { left = Math.min(max, left + s); if (left < 0) left = 0; },
      stop: stop, left: () => left, running: () => !!h
    };
  }

  function bump(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function floatText(stage, txt, neg) {
    const f = document.createElement('div');
    f.className = 'float' + (neg ? ' neg' : '');
    f.textContent = txt;
    stage.appendChild(f);
    setTimeout(() => f.remove(), 850);
  }

  /* shared "game over" modal for timed games */
  function endModal(o) {
    FX.play(o.record ? 'win' : 'end');
    if (o.record) FX.confetti({ count: 110 });
    FX.vibrate(o.record ? [30, 40, 60] : 40);
    App.modal(
      '<h3>' + (o.record ? '🏆 New best!' : "Time's up!") + '</h3>' +
      '<div class="big">' + o.score + '</div><p>Best: ' + o.best + '</p>' +
      '<div class="statrow">' + o.stats.map(s => '<div><b>' + s[1] + '</b><small>' + s[0] + '</small></div>').join('') + '</div>' +
      '<div class="mbtns"><button class="btn primary" data-act="again">Play again</button>' +
      '<div class="mbtns two"><button class="btn" data-act="png">📸 Save PNG</button><button class="btn" data-act="share">Share</button></div>' +
      '<button class="btn ghost" data-act="home">Back</button></div>',
      act => {
        FX.play('tap');
        const card = () => Card.render({
          title: o.name, subtitle: 'Arcade result', big: o.score, bigLabel: 'Score', stats: o.stats.slice(0, 3)
        });
        const file = 'logic-gate-rush-' + o.id + '.png';
        const text = '⚡ Logic Gate Rush · ' + o.name + '\nScore: ' + o.score + ' (best ' + o.best + ')';
        if (act === 'png') { Card.preview(card(), file, text); return; }
        if (act === 'share') { Card.share(card(), file, text); return; }
        App.closeModal();
        if (act === 'again') o.again();
        else App.back();
      }, { noDismiss: true });
    setTimeout(() => App.checkAch(), 400);
  }

  function timedShell(id, title, sub, icon) {
    return '<div class="sh"><button class="icon" data-back aria-label="Back">←</button>' +
      '<div class="ttl"><b>' + title + '</b><small>' + sub + '</small></div><div class="pill" id="' + id + 'Best">Best 0</div></div>' +
      '<div id="' + id + 'Intro" class="panel center intro"></div>' +
      '<div id="' + id + 'Play" class="hidden">' +
      '<div class="hud"><div class="hs"><small>Score</small><b id="' + id + 'Score">0</b></div>' +
      '<div class="hs"><small>Combo</small><b id="' + id + 'Combo">×1</b></div>' +
      '<div class="hs"><small>Time</small><b id="' + id + 'Time">60</b></div></div>' +
      '<div class="tbar" id="' + id + 'TBar"><i id="' + id + 'Bar"></i></div>' +
      '<div class="stage" id="' + id + 'Stage"></div>' +
      '<div id="' + id + 'Ctl"></div></div>';
  }
  function hud(id, run, secs) {
    $('#' + id + 'Score').textContent = run.score;
    $('#' + id + 'Combo').textContent = '×' + (1 + Math.floor(run.combo / 4));
    if (secs != null) {
      $('#' + id + 'Time').textContent = Math.ceil(secs);
      $('#' + id + 'Bar').style.width = Math.min(100, secs / 60 * 100) + '%';
      $('#' + id + 'TBar').classList.toggle('low', secs <= 10);
    }
  }

  /* ======================= QUICK FIRE ======================= */
  (function () {
    const el = $('#scr-qf');
    el.innerHTML = timedShell('qf', 'Quick Fire', 'Predict the circuit output', '🎯') +
      '';
    $('#qfCtl').innerHTML = '<div class="answers"><button class="ans" id="qf0">0</button><button class="ans" id="qf1">1</button></div>';
    let run = null, clock = null;

    function intro() {
      $('#qfBest').textContent = 'Best ' + save.arcade.qf.best;
      $('#qfPlay').classList.add('hidden');
      const i = $('#qfIntro');
      i.classList.remove('hidden');
      i.innerHTML = '<div style="font-size:44px">🎯</div><h2>Quick Fire</h2>' +
        '<ul><li>A small logic circuit appears with fixed inputs.</li><li>Tap <b>0</b> or <b>1</b> for the output.</li>' +
        '<li>Correct: <b>+1 second</b> and points. Wrong: <b>−4 seconds</b> and your combo resets.</li>' +
        '<li>Every 4 correct answers in a row raises your multiplier.</li><li>Circuits get bigger as you go!</li></ul>' +
        '<div class="best">Best score: ' + save.arcade.qf.best + '</div>' +
        '<button class="btn primary" id="qfStart">Start (60s)</button>';
    }
    function start() {
      FX.unlock();
      run = { score: 0, combo: 0, bestCombo: 0, correct: 0, wrong: 0, round: 0, answer: null, last: null, lock: false, over: false };
      $('#qfIntro').classList.add('hidden');
      $('#qfPlay').classList.remove('hidden');
      clock = makeClock(s => hud('qf', run, s), end);
      clock.start(60, 75);
      next();
    }
    function next() {
      const r = LG.qfRound(run.round, null, run.last);
      run.answer = r.answer; run.last = r.answer; run.lock = false;
      const st = $('#qfStage');
      st.className = 'stage';
      st.innerHTML = Draw.treeSvg(r.tree);
      void st.offsetWidth; st.classList.add('in');
      $('#qf0').disabled = $('#qf1').disabled = false;
    }
    function answer(v) {
      if (!run || run.over || run.lock) return;
      run.lock = true;
      $('#qf0').disabled = $('#qf1').disabled = true;
      const st = $('#qfStage'), ok = v === run.answer;
      const svg = st.querySelector('.qsvg');
      if (svg) { svg.classList.add('rev'); const o = svg.querySelector('#qfOut'); if (o) o.textContent = run.answer; }
      st.classList.remove('in');
      if (ok) {
        run.combo++; run.correct++; run.bestCombo = Math.max(run.bestCombo, run.combo);
        const pts = 10 * (1 + Math.floor(run.combo / 4));
        run.score += pts;
        clock.add(1);
        st.classList.add('good'); floatText(st, '+' + pts);
        FX.play('good'); FX.vibrate(8);
      } else {
        run.combo = 0; run.wrong++;
        clock.add(-4);
        st.classList.add('bad'); floatText(st, '−4s', true);
        FX.play('bad'); FX.vibrate(40);
      }
      bump($('#qfScore'));
      hud('qf', run, clock.left());
      setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, ok ? 380 : 650);
    }
    function end() {
      if (!run || run.over) return;
      run.over = true;
      const q = save.arcade.qf;
      const record = run.score > q.best;
      if (record) q.best = run.score;
      q.runs++;
      App.persist();
      $('#qf0').disabled = $('#qf1').disabled = true;
      const total = run.correct + run.wrong;
      endModal({
        id: 'quick-fire', name: 'Quick Fire', score: run.score, best: q.best, record: record,
        stats: [['Correct', run.correct], ['Accuracy', total ? Math.round(run.correct / total * 100) + '%' : '–'], ['Best combo', run.bestCombo]],
        again: () => { intro(); start(); }
      });
    }
    el.addEventListener('click', e => {
      if (e.target.id === 'qfStart') { FX.play('tap'); start(); }
      else if (e.target.closest('#qf0')) answer(0);
      else if (e.target.closest('#qf1')) answer(1);
    });
    document.addEventListener('keydown', e => {
      if (App.current() !== 'qf' || App.modalOpen()) return;
      if (e.key === '0') answer(0); else if (e.key === '1') answer(1);
    });
    App.register('qf', {
      enter: intro,
      leave: () => { if (clock) clock.stop(); if (run) run.over = true; }
    });
    window.__qf = { get answer() { return run && run.answer; }, get run() { return run; } };
  })();

  /* ======================= BIT FLIP ======================= */
  (function () {
    const el = $('#scr-bf');
    el.innerHTML = timedShell('bf', 'Bit Flip', 'Binary ↔ decimal', '🧮');
    let run = null, clock = null, rd = null, bits = [];

    function intro() {
      $('#bfBest').textContent = 'Best ' + save.arcade.bf.best;
      $('#bfPlay').classList.add('hidden');
      const i = $('#bfIntro');
      i.classList.remove('hidden');
      i.innerHTML = '<div style="font-size:44px">🧮</div><h2>Bit Flip</h2>' +
        '<ul><li><b>Set it:</b> flip the bits until they add up to the target number.</li>' +
        '<li><b>Read it:</b> pick the decimal value of the binary number shown.</li>' +
        '<li>Correct: <b>+2 seconds</b>. Wrong answer: <b>−4 seconds</b>. Skip: <b>−3 seconds</b>.</li>' +
        '<li>More bits = more points. Keep the combo going!</li></ul>' +
        '<div class="best">Best score: ' + save.arcade.bf.best + '</div>' +
        '<button class="btn primary" id="bfStart">Start (60s)</button>';
    }
    function start() {
      FX.unlock();
      run = { score: 0, combo: 0, bestCombo: 0, correct: 0, wrong: 0, skipped: 0, round: 0, lock: false, over: false };
      $('#bfIntro').classList.add('hidden');
      $('#bfPlay').classList.remove('hidden');
      clock = makeClock(s => hud('bf', run, s), end);
      clock.start(60, 75);
      next();
    }
    const sumBits = () => bits.reduce((a, b, i) => a + (b ? (1 << (rd.bits - 1 - i)) : 0), 0);

    function bitsHtml(interactive, value) {
      let h = '<div class="bits">';
      for (let i = 0; i < rd.bits; i++) {
        const w = 1 << (rd.bits - 1 - i);
        const on = interactive ? bits[i] : ((value >> (rd.bits - 1 - i)) & 1);
        h += '<button class="bit ' + (on ? 'on' : '') + (interactive ? '' : ' static') + '" data-i="' + i + '"' + (interactive ? '' : ' tabindex="-1"') + '>' +
          '<small>' + w + '</small><b>' + (on ? 1 : 0) + '</b></button>';
      }
      return h + '</div>';
    }
    function next() {
      rd = LG.bfRound(run.round);
      bits = new Array(rd.bits).fill(0);
      run.lock = false;
      const st = $('#bfStage');
      st.className = 'stage';
      if (rd.type === 'set') {
        st.innerHTML = '<div class="bf-q">Set the bits to make</div><div class="bf-target">' + rd.target + '</div>' +
          bitsHtml(true) + '<div class="bf-sum">Current value: <b id="bfSum">0</b></div>';
        $('#bfCtl').innerHTML = '<div class="answers"><button class="btn" id="bfSkip" style="grid-column:1/-1">Skip (−3s)</button></div>';
      } else {
        st.innerHTML = '<div class="bf-q">What is this binary number in decimal?</div>' + bitsHtml(false, rd.target);
        $('#bfCtl').innerHTML = '<div class="choices">' + rd.choices.map(c => '<button class="ans" data-c="' + c + '">' + c + '</button>').join('') + '</div>';
      }
      void st.offsetWidth; st.classList.add('in');
    }
    function good() {
      run.lock = true;
      run.combo++; run.correct++; run.bestCombo = Math.max(run.bestCombo, run.combo);
      const pts = Math.round(10 * (1 + Math.floor(run.combo / 4)) * rd.bits / 4);
      run.score += pts;
      clock.add(2);
      const st = $('#bfStage');
      st.classList.remove('in'); st.classList.add('good'); floatText(st, '+' + pts);
      FX.play('good'); FX.vibrate(8);
      bump($('#bfScore')); hud('bf', run, clock.left());
      setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 420);
    }
    function bad(penalty, label) {
      run.combo = 0; run.wrong++;
      clock.add(-penalty);
      const st = $('#bfStage');
      st.classList.remove('in'); st.classList.add('bad'); floatText(st, label, true);
      FX.play('bad'); FX.vibrate(40);
      hud('bf', run, clock.left());
    }
    function end() {
      if (!run || run.over) return;
      run.over = true;
      const q = save.arcade.bf;
      const record = run.score > q.best;
      if (record) q.best = run.score;
      q.runs++;
      App.persist();
      const total = run.correct + run.wrong;
      endModal({
        id: 'bit-flip', name: 'Bit Flip', score: run.score, best: q.best, record: record,
        stats: [['Solved', run.correct], ['Accuracy', total ? Math.round(run.correct / total * 100) + '%' : '–'], ['Best combo', run.bestCombo]],
        again: () => { intro(); start(); }
      });
    }
    el.addEventListener('click', e => {
      if (e.target.id === 'bfStart') { FX.play('tap'); start(); return; }
      if (!run || run.over || run.lock) return;
      const bit = e.target.closest('.bit:not(.static)');
      if (bit && rd.type === 'set') {
        const i = +bit.dataset.i;
        bits[i] = bits[i] ? 0 : 1;
        bit.classList.toggle('on', !!bits[i]);
        bit.querySelector('b').textContent = bits[i];
        $('#bfSum').textContent = sumBits();
        FX.play('flip'); FX.vibrate(6);
        if (sumBits() === rd.target) good();
        return;
      }
      const ch = e.target.closest('[data-c]');
      if (ch && rd.type === 'read') {
        if (+ch.dataset.c === rd.target) good();
        else {
          ch.disabled = true;
          bad(4, '−4s');
          setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 600);
          run.lock = true;
        }
        return;
      }
      if (e.target.closest('#bfSkip')) {
        run.skipped++;
        run.lock = true;
        bad(3, '−3s');
        setTimeout(() => { if (run && !run.over) { run.round++; next(); } }, 500);
      }
    });
    App.register('bf', {
      enter: intro,
      leave: () => { if (clock) clock.stop(); if (run) run.over = true; }
    });
    window.__bf = { get round() { return rd; }, get run() { return run; } };
  })();

  /* ======================= GATE MATCH ======================= */
  (function () {
    const el = $('#scr-gm');
    let diff = null, deck = [], open = [], found = 0, moves = 0, secs = 0, tm = 0, lock = false, started = false;

    function stars(n) { return n ? '★'.repeat(n) + '☆'.repeat(3 - n) : '☆☆☆'; }

    function menu() {
      stopTimer();
      let h = '<div class="sh"><button class="icon" data-back aria-label="Back">←</button>' +
        '<div class="ttl"><b>Gate Match</b><small>Memory game for logic gates</small></div></div>' +
        '<div class="panel center intro"><div style="font-size:44px">🧠</div><h2>Gate Match</h2>' +
        '<ul><li>Flip two cards at a time and find the matching pairs.</li>' +
        '<li>Fewer moves means more stars.</li>' +
        '<li>A <b>truth string</b> is a gate\'s output for the inputs 00, 01, 10, 11 (in that order).</li></ul>' +
        '<div class="diffs">';
      ['easy', 'medium', 'hard'].forEach(d => {
        const c = LG.MATCH_CFG[d], b = save.match[d];
        h += '<button class="diff" data-d="' + d + '"><span><b>' + c.label + '</b><small>' + c.note + ' · ' + c.pairs + ' pairs' +
          (b ? ' · best ' + b.moves + ' moves' : '') + '</small></span><span class="st">' + stars(b ? b.stars : 0) + '</span></button>';
      });
      el.innerHTML = h + '</div></div>';
      diff = null;
    }

    function faceHtml(c) {
      if (c.kind === 'sym') return Draw.gateIcon(c.gate);
      if (c.kind === 'name') return '<div class="ft">' + esc(c.text) + '</div><div class="fs">gate name</div>';
      if (c.kind === 'tt') return '<div class="ft">' + esc(c.text) + '</div><div class="fs">truth string</div>';
      return '<div class="ft">' + esc(c.text) + '</div><div class="fs">expression</div>';
    }

    function stopTimer() { if (tm) { clearInterval(tm); tm = 0; } }
    function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

    function play(d) {
      FX.unlock();
      diff = d; deck = LG.matchDeck(d); open = []; found = 0; moves = 0; secs = 0; lock = false; started = false;
      stopTimer();
      const cfg = LG.MATCH_CFG[d];
      let h = '<div class="sh"><button class="icon" id="gmBack" aria-label="Back">←</button>' +
        '<div class="ttl"><b>Gate Match · ' + cfg.label + '</b><small>' + cfg.note + '</small></div>' +
        '<button class="btn sm" id="gmRestart">Restart</button></div>' +
        '<div class="hud"><div class="hs"><small>Moves</small><b id="gmMoves">0</b></div>' +
        '<div class="hs"><small>Pairs</small><b id="gmPairs">0/' + cfg.pairs + '</b></div>' +
        '<div class="hs"><small>Time</small><b id="gmTime">0:00</b></div></div><div class="mgrid" id="gmGrid">';
      deck.forEach((c, i) => {
        h += '<button class="fc" data-i="' + i + '" data-pid="' + c.pid + '" aria-label="Card ' + (i + 1) + '"><div class="in">' +
          '<div class="face back">⚡</div><div class="face front">' + faceHtml(c) + '</div></div></button>';
      });
      el.innerHTML = h + '</div>';
    }

    function finish() {
      stopTimer();
      const cfg = LG.MATCH_CFG[diff], st = LG.matchStars(moves, cfg.pairs);
      const prev = save.match[diff];
      let record = false;
      if (!prev || st > prev.stars || (st === prev.stars && moves < prev.moves)) {
        save.match[diff] = { stars: st, moves: moves, time: secs };
        record = true;
      }
      App.persist();
      const d = diff;
      FX.play('win'); FX.vibrate([30, 40, 60]); FX.confetti({ count: st === 3 ? 120 : 70 });
      setTimeout(() => {
        App.modal(
          '<div class="stars">' + [1, 2, 3].map(i => '<span class="' + (i <= st ? 'on' : '') + '">★</span>').join('') + '</div>' +
          '<h3>' + (record ? 'New best!' : 'All pairs found!') + '</h3>' +
          '<div class="statrow"><div><b>' + moves + '</b><small>Moves</small></div><div><b>' + fmt(secs) + '</b><small>Time</small></div><div><b>' + cfg.label + '</b><small>Level</small></div></div>' +
          '<div class="mbtns"><button class="btn primary" data-act="again">Play again</button>' +
          '<div class="mbtns two"><button class="btn" data-act="png">📸 Save PNG</button><button class="btn" data-act="share">Share</button></div>' +
          '<button class="btn ghost" data-act="menu">Choose difficulty</button></div>',
          act => {
            FX.play('tap');
            const card = () => Card.render({
              title: 'Gate Match · ' + cfg.label, subtitle: 'Memory game result', stars: st, big: moves, bigLabel: 'Moves',
              stats: [['Time', fmt(secs)], ['Pairs', cfg.pairs], ['Stars', st + ' / 3']]
            });
            const file = 'logic-gate-rush-gate-match-' + d + '.png';
            const text = '⚡ Logic Gate Rush · Gate Match (' + cfg.label + ')\n' + '⭐'.repeat(st) + ' · ' + moves + ' moves · ' + fmt(secs);
            if (act === 'png') { Card.preview(card(), file, text); return; }
            if (act === 'share') { Card.share(card(), file, text); return; }
            App.closeModal();
            if (act === 'again') play(d); else menu();
          }, { noDismiss: true });
        App.checkAch();
      }, 700);
    }

    function flip(btn) {
      if (lock || btn.classList.contains('open') || btn.classList.contains('done')) return;
      if (!started) {
        started = true;
        tm = setInterval(() => { secs++; const t = $('#gmTime'); if (t) t.textContent = fmt(secs); }, 1000);
      }
      btn.classList.add('open');
      open.push(btn);
      FX.play('flip');
      if (open.length < 2) return;
      moves++;
      $('#gmMoves').textContent = moves;
      const a = open[0], b = open[1];
      lock = true;
      if (a.dataset.pid === b.dataset.pid) {
        setTimeout(() => {
          [a, b].forEach(x => { x.classList.remove('open'); x.classList.add('done'); });
          found++;
          $('#gmPairs').textContent = found + '/' + LG.MATCH_CFG[diff].pairs;
          FX.play('good'); FX.vibrate(10);
          open = []; lock = false;
          if (found === LG.MATCH_CFG[diff].pairs) finish();
        }, 450);
      } else {
        setTimeout(() => {
          [a, b].forEach(x => x.classList.add('wrong'));
          FX.play('bad');
        }, 350);
        setTimeout(() => {
          [a, b].forEach(x => x.classList.remove('open', 'wrong'));
          open = []; lock = false;
        }, 900);
      }
    }

    el.addEventListener('click', e => {
      const d = e.target.closest('[data-d]');
      if (d) { FX.play('tap'); play(d.dataset.d); return; }
      if (e.target.closest('#gmBack')) { menu(); return; }
      if (e.target.closest('#gmRestart')) { play(diff); return; }
      const c = e.target.closest('.fc');
      if (c) flip(c);
    });
    App.register('gm', { enter: menu, leave: stopTimer });
  })();
})();
