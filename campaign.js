/* Logic Gate Rush - campaign map, daily puzzle, free lab, circuit board */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, Card = window.Card;
  const $ = App.$, save = App.save, esc = App.esc;

  const MAXG = 14, H = Draw.H;
  const X_MIN = 96, X_MAX = 210, Y_MIN = 4, Y_MAX = H - 62;
  const SLOTS = [];
  for (let r = 0; r < 7; r++) [96, 208].forEach(x => SLOTS.push({ x: x, y: 10 + r * 76 }));

  let level = null, board = null, inputsVal = {};
  let selected = null, pending = null, undoStack = [], redoStack = [], hintIdx = 0, drag = null;
  let lastOk = false, lastUsed = Infinity, newGate = null, autoT = 0;

  /* ---------- records ---------- */
  const getBest = lv => (lv.id === 'daily' ? save.daily[lv.date] : save.levels[lv.id]);
  function setBest(lv, rec) {
    if (lv.id === 'daily') save.daily[lv.date] = rec; else save.levels[lv.id] = rec;
    App.persist();
  }
  const unlocked = id => id === 1 || !!save.levels[id - 1];
  function nextLevel() {
    let n = 1;
    while (n < LG.LEVELS.length && save.levels[n]) n++;
    return LG.LEVELS[n - 1];
  }
  function dailyStreak() {
    const d = new Date();
    let k = LG.dateKey(d);
    if (!save.daily[k]) { d.setDate(d.getDate() - 1); k = LG.dateKey(d); }
    let n = 0;
    while (save.daily[k]) { n++; d.setDate(d.getDate() - 1); k = LG.dateKey(d); }
    return n;
  }

  /* ================= CAMPAIGN MAP ================= */
  function renderLevels() {
    const t = App.totals();
    const nxt = nextLevel();
    let h = '<div class="sh"><button class="icon" data-back aria-label="Back">←</button>' +
      '<div class="ttl"><b>Campaign</b><small>' + t.cleared + ' / ' + LG.LEVELS.length + ' cleared · ' + t.stars + ' ★</small></div></div>';
    LG.WORLDS.forEach(w => {
      let got = 0, total = (w.to - w.from + 1) * 3;
      let tiles = '';
      for (let id = w.from; id <= w.to; id++) {
        const lv = LG.LEVELS[id - 1], rec = save.levels[id], open = unlocked(id);
        if (rec) got += rec.stars || 0;
        const label = !open ? '🔒' : rec ? (rec.stars ? '★'.repeat(rec.stars) : '–') : '·';
        tiles += '<button class="tile' + (lv.boss ? ' boss' : '') + (open && !rec && id === nxt.id ? ' next' : '') +
          '" data-lv="' + id + '"' + (open ? '' : ' disabled') + ' aria-label="Level ' + id + '">' + id + '<small>' + label + '</small></button>';
      }
      h += '<div class="world"><div class="wh"><h2><em>WORLD ' + w.n + '</em>' + esc(w.name) + '</h2><span>' + got + ' / ' + total + ' ★</span></div>' +
        '<p class="wb">' + esc(w.blurb) + '</p><div class="grid">' + tiles + '</div></div>';
    });
    $('#scr-levels').innerHTML = h;
  }
  $('#scr-levels').addEventListener('click', e => {
    const b = e.target.closest('[data-lv]');
    if (b) { FX.play('tap'); open(LG.LEVELS[+b.dataset.lv - 1]); }
  });

  /* ================= OPEN A LEVEL ================= */
  function open(lv, opts) {
    opts = opts || {};
    level = lv;
    const sv = lv.id === 'rand' ? null : save.boards[lv.key];
    board = sv && Array.isArray(sv.gates) && sv.conn
      ? { gates: sv.gates.filter(g => LG.GATES[g.type] && lv.gates.indexOf(g.type) !== -1), conn: Object.assign({}, sv.conn), nextId: sv.nextId || 1 }
      : { gates: [], conn: {}, nextId: 1 };
    // remove connections that point to missing things
    Object.keys(board.conn).forEach(k => {
      const s = board.conn[k];
      const dstOk = k.indexOf('out:') === 0 ? lv.outputs.indexOf(k.slice(4)) !== -1 : board.gates.some(g => k.indexOf('g:' + g.id + ':') === 0);
      const srcOk = s.indexOf('in:') === 0 ? lv.inputs.indexOf(s.slice(3)) !== -1 : board.gates.some(g => 'g:' + g.id === s);
      if (!dstOk || !srcOk) delete board.conn[k];
    });
    inputsVal = {};
    lv.inputs.forEach(n => { inputsVal[n] = 0; });
    selected = null; pending = null; undoStack = []; redoStack = []; hintIdx = 0; drag = null; newGate = null;
    stopAuto(); resetView();
    const res = LG.checkBoard(board, lv);
    lastOk = res.ok;
    lastUsed = res.ok ? LG.usedGates(board, lv).length : Infinity;
    if (opts.nav) App.nav('game'); else App.show('game', null, { replace: !!opts.replace });
  }
  const openDaily = () => open(LG.dailyLevel(LG.dateKey()), { nav: true });
  const openLab = n => open(LG.sandboxLevel(n || 3), { nav: true });
  function openRandom(diff, opts) {
    diff = LG.ENDLESS[diff] ? diff : (LG.ENDLESS[save.flags.endlessDiff] ? save.flags.endlessDiff : 'easy');
    save.flags.endlessDiff = diff; App.persist();
    const lv = LG.randomLevel(Math.floor(Math.random() * 1e9) + 1, diff);
    open(lv, opts || { nav: true });
  }

  /* ================= RENDER BOARD ================= */
  function setupGameHeader() {
    const lv = level;
    const isR = lv.id === 'rand';
    $('#gTitle').textContent = lv.sandbox ? 'Free Lab' : lv.id === 'daily' ? 'Daily Puzzle' : isR ? lv.title : 'Level ' + lv.id + ' · ' + lv.title;
    $('#gSub').textContent = lv.sandbox ? 'Sandbox · no targets'
      : lv.id === 'daily' ? lv.date
      : isR ? 'Random puzzle · Par ' + lv.par + ' gates'
      : 'World ' + lv.world + ' · Par ' + lv.par + ' gate' + (lv.par === 1 ? '' : 's');
    $('#gStory').textContent = lv.story;
    $('#palette').innerHTML = lv.gates.map(t =>
      '<button class="gbtn" data-gate="' + t + '">' + Draw.gateIcon(t) + '<span>' + t + '</span><small>IC ' + LG.GATES[t].ic + '</small></button>').join('');
    const lab = $('#gLab');
    if (lv.sandbox) {
      lab.classList.remove('hidden');
      lab.innerHTML = 'Inputs: ' + [2, 3, 4].map(n => '<button data-n="' + n + '" class="' + (lv.inputs.length === n ? 'on' : '') + '">' + n + '</button>').join('');
    } else if (isR) {
      lab.classList.remove('hidden');
      lab.innerHTML = 'Level: ' + ['easy', 'medium', 'hard'].map(d => '<button data-d="' + d + '" class="' + (lv.diff === d ? 'on' : '') + '">' + LG.ENDLESS[d].label + '</button>').join('') +
        '<button data-new="1" class="newbtn">🎲 New</button>';
    } else lab.classList.add('hidden');
    $('#btnHint').classList.toggle('hidden', !!lv.sandbox);
    renderHints();
    $('#boardwrap').classList.remove('solved');
  }
  $('#gLab').addEventListener('click', e => {
    const b = e.target.closest('[data-n]');
    if (b && +b.dataset.n !== level.inputs.length) open(LG.sandboxLevel(+b.dataset.n), { replace: true });
    const d = e.target.closest('[data-d]');
    if (d && level.id === 'rand') { FX.play('tap'); openRandom(d.dataset.d, { replace: true }); }
    if (e.target.closest('[data-new]') && level.id === 'rand') { FX.play('tap'); openRandom(level.diff, { replace: true }); }
  });

  function wiresHtml() {
    const g = Draw.geom(level, board);
    let h = '', hl = false;
    Object.keys(board.conn).forEach(dst => {
      const src = board.conn[dst], a = g.srcPos(src), b = g.dstPos(dst);
      if (!a || !b) return;
      const v = LG.evalSrc(board, src, inputsVal, new Set());
      const touch = selected !== null && (src === 'g:' + selected || dst.indexOf('g:' + selected + ':') === 0);
      if (touch) hl = true;
      h += Draw.wire(a, b, (v === 1 ? 'w1' : v === 0 ? 'w0' : 'wn') + (touch ? ' hl' : ''));
    });
    $('#boardwrap').classList.toggle('hasSel', hl);
    return h;
  }

  function nodesHtml() {
    const g = Draw.geom(level, board);
    let h = '';
    level.inputs.forEach((name, i) => {
      const y = g.iy[i], on = inputsVal[name] === 1;
      h += '<g data-k="toggle" data-name="' + name + '" class="tog ' + (on ? 'on' : '') + '">' +
        '<rect class="tbg" x="6" y="' + (y - 15) + '" width="46" height="30" rx="15"/>' +
        '<circle class="knob" cx="' + (on ? 37 : 21) + '" cy="' + y + '" r="11"/>' +
        '<text class="tval" x="' + (on ? 21 : 37) + '" y="' + (y + 4) + '">' + (on ? 1 : 0) + '</text></g>' +
        '<text class="iname" x="29" y="' + (y - 22) + '">' + esc(name) + '</text>' +
        '<path class="gline" d="M52 ' + y + 'H' + Draw.IN_X + '"/>' +
        '<g data-k="sport" data-src="in:' + name + '" class="port-g ' + (pending === 'in:' + name ? 'pend' : '') + '">' +
        '<circle class="hit" cx="' + Draw.IN_X + '" cy="' + y + '" r="15"/>' +
        '<circle class="port src" cx="' + Draw.IN_X + '" cy="' + y + '" r="7"/></g>';
    });

    level.outputs.forEach((name, i) => {
      const y = g.oy[i], v = LG.evalOut(board, inputsVal, name), dst = 'out:' + name;
      h += '<g data-k="tport" data-dst="' + dst + '" class="port-g">' +
        '<circle class="hit" cx="' + Draw.OUT_X + '" cy="' + y + '" r="15"/>' +
        '<circle class="port dst ' + (board.conn[dst] ? 'used' : '') + (pending ? ' want' : '') + '" cx="' + Draw.OUT_X + '" cy="' + y + '" r="7"/></g>' +
        '<path class="gline" d="M' + (Draw.OUT_X + 7) + ' ' + y + 'H' + (Draw.LAMP_X - 19) + '"/>' +
        '<circle class="lamp ' + (v === 1 ? 'on' : '') + '" cx="' + Draw.LAMP_X + '" cy="' + y + '" r="19"/>' +
        '<text class="lampv" x="' + Draw.LAMP_X + '" y="' + (y + 5) + '">' + (v === null ? '?' : v) + '</text>' +
        '<text class="iname" x="' + Draw.LAMP_X + '" y="' + (y - 28) + '">' + esc(name) + '</text>';
    });

    board.gates.forEach(gt => {
      h += gateHtml(gt);
    });
    return h;
  }

  function gateHtml(gt) {
    const ys = Draw.inPorts(gt.type);
    let badge = '';
    if (save.settings.vals) {
      const bv = LG.evalSrc(board, 'g:' + gt.id, inputsVal, new Set());
      badge = '<g class="vbadge ' + (bv === 1 ? 'v1' : '') + '" transform="translate(80,6)"><rect x="-9" y="-8" width="18" height="16" rx="8"/><text y="4">' + (bv === null ? '?' : bv) + '</text></g>';
    }
    return '<g class="gate' + (selected === gt.id ? ' sel' : '') + (newGate === gt.id ? ' gpop' : '') +
      '" transform="translate(' + gt.x + ',' + gt.y + ')" data-k="gate" data-id="' + gt.id + '">' +
      '<rect class="ghit" x="-6" y="-6" width="92" height="68" rx="8"/>' +
      '<g class="gbody">' + Draw.bodyMarkup(gt.type) + '</g>' +
      ys.map((py, i) => {
        const dst = 'g:' + gt.id + ':' + i;
        return '<g data-k="tport" data-dst="' + dst + '" class="port-g">' +
          '<circle class="hit" cx="0" cy="' + py + '" r="13"/>' +
          '<circle class="port dst ' + (board.conn[dst] ? 'used' : '') + (pending ? ' want' : '') + '" cx="0" cy="' + py + '" r="6.5"/></g>';
      }).join('') +
      '<g data-k="sport" data-src="g:' + gt.id + '" class="port-g ' + (pending === 'g:' + gt.id ? 'pend' : '') + '">' +
      '<circle class="hit" cx="80" cy="28" r="15"/><circle class="port src" cx="80" cy="28" r="7"/></g>' + badge + '</g>';
  }

  function render() {
    $('#wires').innerHTML = wiresHtml();
    $('#nodes').innerHTML = nodesHtml();
    newGate = null;
    updateInfo();
  }

  function exprLines() {
    return level.outputs.filter(n => board.conn['out:' + n])
      .map(n => n + ' = ' + LG.stripOuter(LG.exprOf(board, board.conn['out:' + n])));
  }

  function ttHtml(res) {
    const ins = level.inputs, outs = level.outputs, sb = !!level.sandbox;
    let h = '<table><tr class="grp"><th colspan="' + ins.length + '">Inputs</th>' +
      (sb ? '' : '<th colspan="' + outs.length + '">Target</th>') +
      '<th colspan="' + outs.length + '">Yours</th>' + (sb ? '' : '<th></th>') + '</tr><tr>' +
      ins.map(n => '<th>' + esc(n) + '</th>').join('') +
      (sb ? '' : outs.map(n => '<th>' + esc(n) + '</th>').join('')) +
      outs.map(n => '<th>' + esc(n) + '</th>').join('') + (sb ? '' : '<th></th>') + '</tr>';
    res.rows.forEach(r => {
      const cur = ins.every(n => r.vals[n] === inputsVal[n]);
      let rowOk = true, anyNull = false;
      outs.forEach(n => {
        if (r.got[n] === null) anyNull = true;
        else if (r.expected && r.got[n] !== r.expected[n]) rowOk = false;
      });
      h += '<tr class="' + (cur ? 'cur' : '') + '">' + ins.map(n => '<td>' + r.vals[n] + '</td>').join('') +
        (sb ? '' : outs.map(n => '<td class="t">' + r.expected[n] + '</td>').join('')) +
        outs.map(n => {
          const g = r.got[n];
          const c = !sb && g !== null ? (g === r.expected[n] ? 'ok' : 'bad') : '';
          return '<td class="' + c + '">' + (g === null ? '–' : g) + '</td>';
        }).join('') +
        (sb ? '' : '<td>' + (anyNull ? '' : rowOk ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>') + '</td>') + '</tr>';
    });
    return h + '</table>';
  }

  function updateInfo() {
    const res = LG.checkBoard(board, level);
    const used = LG.usedGates(board, level).length;
    const pill = $('#gPill');
    if (level.sandbox) {
      pill.textContent = used + ' gate' + (used === 1 ? '' : 's');
      pill.className = 'pill';
    } else {
      pill.textContent = used + ' / ' + level.par;
      pill.className = 'pill' + (res.ok ? (used <= level.par ? ' ok' : ' over') : '');
    }
    $('#boardwrap').classList.toggle('solved', res.ok);
    const lines = exprLines();
    $('#gExpr').innerHTML = lines.length ? 'Your circuit: <b>' + lines.map(esc).join(' &nbsp;|&nbsp; ') + '</b>'
      : 'Connect a wire to ' + (level.outputs.length > 1 ? 'the outputs' : esc(level.outputs[0])) + ' to see its expression.';
    $('#tt').innerHTML = ttHtml(res);
    $('#btnUndo').disabled = undoStack.length === 0;
    $('#btnRedo').disabled = redoStack.length === 0;
    $('#qUndo').disabled = undoStack.length === 0;
    $('#qRedo').disabled = redoStack.length === 0;
    $('#tt').classList.toggle('wide', level.inputs.length + level.outputs.length * (level.sandbox ? 1 : 2) > 8);
    $('#btnDel').disabled = selected === null;
    $('#hintLbl').textContent = 'Hint ' + hintIdx + '/' + (level.hints ? level.hints.length : 0);
  }

  function renderHints() {
    const box = $('#hintBox');
    if (!hintIdx || level.sandbox) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');
    let h = level.hints.slice(0, hintIdx).map((t, i) => i === 2
      ? '<p><b>3.</b> Wiring recipe (<i>gN</i> = output of line N):</p><pre>' + esc(t) + '</pre>'
      : '<p><b>' + (i + 1) + '.</b> ' + esc(t) + '</p>').join('');
    if (hintIdx >= 3 && typeof level.id === 'number' && !getBest(level)) {
      h += '<button class="btn" data-act="skip">Skip this level (no stars)</button>';
    } else if (hintIdx >= 3 && level.id === 'rand') {
      h += '<button class="btn" data-act="newrand">Try another puzzle</button>';
    }
    box.innerHTML = h;
  }
  $('#hintBox').addEventListener('click', e => {
    if (e.target.closest('[data-act="newrand"]')) { openRandom(level.diff, { replace: true }); return; }
    if (e.target.closest('[data-act="skip"]')) {
      save.levels[level.id] = { stars: 0, gates: 0, skipped: 1 };
      App.persist();
      App.toast('Level skipped. You can come back for stars anytime.');
      App.back();
    }
  });

  /* ================= STATE CHANGES ================= */
  const snap = () => JSON.stringify({ g: board.gates, c: board.conn, n: board.nextId });
  function restore(s) { const o = JSON.parse(s); board = { gates: o.g, conn: o.c, nextId: o.n }; }
  function pushUndo(s) { undoStack.push(s || snap()); if (undoStack.length > 60) undoStack.shift(); redoStack = []; }
  function persistBoard() {
    if (level.id === 'rand') return;
    save.boards[level.key] = { gates: board.gates, conn: board.conn, nextId: board.nextId };
    App.persist();
  }

  function afterChange(quiet) {
    persistBoard();
    render();
    if (level.sandbox) {
      if (board.gates.length && !save.flags.lab) { save.flags.lab = 1; App.persist(); App.checkAch(); }
      return;
    }
    const res = LG.checkBoard(board, level);
    const used = LG.usedGates(board, level).length;
    const celebrate = !quiet && res.ok && (!lastOk || used < lastUsed);
    lastUsed = res.ok ? (lastOk ? Math.min(lastUsed, used) : used) : Infinity;
    lastOk = res.ok;
    if (celebrate) setTimeout(() => { if (level && lastOk && App.current() === 'game') showWin(used); }, 500);
  }

  function freeSpot() {
    const free = SLOTS.filter(s => !board.gates.some(g => Math.abs(g.x - s.x) < 70 && Math.abs(g.y - s.y) < 64));
    if (!free.length) return { x: 150, y: 480 };
    if (view.z <= 1.05) return free[0];
    // zoomed in: drop the new gate in the free slot closest to what you are looking at
    const cx = view.x + VW / view.z / 2 - 40, cy = view.y + VH / view.z / 2 - 28;
    free.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    return free[0];
  }
  function addGate(type) {
    if (board.gates.length >= MAXG) { App.toast('The board is full. Remove a gate first.'); return; }
    pushUndo();
    const pos = freeSpot(), id = board.nextId++;
    board.gates.push({ id: id, type: type, x: pos.x, y: pos.y });
    selected = id; pending = null; newGate = id;
    FX.play('add');
    afterChange();
  }
  function removeGate(id) {
    board.gates = board.gates.filter(g => g.id !== id);
    Object.keys(board.conn).forEach(k => {
      if (k.indexOf('g:' + id + ':') === 0 || board.conn[k] === 'g:' + id) delete board.conn[k];
    });
  }

  /* ================= WIN ================= */
  function pngCard(used, solvedStars) {
    const res = LG.checkBoard(board, level);
    const ok = res.ok;
    const stars = level.sandbox ? null : (ok ? (solvedStars != null ? solvedStars : LG.starsFor(used, level.par)) : 0);
    const stats = level.sandbox
      ? [['Gates', used], ['Inputs', level.inputs.length]]
      : [['Gates', used], ['Par', level.par], ['Stars', stars + ' / 3']];
    const title = level.sandbox ? 'Free Lab' : level.id === 'daily' ? 'Daily Puzzle' : level.id === 'rand' ? level.title : 'Level ' + level.id + ' · ' + level.title;
    const sub = level.sandbox ? 'My custom circuit' : level.id === 'daily' ? level.date : (ok ? 'Solved!' : 'Work in progress');
    return Card.render({
      title: title, subtitle: sub, stars: stars, solved: ok, stats: stats,
      level: level, board: board, vals: inputsVal, expr: exprLines().join('\n')
    });
  }
  function pngName() {
    return 'logic-gate-rush-' + (level.sandbox ? 'lab' : level.id === 'daily' ? 'daily-' + level.date : level.id === 'rand' ? 'endless-' + level.diff : 'level-' + level.id) + '.png';
  }
  function shareText(stars, used) {
    const st = '⭐'.repeat(stars);
    const head = level.id === 'daily' ? 'Daily ' + level.date : level.id === 'rand' ? level.title : 'Level ' + level.id + ' · ' + level.title;
    return '⚡ Logic Gate Rush · ' + head + '\n' + st + ' · ' + used + ' gates (par ' + level.par + ')';
  }

  function showWin(used) {
    const stars = LG.starsFor(used, level.par);
    const isR = level.id === 'rand';
    if (isR) {
      if (!level.counted) { level.counted = true; save.endless[level.diff] = (save.endless[level.diff] || 0) + 1; }
    } else {
      const prev = getBest(level);
      if (!prev || stars > (prev.stars || 0) || (stars === prev.stars && used < prev.gates)) setBest(level, { stars: stars, gates: used });
    }
    save.stats.wins++;
    if (level.id === 'daily') {
      const s = dailyStreak();
      if (s > save.stats.maxStreak) save.stats.maxStreak = s;
    }
    App.persist();
    const hasNext = isR || (typeof level.id === 'number' && level.id < LG.LEVELS.length);
    const worldDone = typeof level.id === 'number' && level.boss;
    FX.play('win'); FX.vibrate([30, 40, 60]); FX.confetti({ count: stars === 3 ? 140 : 80 });
    const lvRef = level;
    App.modal(
      '<div class="stars">' + [1, 2, 3].map(i => '<span class="' + (i <= stars ? 'on' : '') + '">★</span>').join('') + '</div>' +
      '<h3>' + (stars === 3 ? 'Perfect!' : worldDone ? 'World cleared!' : isR ? 'Puzzle solved!' : 'Level clear!') + '</h3>' +
      '<p>' + used + ' gate' + (used === 1 ? '' : 's') + ' · par ' + level.par + '</p>' +
      (stars < 3 ? '<p>Use ' + level.par + ' or fewer gates for 3 stars.</p>' : '') +
      '<div class="mbtns">' +
      (hasNext ? '<button class="btn primary" data-act="next">' + (isR ? 'Next puzzle →' : 'Next level →') + '</button>' : '') +
      '<div class="mbtns two"><button class="btn" data-act="png">📸 Save PNG</button><button class="btn" data-act="share">Share</button></div>' +
      '<div class="mbtns two"><button class="btn ghost" data-act="retry">' + (stars < 3 ? 'Improve' : 'View board') + '</button>' +
      '<button class="btn ghost" data-act="map">' + (isR ? 'Back' : 'Level map') + '</button></div></div>',
      act => {
        FX.play('tap');
        if (act === 'png') { Card.preview(pngCard(used, stars), pngName(), shareText(stars, used)); return; }
        if (act === 'share') { Card.share(pngCard(used, stars), pngName(), shareText(stars, used)); return; }
        App.closeModal();
        if (act === 'next') { if (isR) openRandom(lvRef.diff, { replace: true }); else open(LG.LEVELS[lvRef.id], { replace: true }); }
        else if (act === 'map') { if (lvRef.id === 'daily') App.nav('home'); else App.back(); }
      });
    setTimeout(() => App.checkAch(), 300);
  }

  /* ================= VIEW: zoom and pan ================= */
  const svg = $('#board');
  const VW = Draw.W, VH = Draw.H, ZMIN = 1, ZMAX = 3.5;
  let view = { z: 1, x: 0, y: 0 }, tw = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function applyView() {
    view.z = clamp(view.z, ZMIN, ZMAX);
    view.x = clamp(view.x, 0, VW - VW / view.z);
    view.y = clamp(view.y, 0, VH - VH / view.z);
    svg.setAttribute('viewBox', view.x.toFixed(2) + ' ' + view.y.toFixed(2) + ' ' + (VW / view.z).toFixed(2) + ' ' + (VH / view.z).toFixed(2));
    $('#zFit').textContent = Math.round(view.z * 100) + '%';
    $('#boardwrap').classList.toggle('zoomed', view.z > 1.01);
    $('#zIn').disabled = view.z >= ZMAX - 0.01;
    $('#zOut').disabled = view.z <= ZMIN + 0.01;
  }
  function resetView() { cancelAnimationFrame(tw); view = { z: 1, x: 0, y: 0 }; }
  function tweenTo(z, x, y) {
    cancelAnimationFrame(tw);
    z = clamp(z, ZMIN, ZMAX);
    x = clamp(x, 0, VW - VW / z); y = clamp(y, 0, VH - VH / z);
    const f = { z: view.z, x: view.x, y: view.y }, t0 = performance.now();
    const calm = document.documentElement.dataset.calm === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (calm) { view = { z: z, x: x, y: y }; applyView(); return; }
    (function step(now) {
      const p = Math.min(1, (now - t0) / 200), e = 1 - Math.pow(1 - p, 3);
      view = { z: f.z + (z - f.z) * e, x: f.x + (x - f.x) * e, y: f.y + (y - f.y) * e };
      applyView();
      if (p < 1) tw = requestAnimationFrame(step);
    })(t0);
  }
  function zoomBy(factor) {
    const nz = clamp(view.z * factor, ZMIN, ZMAX);
    const cx = view.x + VW / view.z / 2, cy = view.y + VH / view.z / 2;
    tweenTo(nz, cx - VW / nz / 2, cy - VH / nz / 2);
  }
  // instant zoom that keeps the board point (cx, cy) under the cursor / fingers
  function zoomAt(nz, cx, cy) {
    nz = clamp(nz, ZMIN, ZMAX);
    const fx = (cx - view.x) / (VW / view.z), fy = (cy - view.y) / (VH / view.z);
    view.z = nz; view.x = cx - fx * (VW / nz); view.y = cy - fy * (VH / nz);
    applyView();
  }
  function svgPoint(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  /* ================= INTERACTION ================= */
  const ptrs = new Map();
  let pan = null, pinch = null, lastTap = null;

  function pinchInfo() {
    const v = Array.from(ptrs.values());
    return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, mx: (v[0].x + v[1].x) / 2, my: (v[0].y + v[1].y) / 2 };
  }
  function cancelDrag() {
    if (!drag) return;
    const g = board.gates.find(x => x.id === drag.id);
    if (g) { g.x = drag.ox; g.y = drag.oy; }
    drag = null; svg.classList.remove('dragging'); render();
  }
  function startPinch() {
    cancelAnimationFrame(tw); cancelDrag(); pan = null;
    const m = pinchInfo(), r = svg.getBoundingClientRect();
    pinch = {
      d0: m.d, z0: view.z,
      ax: view.x + (m.mx - r.left) / r.width * (VW / view.z),
      ay: view.y + (m.my - r.top) / r.height * (VH / view.z)
    };
  }
  function movePinch() {
    const m = pinchInfo(), r = svg.getBoundingClientRect();
    const nz = clamp(pinch.z0 * m.d / pinch.d0, ZMIN, ZMAX);
    view.z = nz;
    view.x = pinch.ax - (m.mx - r.left) / r.width * (VW / nz);
    view.y = pinch.ay - (m.my - r.top) / r.height * (VH / nz);
    applyView();
  }

  svg.addEventListener('pointerdown', e => {
    cancelAnimationFrame(tw);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { startPinch(); try { svg.setPointerCapture(e.pointerId); } catch (err) {} return; }
    if (ptrs.size > 2) return;
    const el = e.target.closest('[data-k]');
    const k = el && el.dataset.k;
    if (!k) {
      if (pending || selected !== null) { pending = null; selected = null; render(); }
      pan = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, id: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    e.preventDefault();
    FX.unlock();

    if (k === 'toggle') {
      const n = el.dataset.name;
      stopAuto();
      inputsVal[n] = inputsVal[n] ? 0 : 1;
      FX.play('tap'); FX.vibrate(8);
      render();
    } else if (k === 'sport') {
      pending = pending === el.dataset.src ? null : el.dataset.src;
      FX.play('tap');
      render();
    } else if (k === 'tport') {
      const dst = el.dataset.dst;
      if (pending) {
        if (dst.indexOf('g:') === 0 && LG.dependsOn(board, pending, +dst.split(':')[1])) {
          App.toast('No loops: a gate cannot feed back into itself.');
          FX.play('bad'); pending = null; render(); return;
        }
        pushUndo();
        board.conn[dst] = pending;
        pending = null;
        FX.play('wire'); FX.vibrate(10);
        afterChange();
      } else if (board.conn[dst]) {
        pushUndo();
        delete board.conn[dst];
        FX.play('del');
        afterChange();
      } else {
        App.toast('First tap a source port (the circle on the right side of a gate or input).');
      }
    } else if (k === 'gate') {
      const id = +el.dataset.id, g = board.gates.find(x => x.id === id);
      if (!g) return;
      const wasSel = selected;
      selected = id;
      const p = svgPoint(e);
      drag = { id: id, sx: p.x, sy: p.y, ox: g.x, oy: g.y, moved: false, snap: snap(), el: el };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      if (wasSel !== id) {
        $('#nodes').querySelectorAll('.gate.sel').forEach(n => n.classList.remove('sel'));
        el.classList.add('sel');
        $('#wires').innerHTML = wiresHtml();
        updateInfo();
      }
    }
  });

  svg.addEventListener('pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) { movePinch(); return; }
    if (pan && pan.id === e.pointerId) {
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) < 5) return;
      pan.moved = true;
      if (view.z > 1.01) {
        const r = svg.getBoundingClientRect();
        view.x = pan.vx - dx / r.width * (VW / view.z);
        view.y = pan.vy - dy / r.height * (VH / view.z);
        applyView();
      }
      return;
    }
    if (!drag) return;
    const g = board.gates.find(x => x.id === drag.id);
    if (!g) { drag = null; return; }
    const p = svgPoint(e), dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; svg.classList.add('dragging'); }
    g.x = clamp(Math.round(drag.ox + dx), X_MIN, X_MAX);
    g.y = clamp(Math.round(drag.oy + dy), Y_MIN, Y_MAX);
    drag.el.setAttribute('transform', 'translate(' + g.x + ',' + g.y + ')');
    $('#wires').innerHTML = wiresHtml();
  });
  function endDrag() {
    if (!drag) return;
    const moved = drag.moved, s = drag.snap;
    drag = null;
    svg.classList.remove('dragging');
    if (moved) { pushUndo(s); persistBoard(); render(); }
  }
  function pointerEnd(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (pan && pan.id === e.pointerId) {
      const p = pan; pan = null;
      if (!p.moved && e.type === 'pointerup') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 330 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28) {
          lastTap = null;
          if (view.z > 1.3) tweenTo(1, 0, 0);
          else { const pt = svgPoint(e); tweenTo(2.4, pt.x - VW / 2.4 / 2, pt.y - VH / 2.4 / 2); }
        } else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }
    endDrag();
  }
  svg.addEventListener('pointerup', pointerEnd);
  svg.addEventListener('pointercancel', pointerEnd);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    cancelAnimationFrame(tw);
    const p = svgPoint(e);
    zoomAt(view.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
  }, { passive: false });

  /* ================= TOOLS ================= */
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snap());
    restore(undoStack.pop());
    selected = null; pending = null;
    FX.play('tap');
    afterChange(true);
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snap());
    restore(redoStack.pop());
    selected = null; pending = null;
    FX.play('tap');
    afterChange(true);
  }
  function delSel() {
    if (selected === null) return;
    pushUndo();
    removeGate(selected);
    selected = null; pending = null;
    FX.play('del');
    afterChange();
  }
  function useHint() {
    if (!level.hints || !level.hints.length || level.sandbox) return;
    if (hintIdx >= level.hints.length) { App.toast('You have seen all the hints.'); return; }
    hintIdx++;
    FX.play('tap');
    renderHints();
    updateInfo();
  }
  // tidy: lay the gates out in two columns, ordered by how deep they are in the circuit
  function arrange() {
    if (!board.gates.length) { App.toast('Add some gates first.'); return; }
    pushUndo();
    const byId = {}, depth = {};
    board.gates.forEach(g => { byId[g.id] = g; });
    function d(id, seen) {
      if (depth[id] !== undefined) return depth[id];
      if (seen[id]) return 0;
      seen[id] = 1;
      let m = 0;
      for (let i = 0; i < LG.GATES[byId[id].type].in; i++) {
        const s = board.conn['g:' + id + ':' + i];
        if (s && s.indexOf('g:') === 0 && byId[+s.slice(2)]) m = Math.max(m, d(+s.slice(2), seen) + 1);
      }
      return (depth[id] = m);
    }
    board.gates.forEach(g => d(g.id, {}));
    const list = board.gates.slice().sort((a, b) => depth[a.id] - depth[b.id] || a.y - b.y);
    const half = Math.ceil(list.length / 2);
    [list.slice(0, half), list.slice(half)].forEach((col, ci) => {
      const step = col.length > 1 ? Math.min(80, (Y_MAX - Y_MIN - 10) / (col.length - 1)) : 0;
      const top = clamp(Math.round(250 - step * (col.length - 1) / 2), Y_MIN, Y_MAX);
      col.forEach((g, i) => { g.x = ci ? 208 : 96; g.y = Math.round(top + i * step); });
    });
    FX.play('add');
    afterChange(true);
    App.toast('Board tidied. Undo brings the old layout back.');
  }
  function syncVals() {
    const b = $('#btnVals');
    b.classList.toggle('on', !!save.settings.vals);
    b.setAttribute('aria-pressed', String(!!save.settings.vals));
  }
  function toggleVals() {
    save.settings.vals = !save.settings.vals;
    App.persist(); FX.play('tap');
    syncVals(); render();
  }
  function stopAuto() {
    if (autoT) { clearInterval(autoT); autoT = 0; }
    const b = $('#btnAuto');
    if (b) b.textContent = '▶ Auto-test';
  }
  function autoTest() {
    if (autoT) { stopAuto(); return; }
    const rows = LG.rowsOf(level);
    let i = 0;
    $('#btnAuto').textContent = '■ Stop';
    const step = () => {
      inputsVal = Object.assign({}, rows[i].vals);
      render(); FX.play('tick');
      i++;
      if (i >= rows.length) stopAuto();
    };
    step();
    if (i < rows.length) autoT = setInterval(step, 800);
  }

  /* ================= BUTTONS ================= */
  $('#palette').addEventListener('click', e => {
    const b = e.target.closest('[data-gate]');
    if (b) { FX.unlock(); addGate(b.dataset.gate); }
  });
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;
  $('#qUndo').onclick = undo;
  $('#qRedo').onclick = redo;
  $('#btnDel').onclick = delSel;
  $('#btnClear').onclick = () => {
    if (!board.gates.length && !Object.keys(board.conn).length) return;
    App.modal('<h3>Clear the board?</h3><p>All gates and wires will be removed. You can undo this.</p>' +
      '<div class="mbtns two"><button class="btn danger" data-act="yes">Clear</button><button class="btn" data-act="no">Cancel</button></div>',
      act => {
        App.closeModal();
        if (act !== 'yes') return;
        pushUndo();
        board.gates = []; board.conn = {}; board.nextId = 1;
        selected = null; pending = null;
        afterChange();
      });
  };
  $('#btnHint').onclick = useHint;
  $('#btnArrange').onclick = arrange;
  $('#btnVals').onclick = toggleVals;
  $('#btnAuto').onclick = () => { FX.unlock(); autoTest(); };
  $('#btnPng').onclick = () => {
    FX.play('tap');
    const used = LG.usedGates(board, level).length;
    Card.preview(pngCard(used), pngName(), level.sandbox ? 'My circuit in Logic Gate Rush' : shareText(LG.starsFor(used, level.par), used));
  };
  $('#zIn').onclick = () => { FX.play('tap'); zoomBy(1.45); };
  $('#zOut').onclick = () => { FX.play('tap'); zoomBy(1 / 1.45); };
  $('#zFit').onclick = () => { FX.play('tap'); tweenTo(1, 0, 0); };
  $('#gBack').onclick = () => App.back();
  $('#gRules').onclick = () => App.show('guide');

  // desktop shortcuts
  document.addEventListener('keydown', e => {
    if (App.current() !== 'game' || App.modalOpen() || App.isMenuOpen() || !level) return;
    const tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod || e.altKey) return;
    if (k === '+' || k === '=') zoomBy(1.45);
    else if (k === '-' || k === '_') zoomBy(1 / 1.45);
    else if (k === '0') tweenTo(1, 0, 0);
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); delSel(); }
    else if (k === 'Escape') { pending = null; selected = null; render(); }
    else if (k === 'h' || k === 'H') useHint();
    else if (k === 't' || k === 'T') arrange();
    else if (k === 'v' || k === 'V') toggleVals();
    else if (/^[1-4]$/.test(k) && level.inputs[+k - 1]) {
      const n = level.inputs[+k - 1];
      stopAuto(); inputsVal[n] = inputsVal[n] ? 0 : 1; FX.play('tap'); render();
    }
  });

  /* ================= REGISTER ================= */
  App.register('levels', { enter: renderLevels });
  App.register('game', {
    enter: function () {
      setupGameHeader(); applyView(); render(); syncVals();
      if (!save.flags.zhint) {
        save.flags.zhint = 1; App.persist();
        const z = $('#zhint'); z.classList.add('show');
        setTimeout(() => z.classList.remove('show'), 5000);
      }
    },
    leave: function () { drag = null; pending = null; pan = null; pinch = null; ptrs.clear(); stopAuto(); svg.classList.remove('dragging'); }
  });

  window.__game = { get level() { return level; }, get board() { return board; }, get view() { return view; }, get inputs() { return inputsVal; } };
  window.Campaign = {
    open: open, openDaily: openDaily, openLab: openLab, openRandom: openRandom, nextLevel: nextLevel,
    dailyStreak: dailyStreak, getBest: getBest
  };
})();
