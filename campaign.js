/* Logic Gate Rush - campaign map, daily puzzle, free lab, circuit board */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, Card = window.Card;
  const $ = App.$, save = App.save, esc = App.esc;

  const HINT_COST = 5, MAXG = 14, H = Draw.H;
  const X_MIN = 96, X_MAX = 210, Y_MIN = 4, Y_MAX = H - 62;
  const SLOTS = [];
  for (let r = 0; r < 7; r++) [96, 208].forEach(x => SLOTS.push({ x: x, y: 10 + r * 76 }));

  let level = null, board = null, inputsVal = {};
  let selected = null, pending = null, undoStack = [], hintIdx = 0, drag = null;
  let lastOk = false, lastUsed = Infinity, newGate = null;

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
  const hasNextLv = lv => !!lv && typeof lv.id === 'number' && lv.id < LG.LEVELS.length;
  function goNext() { if (hasNextLv(level)) open(LG.LEVELS[level.id], { replace: true }); }
  function updateNext() {
    const b = $('#btnNext');
    if (!b || !level) return;
    const show = hasNextLv(level) && (lastOk || !!getBest(level));
    b.classList.toggle('hidden', !show);
    if (show) { const n = LG.LEVELS[level.id]; b.textContent = 'Next: Level ' + n.id + ' · ' + n.title + ' →'; }
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
    const sv = save.boards[lv.key];
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
    selected = null; pending = null; undoStack = []; hintIdx = 0; drag = null; newGate = null;
    const res = LG.checkBoard(board, lv);
    lastOk = res.ok;
    lastUsed = res.ok ? LG.usedGates(board, lv).length : Infinity;
    if (opts.nav) App.nav('game'); else App.show('game', null, { replace: !!opts.replace });
  }
  const openDaily = () => open(LG.dailyLevel(LG.dateKey()), { nav: true });
  const openLab = n => open(LG.sandboxLevel(n || 3), { nav: true });

  /* ================= RENDER BOARD ================= */
  function setupGameHeader() {
    const lv = level;
    $('#gTitle').textContent = lv.sandbox ? 'Free Lab' : lv.id === 'daily' ? 'Daily Puzzle' : 'Level ' + lv.id + ' · ' + lv.title;
    $('#gSub').textContent = lv.sandbox ? 'Sandbox · no targets'
      : lv.id === 'daily' ? lv.date
      : 'World ' + lv.world + ' · Par ' + lv.par + ' gate' + (lv.par === 1 ? '' : 's');
    $('#gStory').textContent = lv.story;
    $('#palette').innerHTML = lv.gates.map(t =>
      '<button class="gbtn" data-gate="' + t + '">' + Draw.gateIcon(t) + '<span>' + t + '</span><small>IC ' + LG.GATES[t].ic + '</small></button>').join('');
    const lab = $('#gLab');
    if (lv.sandbox) {
      lab.classList.remove('hidden');
      lab.innerHTML = 'Inputs: ' + [2, 3, 4].map(n => '<button data-n="' + n + '" class="' + (lv.inputs.length === n ? 'on' : '') + '">' + n + '</button>').join('');
    } else lab.classList.add('hidden');
    $('#btnHint').classList.toggle('hidden', !!lv.sandbox);
    renderHints();
    $('#boardwrap').classList.remove('solved');
  }
  $('#gLab').addEventListener('click', e => {
    const b = e.target.closest('[data-n]');
    if (b && +b.dataset.n !== level.inputs.length) open(LG.sandboxLevel(+b.dataset.n), { replace: true });
  });

  function wiresHtml() {
    const g = Draw.geom(level, board);
    let h = '';
    Object.keys(board.conn).forEach(dst => {
      const src = board.conn[dst], a = g.srcPos(src), b = g.dstPos(dst);
      if (!a || !b) return;
      const v = LG.evalSrc(board, src, inputsVal, new Set());
      h += Draw.wire(a, b, v === 1 ? 'w1' : v === 0 ? 'w0' : 'wn');
    });
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
      '<circle class="hit" cx="80" cy="28" r="15"/><circle class="port src" cx="80" cy="28" r="7"/></g></g>';
  }

  function render() {
    $('#wires').innerHTML = wiresHtml();
    $('#nodes').innerHTML = nodesHtml();
    newGate = null;
    updateInfo();
    updateNext();
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
    $('#btnDel').disabled = selected === null;
    $('#hintLbl').textContent = 'Hint ' + hintIdx + '/' + (level.hints ? level.hints.length : 0) + ' · 🪙' + (save.coins || 0);
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
    }
    box.innerHTML = h;
  }
  $('#hintBox').addEventListener('click', e => {
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
  function pushUndo(s) { undoStack.push(s || snap()); if (undoStack.length > 60) undoStack.shift(); }
  function persistBoard() {
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
    updateNext();
    if (celebrate) setTimeout(() => { if (level && lastOk && App.current() === 'game') showWin(used); }, 500);
  }

  function freeSpot() {
    for (let i = 0; i < SLOTS.length; i++) {
      const s = SLOTS[i];
      if (!board.gates.some(g => Math.abs(g.x - s.x) < 70 && Math.abs(g.y - s.y) < 64)) return s;
    }
    return { x: 150, y: 480 };
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
    const title = level.sandbox ? 'Free Lab' : level.id === 'daily' ? 'Daily Puzzle' : 'Level ' + level.id + ' · ' + level.title;
    const sub = level.sandbox ? 'My custom circuit' : level.id === 'daily' ? level.date : (ok ? 'Solved!' : 'Work in progress');
    return Card.render({
      title: title, subtitle: sub, stars: stars, solved: ok, stats: stats,
      level: level, board: board, vals: inputsVal, expr: exprLines().join('\n')
    });
  }
  function pngName() {
    return 'logic-gate-rush-' + (level.sandbox ? 'lab' : level.id === 'daily' ? 'daily-' + level.date : 'level-' + level.id) + '.png';
  }
  function shareText(stars, used) {
    const st = '⭐'.repeat(stars);
    const head = level.id === 'daily' ? 'Daily ' + level.date : 'Level ' + level.id + ' · ' + level.title;
    return '⚡ Logic Gate Rush · ' + head + '\n' + st + ' · ' + used + ' gates (par ' + level.par + ')';
  }

  function showWin(used) {
    const stars = LG.starsFor(used, level.par);
    const prev = getBest(level);
    const xpB = App.xp();
    const isBest = !prev || stars > (prev.stars || 0);
    if (!prev || stars > (prev.stars || 0) || (stars === prev.stars && used < prev.gates)) setBest(level, { stars: stars, gates: used });
    save.stats.wins++;
    if (level.id === 'daily') {
      const s = dailyStreak();
      if (s > save.stats.maxStreak) save.stats.maxStreak = s;
    }
    App.persist();
    let coins = 0;
    if (level.id === 'daily') { if (!prev) coins = 10; } else coins = !prev ? 10 : Math.max(0, stars - (prev.stars || 0)) * 5;
    save.coins = (save.coins || 0) + coins; App.persist();
    const xpA = App.xp(), xpGain = xpA - xpB, rk = App.rank();
    const xpPct = rk.next ? Math.round((xpA - rk.base) / (rk.next - rk.base) * 100) : 100;
    const hasNext = typeof level.id === 'number' && level.id < LG.LEVELS.length;
    const worldDone = typeof level.id === 'number' && level.boss;
    FX.play('win'); FX.vibrate([30, 40, 60]); FX.confetti({ count: stars === 3 ? 140 : 80 });
    const lvRef = level;
    const nxt = hasNextLv(lvRef) ? LG.LEVELS[lvRef.id] : null;
    const newG = nxt ? nxt.gates.filter(g => lvRef.gates.indexOf(g) === -1) : [];
    const isDaily = lvRef.id === 'daily';
    const winModal = () => App.modal(
      '<div class="stars">' + [1, 2, 3].map(i => '<span class="' + (i <= stars ? 'on' : '') + '">★</span>').join('') + '</div>' +
      (isBest && prev ? '<span class="badge">NEW BEST!</span>' : '') +
      '<h3>' + (worldDone ? '🏆 World ' + lvRef.world + ' cleared!' : stars === 3 ? 'Perfect!' : 'Level clear!') + '</h3>' +
      '<p>' + used + ' gate' + (used === 1 ? '' : 's') + ' · par ' + level.par + '</p>' +
      (stars < 3 ? '<p>Use ' + level.par + ' or fewer gates for 3 stars.</p>' : '') +
      '<div class="xpbar"><i style="width:' + xpPct + '%"></i></div><small class="xpl">' + rk.icon + ' ' + rk.name + ' · ' + xpA + (rk.next ? ' / ' + rk.next : '') + ' XP · +' + xpGain + ' XP' + (coins ? ' · +' + coins + ' 🪙' : '') + '</small>' +
      (nxt ? '<p class="nextinfo">Up next: Level ' + nxt.id + ' · ' + esc(nxt.title) + ' (par ' + nxt.par + ')' + (nxt.world !== lvRef.world ? ' · New world!' : '') + (newG.length ? '<br>🔓 New gate: ' + newG.join(', ') : '') + '</p>' : '') +
      '<div class="mbtns">' +
      (nxt ? '<button class="btn primary" data-act="next">Next level →</button><small id="autoNext" class="nextinfo"></small>' : isDaily ? '<button class="btn primary" data-act="qf">⚡ Try Quick Fire</button>' : '') +
      '<div class="mbtns two"><button class="btn" data-act="png">📸 Save PNG</button><button class="btn" data-act="share">Share</button></div>' +
      '<div class="mbtns two"><button class="btn ' + (stars < 3 ? 'hl' : 'ghost') + '" data-act="retry">' + (stars < 3 ? '↻ Improve (' + (3 - stars) + ' ★ left)' : 'View board') + '</button>' +
      '<button class="btn ghost" data-act="map">' + (isDaily ? 'Home' : 'Level map') + '</button></div></div>',
      act => {
        FX.play('tap');
        if (act === 'png') { Card.preview(pngCard(used, stars), pngName(), shareText(stars, used), { back: winModal, next: nxt ? { label: 'Next level →', go: goNext } : null }); return; }
        if (act === 'share') { Card.share(pngCard(used, stars), pngName(), shareText(stars, used)); return; }
        App.closeModal();
        if (act === 'next') goNext();
        else if (act === 'qf') App.nav('qf');
        else if (act === 'map') { if (isDaily) App.nav('home'); else App.back(); }
      });
    winModal();
    if (stars === 3 && nxt) {
      let n = 5;
      const el0 = $('#autoNext'); if (el0) el0.textContent = 'Auto-next in 5s · tap any other button to stay';
      const t = setInterval(() => {
        const el = $('#autoNext');
        if (!el || !App.modalOpen()) { clearInterval(t); return; }
        n--;
        if (n <= 0) { clearInterval(t); App.closeModal(); goNext(); }
        else el.textContent = 'Auto-next in ' + n + 's · tap any other button to stay';
      }, 1000);
    }
    setTimeout(() => App.checkAch(), 300);
  }

  /* ================= INTERACTION ================= */
  const svg = $('#board');
  function svgPoint(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  svg.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-k]');
    const k = el && el.dataset.k;
    if (!k) { if (pending || selected !== null) { pending = null; selected = null; render(); } return; }
    e.preventDefault();
    FX.unlock();

    if (k === 'toggle') {
      const n = el.dataset.name;
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
      if (wasSel !== id) { $('#nodes').querySelectorAll('.gate.sel').forEach(n => n.classList.remove('sel')); el.classList.add('sel'); updateInfo(); }
    }
  });

  svg.addEventListener('pointermove', e => {
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
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ================= BUTTONS ================= */
  $('#palette').addEventListener('click', e => {
    const b = e.target.closest('[data-gate]');
    if (b) { FX.unlock(); addGate(b.dataset.gate); }
  });
  $('#btnUndo').onclick = () => {
    if (!undoStack.length) return;
    restore(undoStack.pop());
    selected = null; pending = null;
    FX.play('tap');
    afterChange(true);
  };
  $('#btnDel').onclick = () => {
    if (selected === null) return;
    pushUndo();
    removeGate(selected);
    selected = null; pending = null;
    FX.play('del');
    afterChange();
  };
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
  $('#btnHint').onclick = () => {
    if (!level.hints || !level.hints.length) return;
    if (hintIdx >= level.hints.length) { App.toast('You have seen all the hints.'); return; }
    if (hintIdx >= 1) {
      if ((save.coins || 0) < HINT_COST) { App.toast('Need ' + HINT_COST + ' 🪙 for the next hint. Clear levels to earn coins.'); return; }
      save.coins -= HINT_COST; App.persist();
    }
    hintIdx++;
    FX.play('tap');
    renderHints();
    updateInfo();
  };
  $('#btnPng').onclick = () => {
    FX.play('tap');
    const used = LG.usedGates(board, level).length;
    Card.preview(pngCard(used), pngName(), level.sandbox ? 'My circuit in Logic Gate Rush' : shareText(LG.starsFor(used, level.par), used),
      { next: hasNextLv(level) && lastOk ? { label: 'Next level →', go: goNext } : null });
  };
  $('#gBack').onclick = () => App.back();
  $('#gRules').onclick = () => App.show('guide');

  /* ================= REGISTER ================= */
  App.register('levels', { enter: renderLevels });
  App.register('game', {
    enter: function () { setupGameHeader(); render(); },
    leave: function () { drag = null; pending = null; svg.classList.remove('dragging'); }
  });

  window.Campaign = {
    open: open, openDaily: openDaily, openLab: openLab, nextLevel: nextLevel,
    dailyStreak: dailyStreak, getBest: getBest
  };
})();
