/* Logic Gate Rush - app shell: storage, navigation, modal, toast, themes, XP, achievements */
(function () {
  'use strict';

  const LG = window.LGR, FX = window.FX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const DEV = 'ΣTΣЯПITY';
  const VERSION = '3.0';
  const STORE = 'lgr-v2';

  const THEMES = [
    { id: 'aurora',    name: 'Aurora',    sw: ['#0b0b1e', '#00e5ff', '#ff4fd8'] },
    { id: 'matrix',    name: 'Matrix',    sw: ['#020a04', '#39ff6a', '#b6ff3b'] },
    { id: 'blueprint', name: 'Blueprint', sw: ['#0b2a56', '#7df9ff', '#ffd166'] },
    { id: 'sunset',    name: 'Sunset',    sw: ['#1a0e12', '#ff9a3d', '#ff4d6d'] },
    { id: 'paper',     name: 'Paper',     sw: ['#f3efe6', '#0a9a62', '#5b4bd5'] }
  ];

  /* ---------- storage ---------- */
  function defaults() {
    return {
      levels: {}, daily: {}, boards: {},
      arcade: { qf: { best: 0, runs: 0 }, bf: { best: 0, runs: 0 }, bh: { best: 0, runs: 0 }, tf: { best: 0, runs: 0 }, ci: { best: 0, runs: 0 } },
      match: { easy: null, medium: null, hard: null },
      endless: { easy: 0, medium: 0, hard: 0 },
      flags: {}, ach: {},
      settings: { theme: 'aurora', sound: true, vibe: true, vals: false, calm: false },
      stats: { maxStreak: 0, wins: 0 }
    };
  }
  function load() {
    const d = defaults();
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && typeof s === 'object') {
        Object.keys(d).forEach(k => { if (!(k in s) || typeof s[k] !== typeof d[k]) s[k] = d[k]; });
        s.settings = Object.assign({}, d.settings, s.settings);
        s.arcade = Object.assign({}, d.arcade, s.arcade);
        s.arcade.qf = Object.assign({}, d.arcade.qf, s.arcade.qf);
        ['bf', 'bh', 'tf', 'ci'].forEach(k => { s.arcade[k] = Object.assign({}, d.arcade[k], s.arcade[k]); });
        s.endless = Object.assign({}, d.endless, s.endless);
        delete s.levels.rand;
        s.match = Object.assign({}, d.match, s.match);
        s.stats = Object.assign({}, d.stats, s.stats);
        return s;
      }
    } catch (e) {}
    return d;
  }
  const save = load();
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) {} }
  function resetAll() {
    const d = defaults();
    d.settings = save.settings;
    d.flags = { seenIntro: true };
    Object.keys(save).forEach(k => { delete save[k]; });
    Object.assign(save, d);
    persist();
  }

  // drop old daily boards
  (function prune() {
    const keep = 'D' + LG.dateKey();
    Object.keys(save.boards).forEach(k => { if (k[0] === 'D' && k !== keep) delete save.boards[k]; });
    persist();
  })();

  /* ---------- theme / settings ---------- */
  function applyTheme() {
    const id = THEMES.some(t => t.id === save.settings.theme) ? save.settings.theme : 'aurora';
    document.documentElement.dataset.theme = id;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const m = $('meta[name="theme-color"]');
    if (m && bg) m.setAttribute('content', bg);
  }
  function setTheme(id) { save.settings.theme = id; persist(); applyTheme(); }
  function applySettings() {
    document.documentElement.dataset.calm = save.settings.calm ? '1' : '0';
    FX.setSound(save.settings.sound);
    FX.setVibe(save.settings.vibe);
    const b = $('#btnSound');
    if (b) { b.textContent = save.settings.sound ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(!!save.settings.sound)); }
  }

  /* ---------- toast ---------- */
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- modal ---------- */
  let modalHandler = null;
  const modalOpen = () => !$('#modal').classList.contains('hidden');
  function modal(html, handler, opts) {
    const m = $('#modal');
    $('.mcard', m).innerHTML = html;
    m.dataset.dismiss = opts && opts.noDismiss ? '0' : '1';
    m.classList.remove('hidden');
    modalHandler = handler || null;
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
    modalHandler = null;
  }
  $('#modal').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b) { if (modalHandler) modalHandler(b.dataset.act, b); return; }
    if (e.target.id === 'modal' && e.target.dataset.dismiss !== '0') closeModal();
  });

  /* ---------- drawer menu ---------- */
  let menuOpen = false;
  function openMenu() {
    menuOpen = true;
    document.body.classList.add('menu-open');
    $('#btnMenu').setAttribute('aria-expanded', 'true');
    $('#drawer').setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    menuOpen = false;
    document.body.classList.remove('menu-open');
    $('#btnMenu').setAttribute('aria-expanded', 'false');
    $('#drawer').setAttribute('aria-hidden', 'true');
  }

  /* ---------- navigation ---------- */
  const screens = {};
  let cur = null, curParams = null;
  const stack = [];

  function register(name, def) {
    def.el = $('#scr-' + name);
    screens[name] = def;
  }
  function go(name, params) {
    const prev = screens[cur];
    if (prev && prev.leave) { try { prev.leave(); } catch (e) {} }
    Object.keys(screens).forEach(k => screens[k].el.classList.toggle('hidden', k !== name));
    cur = name; curParams = params || null;
    const s = screens[name];
    s.el.classList.remove('enter'); void s.el.offsetWidth; s.el.classList.add('enter');
    document.body.dataset.screen = name;
    if (s.enter) s.enter(curParams);
    window.scrollTo(0, 0);
  }
  function show(name, params, opts) {
    opts = opts || {};
    if (cur && cur !== name && !opts.replace) stack.push({ name: cur, params: curParams });
    go(name, params);
  }
  // menu-style navigation: Home becomes the parent of the target
  function nav(name, params) {
    stack.length = 0;
    if (name !== 'home') stack.push({ name: 'home', params: null });
    go(name, params);
  }
  function back() {
    const p = stack.pop();
    if (p) go(p.name, p.params);
    else if (cur !== 'home') go('home');
  }
  const current = () => cur;

  history.replaceState({ root: 1 }, '');
  history.pushState({ app: 1 }, '');
  const repush = () => history.pushState({ app: 1 }, '');
  window.addEventListener('popstate', () => {
    if (menuOpen) { closeMenu(); repush(); return; }
    if (modalOpen()) { closeModal(); repush(); return; }
    if (stack.length || cur !== 'home') { back(); repush(); return; }
    history.back();
  });

  /* ---------- progress helpers ---------- */
  function totals() {
    let stars = 0, cleared = 0, three = 0;
    Object.keys(save.levels).forEach(k => {
      if (!(+k >= 1 && +k <= LG.LEVELS.length)) return;
      const r = save.levels[k];
      cleared++;
      stars += r.stars || 0;
      if (r.stars === 3) three++;
    });
    return { stars: stars, cleared: cleared, three: three, daily: Object.keys(save.daily).length };
  }
  function xp() {
    const t = totals();
    let x = t.stars * 10 + t.daily * 15;
    Object.keys(save.daily).forEach(k => { x += (save.daily[k].stars || 0) * 5; });
    ['qf', 'bf', 'bh', 'tf', 'ci'].forEach(k => { x += Math.floor((save.arcade[k].best || 0) / 10); });
    x += (save.endless.easy || 0) * 2 + (save.endless.medium || 0) * 4 + (save.endless.hard || 0) * 6;
    ['easy', 'medium', 'hard'].forEach(k => { if (save.match[k]) x += save.match[k].stars * 10; });
    return x;
  }
  const rank = () => LG.rankOf(xp());
  const endlessTotal = () => (save.endless.easy || 0) + (save.endless.medium || 0) + (save.endless.hard || 0);
  function worldCleared(n) {
    const w = LG.WORLDS[n - 1];
    for (let i = w.from; i <= w.to; i++) if (!save.levels[i]) return false;
    return true;
  }

  /* ---------- achievements ---------- */
  const ACH = [
    { id: 'first',    icon: '⚡', name: 'First Spark',      desc: 'Clear Level 1.',                    test: () => !!save.levels[1] },
    { id: 'w1',       icon: '🥾', name: 'Boot Camp Grad',   desc: 'Clear every level of World 1.',     test: () => worldCleared(1) },
    { id: 'w2',       icon: '🔗', name: 'Universal',        desc: 'Clear every level of World 2.',     test: () => worldCleared(2) },
    { id: 'w3',       icon: '➕', name: 'Arithmetician',    desc: 'Clear every level of World 3.',     test: () => worldCleared(3) },
    { id: 'w4',       icon: '👑', name: 'Grandmaster',      desc: 'Clear every level of World 4.',     test: () => worldCleared(4) },
    { id: 'perfect',  icon: '💎', name: 'Perfectionist',    desc: 'Earn 3 stars on 10 levels.',        test: () => totals().three >= 10 },
    { id: 'stars60',  icon: '⭐', name: 'Star Collector',   desc: 'Collect 60 stars.',                 test: () => totals().stars >= 60 },
    { id: 'w5',       icon: '🔬', name: 'Lab Technician',   desc: 'Clear every level of World 5.',     test: () => worldCleared(5) },
    { id: 'w6',       icon: '🏭', name: 'Chip Designer',    desc: 'Clear every level of World 6.',     test: () => worldCleared(6) },
    { id: 'flawless', icon: '🌟', name: 'Flawless',         desc: 'Earn 3 stars on every level.',      test: () => totals().three >= LG.LEVELS.length },
    { id: 'endless10', icon: '🎲', name: 'Endless Mind',    desc: 'Solve 10 Endless puzzles.',         test: () => endlessTotal() >= 10 },
    { id: 'endless50', icon: '♾️', name: 'Puzzle Machine',  desc: 'Solve 50 Endless puzzles.',         test: () => endlessTotal() >= 50 },
    { id: 'bh100',    icon: '🐞', name: 'Bug Squasher',     desc: 'Score 100 in Bug Hunt.',            test: () => save.arcade.bh.best >= 100 },
    { id: 'tf100',    icon: '🧾', name: 'Table Turner',     desc: 'Score 100 in Table Fill.',          test: () => save.arcade.tf.best >= 100 },
    { id: 'ci100',    icon: '🔎', name: 'Sharp Eye',        desc: 'Score 100 in Circuit ID.',          test: () => save.arcade.ci.best >= 100 },
    { id: 'backup',   icon: '💾', name: 'Safe & Sound',     desc: 'Export a backup of your progress.', test: () => !!save.flags.backup },
    { id: 'daily3',   icon: '🔥', name: 'On Fire',          desc: 'Reach a 3-day daily streak.',       test: () => save.stats.maxStreak >= 3 },
    { id: 'daily7',   icon: '📅', name: 'Daily Habit',      desc: 'Reach a 7-day daily streak.',       test: () => save.stats.maxStreak >= 7 },
    { id: 'qf150',    icon: '🎯', name: 'Quick Fingers',    desc: 'Score 150 in Quick Fire.',          test: () => save.arcade.qf.best >= 150 },
    { id: 'qf300',    icon: '🚀', name: 'Speed Demon',      desc: 'Score 300 in Quick Fire.',          test: () => save.arcade.qf.best >= 300 },
    { id: 'bf150',    icon: '🧮', name: 'Binary Brain',     desc: 'Score 150 in Bit Flip.',            test: () => save.arcade.bf.best >= 150 },
    { id: 'gm3',      icon: '🧠', name: 'Memory Master',    desc: 'Get 3 stars on Gate Match (Hard).', test: () => !!(save.match.hard && save.match.hard.stars === 3) },
    { id: 'lab',      icon: '🧪', name: 'Lab Rat',          desc: 'Build something in the Free Lab.',  test: () => !!save.flags.lab },
    { id: 'png',      icon: '📸', name: 'Shutterbug',       desc: 'Save a PNG card.',                  test: () => !!save.flags.png }
  ];
  function checkAch() {
    const fresh = [];
    ACH.forEach(a => {
      if (!save.ach[a.id] && a.test()) { save.ach[a.id] = LG.dateKey(); fresh.push(a); }
    });
    if (fresh.length) {
      persist();
      fresh.forEach((a, i) => setTimeout(() => { toast('🏆 ' + a.name + ' unlocked!'); FX.play('award'); }, 700 + i * 2300));
    }
    return fresh;
  }

  /* ---------- backup / restore ---------- */
  function exportSave() {
    save.flags.backup = 1; persist();
    return JSON.stringify({ app: 'logic-gate-rush', v: 3, saved: new Date().toISOString(), data: save });
  }
  function importSave(text) {
    let o;
    try { o = JSON.parse(String(text).trim()); } catch (e) { return { ok: false, msg: 'That is not valid backup text.' }; }
    if (!o || o.app !== 'logic-gate-rush' || !o.data || typeof o.data !== 'object' || !o.data.levels) return { ok: false, msg: 'This is not a Logic Gate Rush backup.' };
    const d = defaults(), s = o.data;
    Object.keys(d).forEach(k => { if (!(k in s) || typeof s[k] !== typeof d[k]) s[k] = d[k]; });
    s.settings = Object.assign({}, d.settings, s.settings);
    s.arcade = Object.assign({}, d.arcade, s.arcade);
    ['qf', 'bf', 'bh', 'tf', 'ci'].forEach(k => { s.arcade[k] = Object.assign({}, d.arcade[k], s.arcade[k]); });
    s.match = Object.assign({}, d.match, s.match);
    s.endless = Object.assign({}, d.endless, s.endless);
    s.stats = Object.assign({}, d.stats, s.stats);
    delete s.levels.rand;
    Object.keys(save).forEach(k => { delete save[k]; });
    Object.assign(save, s);
    save.flags.seenIntro = 1;
    persist();
    return { ok: true };
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  window.App = {
    $: $, $$: $$, DEV: DEV, VERSION: VERSION, THEMES: THEMES, save: save, persist: persist, resetAll: resetAll,
    applyTheme: applyTheme, setTheme: setTheme, applySettings: applySettings,
    toast: toast, modal: modal, closeModal: closeModal, modalOpen: modalOpen,
    openMenu: openMenu, closeMenu: closeMenu, isMenuOpen: () => menuOpen,
    register: register, show: show, nav: nav, back: back, current: current,
    totals: totals, xp: xp, rank: rank, worldCleared: worldCleared,
    ACH: ACH, checkAch: checkAch, esc: esc, exportSave: exportSave, importSave: importSave, endlessTotal: endlessTotal
  };
})();
