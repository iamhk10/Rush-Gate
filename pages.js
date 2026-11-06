/* Logic Gate Rush - home, rules, guide, awards, settings, menu, boot */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX, Campaign = window.Campaign;
  const $ = App.$, save = App.save, esc = App.esc;

  /* ---------- generic click routing ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-back]');
    if (b) { FX.play('tap'); App.back(); return; }
    const g = e.target.closest('[data-go]');
    if (g) { FX.unlock(); FX.play('tap'); go(g.dataset.go); }
  });

  function go(where) {
    App.closeMenu();
    switch (where) {
      case 'daily':    Campaign.openDaily(); break;
      case 'lab':      Campaign.openLab(3); break;
      case 'continue': Campaign.open(Campaign.nextLevel()); break;
      case 'about':    about(); break;
      case 'home':     App.nav('home'); break;
      default:         App.show(where);
    }
  }

  /* ======================= HOME ======================= */
  function logoSvg() {
    return '<svg viewBox="0 0 128 88" aria-hidden="true">' +
      '<path class="lw" d="M4 30H34M4 58H34M96 44H124"/>' +
      '<path class="lg" d="M34 18H64A26 26 0 0 1 64 70H34Z"/>' +
      '<circle class="lb" cx="91" cy="44" r="5.5"/></svg>';
  }

  function renderHome() {
    const t = App.totals(), rk = App.rank(), xp = App.xp();
    const nxt = Campaign.nextLevel(), allDone = !!save.levels[LG.LEVELS.length];
    const today = LG.dateKey(), d = save.daily[today], streak = Campaign.dailyStreak();
    const pct = rk.next ? Math.round((xp - rk.base) / (rk.next - rk.base) * 100) : 100;
    $('#scr-home').innerHTML =
      '<header class="hero"><div class="logo-anim">' + logoSvg() + '</div>' +
      '<h1>Logic Gate <span>Rush</span></h1>' +
      '<p>Wire up logic. Match the truth table. Use fewer gates.</p></header>' +
      '<div class="panel rank"><div class="ri">' + rk.icon + '</div><div class="rb">' +
      '<div class="rt"><b>' + rk.name + '</b><span>' + xp + ' XP' + (rk.next ? ' · next: ' + rk.nextName + ' at ' + rk.next : ' · max rank') + '</span></div>' +
      '<div class="xpbar"><i style="width:0" data-w="' + pct + '"></i></div></div></div>' +
      '<button class="cta" data-go="continue"><span><b>' + (allDone ? 'Replay the campaign' : (t.cleared ? 'Continue' : 'Start') + ' · Level ' + nxt.id) + '</b>' +
      '<small>' + esc(nxt.title) + ' · World ' + nxt.world + '</small></span><span class="go">▶</span></button>' +
      '<div class="cards">' +
      '<button class="hc" data-go="levels"><span class="hi">🗺️</span><b>Campaign</b><small>30 levels in 4 worlds · ' + t.stars + ' ★</small></button>' +
      '<button class="hc" data-go="daily"><span class="hi">📅</span><b>Daily Puzzle</b><small>' + (d ? 'Solved ' + '★'.repeat(d.stars) : 'A new puzzle every day') + ' · 🔥 ' + streak + '</small>' +
      (d ? '' : '<span class="tag">NEW</span>') + '</button>' +
      '<button class="hc" data-go="qf"><span class="hi">🎯</span><b>Quick Fire</b><small>Predict outputs fast · best ' + save.arcade.qf.best + '</small></button>' +
      '<button class="hc" data-go="bf"><span class="hi">🧮</span><b>Bit Flip</b><small>Binary ↔ decimal · best ' + save.arcade.bf.best + '</small></button>' +
      '<button class="hc" data-go="gm"><span class="hi">🧠</span><b>Gate Match</b><small>Memory game for gates</small></button>' +
      '<button class="hc" data-go="ttf"><span class="hi">📋</span><b>Truth Table Fill</b><small>Complete gate tables · best ' + ((save.arcade.ttf || {}).best || 0) + '</small></button>' +
      '<button class="hc" data-go="dbg"><span class="hi">🐞</span><b>Circuit Debugger</b><small>Spot the wrong output · best ' + ((save.arcade.dbg || {}).best || 0) + '</small></button>' +
      '<button class="hc" data-go="boss"><span class="hi">👹</span><b>Boss Rush</b><small>5 hard circuits, 1 life · best ' + ((save.arcade.boss || {}).best || 0) + '</small></button>' +
      '<button class="hc" data-go="lab"><span class="hi">🧪</span><b>Free Lab</b><small>Sandbox: build anything</small></button>' +
      '</div>' +
      '<div class="cards" style="margin-top:10px">' +
      '<button class="hc" data-go="rules"><span class="hi">📖</span><b>How to Play</b><small>Rules, controls and scoring</small></button>' +
      '<button class="hc" data-go="awards"><span class="hi">🏆</span><b>Achievements</b><small>' + Object.keys(save.ach).length + ' / ' + App.ACH.length + ' unlocked</small></button>' +
      '</div>' +
      '<footer class="devfoot">Developed by <b>' + App.DEV + '</b></footer>';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const bar = $('#scr-home .xpbar i');
      if (bar) bar.style.width = bar.dataset.w + '%';
    }));
  }

  /* ======================= RULES ======================= */
  function miniDiagram() {
    return '<div class="diagram"><svg viewBox="0 0 300 120" aria-label="Wiring example">' +
      '<g class="tog on"><rect class="tbg" x="6" y="30" width="46" height="30" rx="15"/><circle class="knob" cx="37" cy="45" r="11"/><text class="tval" x="21" y="49">1</text></g>' +
      '<text class="iname" x="29" y="22">A</text>' +
      '<g class="tog"><rect class="tbg" x="6" y="78" width="46" height="30" rx="15"/><circle class="knob" cx="21" cy="93" r="11"/><text class="tval" x="37" y="97">0</text></g>' +
      '<text class="iname" x="29" y="72">B</text>' +
      '<path class="wire w1" d="M64 45 C 90 45 90 53 118 53"/><path class="wire w0" d="M64 93 C 90 93 90 67 118 67"/>' +
      '<circle class="port src" cx="64" cy="45" r="6"/><circle class="port src" cx="64" cy="93" r="6"/>' +
      '<g transform="translate(118,32)">' + Draw.bodyMarkup('AND') + '</g>' +
      '<circle class="port dst used" cx="118" cy="46" r="5.5"/><circle class="port dst used" cx="118" cy="74" r="5.5"/>' +
      '<circle class="port src" cx="198" cy="60" r="6"/>' +
      '<path class="wire w0" d="M198 60 H 236"/>' +
      '<circle class="port dst used" cx="236" cy="60" r="6"/><path class="gline" d="M242 60 H 252"/>' +
      '<circle class="lamp" cx="270" cy="60" r="16"/><text class="lampv" x="270" y="65">0</text><text class="iname" x="270" y="34">Y</text>' +
      '</svg></div>';
  }

  function renderRules() {
    $('#scr-rules').innerHTML =
      '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>How to Play</b><small>Everything you need to know</small></div></div>' +
      '<div class="page">' +
      '<div class="panel sec"><h3>🎯 The goal</h3><p>Every puzzle shows a <b>truth table</b>. Build a circuit with logic gates so that the output lamps match the <b>Target</b> columns in <b>every row</b>. When all rows show ✓, you win.</p>' + miniDiagram() +
      '<p>Above: A = 1 and B = 0 go into an AND gate, so Y = 0.</p></div>' +
      '<div class="panel sec"><h3>🕹️ Controls</h3><ol>' +
      '<li><b>Add a gate:</b> tap a gate in the tray below the board.</li>' +
      '<li><b>Connect:</b> tap a blue <b>output port</b> (the circle on the right of a gate or input), then tap a <b>target port</b> (the circle on the left of a gate, or an output lamp).</li>' +
      '<li><b>Toggle inputs:</b> tap the switches on the left to try different input values and watch the lamps.</li>' +
      '<li><b>Move a gate:</b> drag it. <b>Delete:</b> select it, then press Delete.</li>' +
      '<li><b>Remove a wire:</b> tap the connected target port again.</li>' +
      '<li><b>Undo</b> brings back your last change. <b>Clear</b> empties the board.</li></ol></div>' +
      '<div class="panel sec"><h3>⭐ Stars</h3><p>Each level has a <b>par</b>: the number of gates in the best known solution. Only gates that actually feed an output are counted.</p>' +
      '<ul><li><b>3 ★</b>: par or fewer gates</li><li><b>2 ★</b>: a little over par</li><li><b>1 ★</b>: any working circuit</li></ul>' +
      '<p>You can always improve a level later. Stuck? Use up to <b>3 hints</b>. The last one shows a full wiring recipe, and then you may skip the level.</p></div>' +
      '<div class="panel sec"><h3>🎮 Game modes</h3><div class="modes">' +
      '<div class="mode"><i>🗺️</i><div><b>Campaign</b><span>30 levels in 4 worlds, from NOT gates to full adders and NAND-only boss puzzles. Clear a level to unlock the next.</span></div></div>' +
      '<div class="mode"><i>📅</i><div><b>Daily Puzzle</b><span>A fresh puzzle every day, the same for everyone. Solve it each day to build a streak.</span></div></div>' +
      '<div class="mode"><i>🎯</i><div><b>Quick Fire</b><span>60 seconds. Read a small circuit and tap the output, 0 or 1. Correct answers add time and build a combo.</span></div></div>' +
      '<div class="mode"><i>🧮</i><div><b>Bit Flip</b><span>Convert between binary and decimal against the clock. Flip bits to hit a target or read a number.</span></div></div>' +
      '<div class="mode"><i>🧠</i><div><b>Gate Match</b><span>A memory game: pair gate symbols with their names, truth strings and Boolean expressions.</span></div></div>' +
      '<div class="mode"><i>🧪</i><div><b>Free Lab</b><span>A sandbox with every gate and no goal. Experiment, then save your circuit as a PNG.</span></div></div>' +
      '</div></div>' +
      '<div class="panel sec"><h3>💡 Tips</h3><ul>' +
      '<li>Work out each output as a Boolean expression first.</li>' +
      "<li><b>De Morgan:</b> (A·B)' = A' + B' and (A+B)' = A'·B'.</li>" +
      '<li><b>NAND and NOR are universal.</b> You can build every other gate from either one.</li>' +
      '<li>One signal can feed many gates. Reuse shared parts to save gates.</li>' +
      '<li>You can wire an input straight to an output when no gate is needed.</li></ul></div>' +
      '<p class="center muted" style="font-size:13px">Developed by <b style="color:var(--accent2)">' + App.DEV + '</b></p></div>';
  }

  /* ======================= GATE GUIDE ======================= */
  function renderGuide() {
    const cards = LG.ALL_GATES.map(t => {
      const d = LG.GATES[t], rows = d.in === 1 ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      const tbl = '<table class="mini"><tr>' + (d.in === 1 ? '<th>A</th>' : '<th>A</th><th>B</th>') + '<th>Y</th></tr>' +
        rows.map(r => {
          const y = d.fn.apply(null, r);
          return '<tr>' + r.map(v => '<td>' + v + '</td>').join('') + '<td class="' + (y ? 'ok' : '') + '">' + y + '</td></tr>';
        }).join('') + '</table>';
      return '<div class="panel gcard">' + Draw.gateIcon(t) + '<div><h3>' + t + '<small>IC ' + d.ic + '</small></h3>' +
        '<div class="ex">Y = ' + esc(d.expr) + '</div><p>' + esc(d.desc) + '</p></div>' + tbl + '</div>';
    }).join('');
    $('#scr-guide').innerHTML =
      '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>Gate Guide</b><small>Symbols, ICs and truth tables</small></div></div>' +
      '<div class="page">' + cards +
      '<div class="panel sec"><h3>📐 Boolean cheat sheet</h3><div class="cheat">' +
      "<div>A + 0 = A</div><div>A · 1 = A</div><div>A + 1 = 1</div><div>A · 0 = 0</div>" +
      "<div>A + A' = 1</div><div>A · A' = 0</div><div>A + A = A</div><div>A · A = A</div>" +
      "<div>(A')' = A</div><div>A + A·B = A</div><div>(A·B)' = A'+B'</div><div>(A+B)' = A'·B'</div>" +
      "<div>A⊕B = A·B' + A'·B</div><div>A⊕A = 0</div></div></div></div>";
  }

  /* ======================= ACHIEVEMENTS ======================= */
  function renderAwards() {
    const t = App.totals(), rk = App.rank(), xp = App.xp();
    const pct = rk.next ? Math.round((xp - rk.base) / (rk.next - rk.base) * 100) : 100;
    $('#scr-awards').innerHTML =
      '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>Achievements</b><small>' + Object.keys(save.ach).length + ' / ' + App.ACH.length + ' unlocked</small></div></div>' +
      '<div class="panel rank" style="margin-top:6px"><div class="ri">' + rk.icon + '</div><div class="rb"><div class="rt"><b>' + rk.name + '</b><span>' + xp + ' XP' +
      (rk.next ? ' · next: ' + rk.nextName + ' at ' + rk.next : ' · max rank') + '</span></div><div class="xpbar"><i style="width:' + pct + '%"></i></div></div></div>' +
      '<div class="sgrid">' +
      '<div class="sc"><b>' + t.stars + '</b><small>Stars</small></div><div class="sc"><b>' + t.cleared + '/30</b><small>Levels cleared</small></div><div class="sc"><b>' + t.three + '</b><small>3-star levels</small></div>' +
      '<div class="sc"><b>' + t.daily + '</b><small>Dailies solved</small></div><div class="sc"><b>' + save.stats.maxStreak + '</b><small>Best streak</small></div><div class="sc"><b>' + save.stats.wins + '</b><small>Total wins</small></div>' +
      '<div class="sc"><b>' + save.arcade.qf.best + '</b><small>Quick Fire best</small></div><div class="sc"><b>' + save.arcade.bf.best + '</b><small>Bit Flip best</small></div>' +
      '<div class="sc"><b>' + ['easy', 'medium', 'hard'].filter(k => save.match[k]).length + '/3</b><small>Match cleared</small></div></div>' +
      '<div class="alist">' + App.ACH.map(a => {
        const got = !!save.ach[a.id];
        return '<div class="ach ' + (got ? 'got' : 'lock') + '"><i>' + a.icon + '</i><div><b>' + esc(a.name) + '</b><span>' + esc(a.desc) + (got ? ' · ' + save.ach[a.id] : '') + '</span></div></div>';
      }).join('') + '</div>';
  }

  /* ======================= SETTINGS ======================= */
  function renderSettings() {
    $('#scr-settings').innerHTML =
      '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>Themes &amp; Settings</b><small>Make it yours</small></div></div>' +
      '<div class="panel sec"><h3>🎨 Theme</h3><div class="themes">' +
      App.THEMES.map(t => '<button class="theme ' + (save.settings.theme === t.id ? 'on' : '') + '" data-theme="' + t.id + '">' +
        '<span class="sw">' + t.sw.map(c => '<i style="background:' + c + '"></i>').join('') + '</span><b>' + t.name + '</b></button>').join('') +
      '</div></div>' +
      '<div class="panel sec"><h3>🔊 Feedback</h3>' +
      '<div class="row"><span>Sound effects<small>Short beeps and chimes</small></span><button class="switch ' + (save.settings.sound ? 'on' : '') + '" data-set="sound" aria-label="Sound"></button></div>' +
      '<div class="row"><span>Vibration<small>Haptic feedback on supported phones</small></span><button class="switch ' + (save.settings.vibe ? 'on' : '') + '" data-set="vibe" aria-label="Vibration"></button></div></div>' +
      '<div class="panel sec"><h3>ℹ️ About</h3><p>Logic Gate Rush v' + App.VERSION + '. Developed by <b style="color:var(--accent2)">' + App.DEV + '</b>.</p>' +
      '<div class="mbtns two"><button class="btn" data-go="about">About</button><button class="btn" data-go="rules">How to Play</button></div></div>' +
      '<div class="panel sec"><h3>⚠️ Data</h3><p>Your progress is stored on this device only.</p>' +
      '<button class="btn danger" data-act="reset" style="width:100%">Reset all progress</button></div>';
  }
  $('#scr-settings').addEventListener('click', e => {
    const th = e.target.closest('.theme[data-theme]');
    if (th) { FX.play('tap'); App.setTheme(th.dataset.theme); renderSettings(); return; }
    const sw = e.target.closest('[data-set]');
    if (sw) {
      const k = sw.dataset.set;
      save.settings[k] = !save.settings[k];
      App.persist(); App.applySettings(); FX.play('tap');
      renderSettings();
      return;
    }
    if (e.target.closest('[data-act="reset"]')) {
      App.modal('<h3>Reset everything?</h3><p>Stars, streaks, scores and achievements will be deleted. This cannot be undone.</p>' +
        '<div class="mbtns two"><button class="btn danger" data-act="yes">Reset</button><button class="btn" data-act="no">Cancel</button></div>',
        act => {
          App.closeModal();
          if (act === 'yes') { App.resetAll(); App.applyTheme(); App.applySettings(); App.toast('Progress reset.'); renderSettings(); }
        });
    }
  });

  /* ======================= ABOUT / INTRO ======================= */
  function about() {
    App.modal('<div class="about"><div class="al">⚡</div><h3>Logic Gate Rush</h3><p>Version ' + App.VERSION + '</p>' +
      '<p>A logic-gate puzzle game for curious minds: 30 campaign levels, a daily puzzle and three arcade games.</p>' +
      '<div class="dev"><small class="muted">Developed by</small><br><b>' + App.DEV + '</b></div>' +
      '<p>Works offline. Your progress is saved on this device.</p></div>' +
      '<div class="mbtns"><button class="btn primary" data-act="ok">Close</button></div>', () => App.closeModal());
  }
  function intro() {
    App.modal('<div style="font-size:42px">⚡</div><h3>Welcome to Logic Gate Rush</h3>' +
      '<p style="text-align:left">1. Pick gates from the tray and drop them on the board.<br>2. Tap an output port, then a target port to wire them.<br>' +
      '3. Make the lamps match the truth table in every row.<br>4. Use as few gates as you can for 3 stars.</p>' +
      '<div class="mbtns"><button class="btn primary" data-act="play">Let\'s play</button><button class="btn" data-act="rules">Full rules</button></div>',
      act => {
        save.flags.seenIntro = 1; App.persist();
        App.closeModal();
        if (act === 'rules') App.show('rules');
      }, { noDismiss: true });
  }

  /* ======================= DRAWER MENU ======================= */
  const MENU = [
    ['home', '🏠', 'Home'], ['levels', '🗺️', 'Campaign'], ['daily', '📅', 'Daily Puzzle'], ['sep'],
    ['qf', '🎯', 'Quick Fire'], ['bf', '🧮', 'Bit Flip'], ['gm', '🧠', 'Gate Match'], ['lab', '🧪', 'Free Lab'], ['sep'],
    ['rules', '📖', 'How to Play'], ['guide', '📟', 'Gate Guide'], ['awards', '🏆', 'Achievements'],
    ['settings', '🎨', 'Themes & Settings'], ['about', 'ℹ️', 'About']
  ];
  function buildMenu() {
    $('#drawerItems').innerHTML = MENU.map(m => m[0] === 'sep' ? '<div class="dsep"></div>'
      : '<button class="ditem" data-m="' + m[0] + '"><i>' + m[1] + '</i>' + esc(m[2]) + '</button>').join('');
    $('.devname', $('#drawer')).textContent = App.DEV;
  }
  function markMenu() {
    const cur = App.current();
    App.$$('.ditem').forEach(b => b.classList.toggle('on', b.dataset.m === cur || (b.dataset.m === 'levels' && cur === 'game')));
  }
  $('#drawerItems').addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    FX.unlock(); FX.play('tap');
    App.closeMenu();
    const w = b.dataset.m;
    if (w === 'home' || w === 'levels' || w === 'qf' || w === 'bf' || w === 'gm' || w === 'rules' || w === 'guide' || w === 'awards' || w === 'settings') App.nav(w);
    else go(w);
  });
  $('#btnMenu').addEventListener('click', () => {
    FX.unlock(); FX.play('tap');
    if (App.isMenuOpen()) App.closeMenu(); else { markMenu(); App.openMenu(); }
  });
  $('#scrim').addEventListener('click', App.closeMenu);
  $('#btnSound').addEventListener('click', () => {
    save.settings.sound = !save.settings.sound;
    App.persist(); App.applySettings(); FX.unlock(); FX.play('tap');
    App.toast(save.settings.sound ? 'Sound on' : 'Sound off');
  });

  /* ======================= BOOT ======================= */
  App.register('home', { enter: renderHome });
  App.register('rules', { enter: renderRules });
  App.register('guide', { enter: renderGuide });
  App.register('awards', { enter: renderAwards });
  App.register('settings', { enter: renderSettings });

  buildMenu();
  App.applyTheme();
  App.applySettings();
  App.nav('home');
  App.checkAch();
  if (!save.flags.seenIntro) setTimeout(intro, 500);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
