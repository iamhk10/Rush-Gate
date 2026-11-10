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
      case 'endless':  Campaign.openRandom(); break;
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
      '<h2 class="sect">Play</h2><div class="cards">' +
      '<button class="hc" data-go="levels"><span class="hi">🗺️</span><b>Campaign</b><small>' + LG.LEVELS.length + ' levels · ' + LG.WORLDS.length + ' worlds</small></button>' +
      '<button class="hc" data-go="daily"><span class="hi">📅</span><b>Daily Puzzle</b><small>' + (d ? 'Solved ' + '★'.repeat(d.stars) : 'A new puzzle every day') + ' · 🔥 ' + streak + '</small>' +
      (d ? '' : '<span class="tag">NEW</span>') + '</button>' +
      '<button class="hc" data-go="endless"><span class="hi">🎲</span><b>Endless</b><small>Random puzzles forever · ' + App.endlessTotal() + ' solved</small><span class="tag">NEW</span></button>' +
      '<button class="hc" data-go="lab"><span class="hi">🧪</span><b>Free Lab</b><small>Sandbox: build anything</small></button>' +
      '</div>' +
      '<h2 class="sect">Arcade</h2><div class="cards">' +
      '<button class="hc" data-go="qf"><span class="hi">🎯</span><b>Quick Fire</b><small>Predict outputs fast · best ' + save.arcade.qf.best + '</small></button>' +
      '<button class="hc" data-go="bf"><span class="hi">🧮</span><b>Bit Flip</b><small>Binary ↔ decimal · best ' + save.arcade.bf.best + '</small></button>' +
      '<button class="hc" data-go="gm"><span class="hi">🧠</span><b>Gate Match</b><small>Memory game for gates</small></button>' +
      '<button class="hc" data-go="bh"><span class="hi">🐞</span><b>Bug Hunt</b><small>Find the wrong gate · best ' + save.arcade.bh.best + '</small><span class="tag">NEW</span></button>' +
      '<button class="hc" data-go="tf"><span class="hi">🧾</span><b>Table Fill</b><small>Complete the truth table · best ' + save.arcade.tf.best + '</small><span class="tag">NEW</span></button>' +
      '<button class="hc" data-go="ci"><span class="hi">🔎</span><b>Circuit ID</b><small>Name that circuit · best ' + save.arcade.ci.best + '</small><span class="tag">NEW</span></button>' +
      '</div>' +
      '<h2 class="sect">More</h2><div class="cards">' +
      '<button class="hc" data-go="rules"><span class="hi">📖</span><b>How to Play</b><small>Rules, controls and scoring</small></button>' +
      '<button class="hc" data-go="guide"><span class="hi">📟</span><b>Gate Guide</b><small>Symbols, ICs, cheat sheet</small></button>' +
      '<button class="hc" data-go="awards"><span class="hi">🏆</span><b>Achievements</b><small>' + Object.keys(save.ach).length + ' / ' + App.ACH.length + ' unlocked</small></button>' +
      '<button class="hc" data-go="stats"><span class="hi">📊</span><b>Stats &amp; Backup</b><small>Progress, records, save file</small></button>' +
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
      '<li><b>Undo / Redo</b> step through your changes. <b>Clear</b> empties the board.</li></ol></div>' +
      '<div class="panel sec"><h3>🔍 Zoom &amp; board tools</h3><ul>' +
      '<li><b>Zoom:</b> use the + and − buttons on the board, <b>pinch</b> with two fingers, scroll the mouse wheel, or <b>double-tap</b> the background. Tap the percentage to fit the whole board again.</li>' +
      '<li><b>Pan:</b> when zoomed in, drag the empty background.</li>' +
      '<li><b>Tidy</b> arranges your gates neatly (Undo brings the old layout back).</li>' +
      '<li><b>Values</b> shows the 0 or 1 on every gate output.</li>' +
      '<li><b>Auto-test</b> steps through every row of the truth table for you.</li>' +
      '<li>Selecting a gate highlights its wires.</li>' +
      '<li><b>Keyboard:</b> Ctrl+Z undo, Ctrl+Y redo, Delete, + / − / 0 zoom, H hint, T tidy, V values, 1–4 flip inputs.</li></ul></div>' +
      '<div class="panel sec"><h3>⭐ Stars</h3><p>Each level has a <b>par</b>: the number of gates in the best known solution. Only gates that actually feed an output are counted.</p>' +
      '<ul><li><b>3 ★</b>: par or fewer gates</li><li><b>2 ★</b>: a little over par</li><li><b>1 ★</b>: any working circuit</li></ul>' +
      '<p>You can always improve a level later. Stuck? Use up to <b>3 hints</b>. The last one shows a full wiring recipe, and then you may skip the level.</p></div>' +
      '<div class="panel sec"><h3>🎮 Game modes</h3><div class="modes">' +
      '<div class="mode"><i>🗺️</i><div><b>Campaign</b><span>' + LG.LEVELS.length + ' levels in ' + LG.WORLDS.length + ' worlds, from NOT gates to adders, multipliers and NAND-only boss puzzles. Clear a level to unlock the next.</span></div></div>' +
      '<div class="mode"><i>📅</i><div><b>Daily Puzzle</b><span>A fresh puzzle every day, the same for everyone. Solve it each day to build a streak.</span></div></div>' +
      '<div class="mode"><i>🎯</i><div><b>Quick Fire</b><span>60 seconds. Read a small circuit and tap the output, 0 or 1. Correct answers add time and build a combo.</span></div></div>' +
      '<div class="mode"><i>🧮</i><div><b>Bit Flip</b><span>Convert between binary and decimal against the clock. Flip bits to hit a target or read a number.</span></div></div>' +
      '<div class="mode"><i>🎲</i><div><b>Endless</b><span>Random build puzzles in three difficulties. Solve one and a fresh one is ready. Perfect for practice.</span></div></div>' +
      '<div class="mode"><i>🐞</i><div><b>Bug Hunt</b><span>A circuit has one wrong gate. Compare it with the spec and tap the culprit before time runs out.</span></div></div>' +
      '<div class="mode"><i>🧾</i><div><b>Table Fill</b><span>Read a circuit and fill in its truth table. Check it for bonus time.</span></div></div>' +
      '<div class="mode"><i>🔎</i><div><b>Circuit ID</b><span>Pick the Boolean expression that matches the circuit shown.</span></div></div>' +
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
      '<div class="sc"><b>' + t.stars + '</b><small>Stars</small></div><div class="sc"><b>' + t.cleared + '/' + LG.LEVELS.length + '</b><small>Levels cleared</small></div><div class="sc"><b>' + t.three + '</b><small>3-star levels</small></div>' +
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
      '<div class="panel sec"><h3>🧩 Board</h3>' +
      '<div class="row"><span>Show signal values<small>Little 0/1 badges on every gate output</small></span><button class="switch ' + (save.settings.vals ? 'on' : '') + '" data-set="vals" aria-label="Show signal values"></button></div>' +
      '<div class="row"><span>Calm mode<small>Fewer animations and no confetti</small></span><button class="switch ' + (save.settings.calm ? 'on' : '') + '" data-set="calm" aria-label="Calm mode"></button></div></div>' +
      '<div class="panel sec"><h3>ℹ️ About</h3><p>Logic Gate Rush v' + App.VERSION + '. Developed by <b style="color:var(--accent2)">' + App.DEV + '</b>.</p>' +
      '<div class="mbtns two"><button class="btn" data-go="about">About</button><button class="btn" data-go="rules">How to Play</button></div></div>' +
      '<div class="panel sec"><h3>⚠️ Data</h3><p>Your progress is stored on this device only. Make a backup on the <b>Stats &amp; Backup</b> page.</p>' +
      '<div class="mbtns two" style="margin-top:8px"><button class="btn" data-go="stats">Stats &amp; Backup</button><button class="btn danger" data-act="reset">Reset all</button></div></div>';
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

  /* ======================= STATS & BACKUP ======================= */
  function renderStats() {
    const t = App.totals(), n = LG.LEVELS.length;
    const worlds = LG.WORLDS.map(w => {
      let got = 0, cleared = 0, total = (w.to - w.from + 1);
      for (let i = w.from; i <= w.to; i++) { const r = save.levels[i]; if (r) { cleared++; got += r.stars || 0; } }
      const pct = Math.round(cleared / total * 100);
      return '<div class="wrow"><div class="wl"><b>World ' + w.n + ' · ' + esc(w.name) + '</b><span>' + cleared + '/' + total + ' cleared · ' + got + '/' + total * 3 + ' ★</span></div>' +
        '<div class="xpbar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    const arc = [['qf', '🎯', 'Quick Fire'], ['bf', '🧮', 'Bit Flip'], ['bh', '🐞', 'Bug Hunt'], ['tf', '🧾', 'Table Fill'], ['ci', '🔎', 'Circuit ID']].map(g =>
      '<tr><td>' + g[1] + ' ' + g[2] + '</td><td>' + save.arcade[g[0]].best + '</td><td>' + save.arcade[g[0]].runs + '</td></tr>').join('');
    const mt = ['easy', 'medium', 'hard'].map(d => {
      const b = save.match[d];
      return '<tr><td>🧠 Gate Match · ' + LG.MATCH_CFG[d].label + '</td><td>' + (b ? '★'.repeat(b.stars) : '–') + '</td><td>' + (b ? b.moves + ' moves' : '–') + '</td></tr>';
    }).join('');
    const e = save.endless;
    $('#scr-stats').innerHTML =
      '<div class="sh"><button class="icon" data-back aria-label="Back">←</button><div class="ttl"><b>Stats &amp; Backup</b><small>Your records and save file</small></div></div>' +
      '<div class="sgrid">' +
      '<div class="sc"><b>' + App.xp() + '</b><small>XP</small></div><div class="sc"><b>' + t.stars + '</b><small>Stars</small></div><div class="sc"><b>' + t.cleared + '/' + n + '</b><small>Levels</small></div>' +
      '<div class="sc"><b>' + t.three + '</b><small>3-star levels</small></div><div class="sc"><b>' + save.stats.wins + '</b><small>Total wins</small></div><div class="sc"><b>' + save.stats.maxStreak + '</b><small>Best streak</small></div></div>' +
      '<div class="panel sec"><h3>🗺️ Campaign</h3>' + worlds + '</div>' +
      '<div class="panel sec"><h3>🎲 Endless</h3><div class="statrow"><div><b>' + (e.easy || 0) + '</b><small>Easy</small></div><div><b>' + (e.medium || 0) + '</b><small>Medium</small></div><div><b>' + (e.hard || 0) + '</b><small>Hard</small></div></div></div>' +
      '<div class="panel sec"><h3>🎮 Arcade records</h3><table class="stt"><tr><th></th><th>Best</th><th>Runs</th></tr>' + arc + mt + '</table></div>' +
      '<div class="panel sec"><h3>💾 Backup &amp; restore</h3><p>Your progress lives only on this device. Save a backup before you clear browser data, switch phones or reinstall the app.</p>' +
      '<div class="mbtns two"><button class="btn primary" data-bk="download">⬇ Download</button><button class="btn" data-bk="copy">📋 Copy text</button></div>' +
      '<div class="mbtns two"><button class="btn" data-bk="file">📂 Restore file</button><button class="btn" data-bk="paste">📝 Paste text</button></div>' +
      '<input type="file" id="bkFile" accept=".json,application/json,text/plain" class="hidden"></div>';
  }
  function afterRestore() {
    App.applyTheme(); App.applySettings(); App.checkAch();
    App.toast('Progress restored.'); FX.play('award');
    renderStats();
  }
  function confirmRestore(text) {
    let info = '';
    try {
      const o = JSON.parse(String(text).trim());
      if (o && o.data && o.data.levels) info = '<p>Backup from ' + esc(String(o.saved || '').slice(0, 10) || 'unknown date') + ' with ' + Object.keys(o.data.levels).length + ' levels.</p>';
    } catch (err) {}
    App.modal('<h3>Restore this backup?</h3>' + info + '<p>This replaces everything you have now.</p>' +
      '<div class="mbtns two"><button class="btn danger" data-act="yes">Restore</button><button class="btn" data-act="no">Cancel</button></div>',
      act => {
        App.closeModal();
        if (act !== 'yes') return;
        const r = App.importSave(text);
        if (r.ok) afterRestore(); else App.toast(r.msg);
      });
  }
  $('#scr-stats').addEventListener('click', e => {
    const b = e.target.closest('[data-bk]');
    if (!b) return;
    FX.play('tap');
    const k = b.dataset.bk;
    if (k === 'download') {
      const blob = new Blob([App.exportSave()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logic-gate-rush-backup-' + LG.dateKey() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      App.toast('Backup downloaded.'); App.checkAch();
    } else if (k === 'copy') {
      const txt = App.exportSave();
      const done = () => { App.toast('Backup copied. Paste it somewhere safe.'); App.checkAch(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => App.toast('Copy failed. Use Download instead.'));
      else {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { App.toast('Copy failed. Use Download instead.'); }
        ta.remove();
      }
    } else if (k === 'file') {
      $('#bkFile').value = ''; $('#bkFile').click();
    } else if (k === 'paste') {
      App.modal('<h3>Paste backup text</h3><textarea id="bkTxt" class="bktxt" rows="6" placeholder="Paste the backup text here"></textarea>' +
        '<div class="mbtns two"><button class="btn primary" data-act="go">Continue</button><button class="btn" data-act="no">Cancel</button></div>',
        act => {
          const v = ($('#bkTxt') || {}).value || '';
          App.closeModal();
          if (act === 'go') { if (v.trim()) confirmRestore(v); else App.toast('Nothing to restore.'); }
        }, { noDismiss: true });
    }
  });
  $('#scr-stats').addEventListener('change', e => {
    if (e.target.id !== 'bkFile' || !e.target.files || !e.target.files[0]) return;
    const rd = new FileReader();
    rd.onload = () => confirmRestore(String(rd.result || ''));
    rd.onerror = () => App.toast('Could not read that file.');
    rd.readAsText(e.target.files[0]);
  });

  /* ======================= ABOUT / INTRO ======================= */
  function about() {
    App.modal('<div class="about"><div class="al">⚡</div><h3>Logic Gate Rush</h3><p>Version ' + App.VERSION + '</p>' +
      '<p>A logic-gate puzzle game for curious minds: ' + LG.LEVELS.length + ' campaign levels, a daily puzzle, endless mode and six arcade games.</p>' +
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
    ['endless', '🎲', 'Endless'], ['lab', '🧪', 'Free Lab'], ['sep'],
    ['qf', '🎯', 'Quick Fire'], ['bf', '🧮', 'Bit Flip'], ['gm', '🧠', 'Gate Match'], ['bh', '🐞', 'Bug Hunt'], ['tf', '🧾', 'Table Fill'], ['ci', '🔎', 'Circuit ID'], ['sep'],
    ['rules', '📖', 'How to Play'], ['guide', '📟', 'Gate Guide'], ['awards', '🏆', 'Achievements'], ['stats', '📊', 'Stats & Backup'],
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
    if (['home', 'levels', 'qf', 'bf', 'gm', 'bh', 'tf', 'ci', 'rules', 'guide', 'awards', 'stats', 'settings'].indexOf(w) !== -1) App.nav(w);
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
  App.register('stats', { enter: renderStats });

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
