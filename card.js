/* Logic Gate Rush - PNG result cards (canvas) */
(function () {
  'use strict';

  const App = window.App, LG = window.LGR, Draw = window.Draw, FX = window.FX;
  const CW = 1080, CH = 1440;

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function star(ctx, cx, cy, R, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? R : R * 0.42, a = -Math.PI / 2 + i * Math.PI / 5;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = [];
    let line = '';
    words.forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function gateOnCanvas(ctx, type, x, y, C) {
    const s = Draw.SH[type];
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = C.gateStroke; ctx.fillStyle = C.gateFill;
    const p = new Path2D(s.body);
    ctx.fill(p); ctx.stroke(p);
    if (s.extra) ctx.stroke(new Path2D(s.extra));
    if (s.bub) { ctx.beginPath(); ctx.arc(s.bub[0], s.bub[1], s.bub[2], 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(s.stub[0], 28); ctx.lineTo(s.stub[1], 28); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = 'bold 10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
    ctx.fillText(s.lab[0], s.lab[1], 32);
    ctx.restore();
  }

  function drawBoard(ctx, level, board, vals, bx, by, bw, bh, C) {
    const g = Draw.geom(level, board);
    // crop to the part of the board that is actually used, so small circuits are drawn big
    let top = Infinity, bot = -Infinity;
    level.inputs.forEach((n, i) => { top = Math.min(top, g.iy[i] - 34); bot = Math.max(bot, g.iy[i] + 22); });
    level.outputs.forEach((n, i) => { top = Math.min(top, g.oy[i] - 42); bot = Math.max(bot, g.oy[i] + 26); });
    board.gates.forEach(gt => { top = Math.min(top, gt.y - 8); bot = Math.max(bot, gt.y + 64); });
    top = Math.max(0, top); bot = Math.min(Draw.H, bot);
    const ext = Math.max(120, bot - top);
    const sc = Math.min(bw / Draw.W, bh / ext);
    const ox = bx + (bw - Draw.W * sc) / 2, oy = by + (bh - ext * sc) / 2 - top * sc;
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(sc, sc);

    // wires
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    Object.keys(board.conn).forEach(dst => {
      const src = board.conn[dst], a = g.srcPos(src), b = g.dstPos(dst);
      if (!a || !b) return;
      const v = LG.evalSrc(board, src, vals, new Set());
      ctx.strokeStyle = v === 1 ? C.accent : C.wireOff;
      if (v === 1) { ctx.shadowColor = C.accent; ctx.shadowBlur = 8; }
      ctx.stroke(new Path2D(Draw.wirePath(a, b)));
      ctx.shadowBlur = 0;
    });

    // inputs
    level.inputs.forEach((name, i) => {
      const y = g.iy[i], on = vals[name] === 1;
      ctx.fillStyle = on ? C.accent : C.panel2; ctx.strokeStyle = on ? C.accent : C.wireOff; ctx.lineWidth = 2;
      roundRect(ctx, 6, y - 15, 46, 30, 15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? C.accentInk : C.muted;
      ctx.beginPath(); ctx.arc(on ? 37 : 21, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
      ctx.fillText(on ? '1' : '0', on ? 21 : 37, y + 4);
      ctx.fillStyle = C.muted; ctx.font = 'bold 13px ui-monospace, Menlo, monospace';
      ctx.fillText(name, 29, y - 22);
      ctx.strokeStyle = C.gateStroke; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(52, y); ctx.lineTo(Draw.IN_X, y); ctx.stroke();
      ctx.fillStyle = C.panel2; ctx.strokeStyle = C.accent2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Draw.IN_X, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // gates
    board.gates.forEach(gt => {
      gateOnCanvas(ctx, gt.type, gt.x, gt.y, C);
      Draw.inPorts(gt.type).forEach(py => {
        ctx.fillStyle = C.bg; ctx.strokeStyle = C.gateStroke; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gt.x, gt.y + py, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = C.panel2; ctx.strokeStyle = C.accent2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gt.x + 80, gt.y + 28, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // outputs
    level.outputs.forEach((name, i) => {
      const y = g.oy[i], v = LG.evalOut(board, vals, name);
      ctx.strokeStyle = C.gateStroke; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(Draw.OUT_X + 7, y); ctx.lineTo(Draw.LAMP_X - 19, y); ctx.stroke();
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(Draw.OUT_X, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = v === 1 ? C.accent : C.panel2; ctx.strokeStyle = v === 1 ? C.accent : C.wireOff;
      if (v === 1) { ctx.shadowColor = C.accent; ctx.shadowBlur = 14; }
      ctx.beginPath(); ctx.arc(Draw.LAMP_X, y, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = v === 1 ? C.accentInk : C.muted; ctx.font = '800 15px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
      ctx.fillText(v === null ? '?' : String(v), Draw.LAMP_X, y + 5);
      ctx.fillStyle = C.muted; ctx.font = 'bold 13px ui-monospace, Menlo, monospace';
      ctx.fillText(name, Draw.LAMP_X, y - 28);
    });
    ctx.restore();
  }

  /* o = { kind:'level'|'lab'|'score', title, subtitle, stars (0-3|null), stats:[[k,v]], level, board, vals, expr, big } */
  function render(o) {
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');
    const C = {
      bg: css('--bg'), bg2: css('--bg2'), panel: css('--panel'), panel2: css('--panel2'), line: css('--line'),
      text: css('--text'), muted: css('--muted'), accent: css('--accent'), accentInk: css('--accent-ink'),
      accent2: css('--accent2'), gold: css('--gold'), wireOff: css('--wire-off'),
      gateFill: css('--gate-fill'), gateStroke: css('--gate-stroke'), board: css('--board')
    };
    const F = 'system-ui, "Segoe UI", Roboto, sans-serif';

    // background
    const grad = ctx.createLinearGradient(0, 0, CW, CH);
    grad.addColorStop(0, C.bg2); grad.addColorStop(0.55, C.bg); grad.addColorStop(1, C.bg2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = C.line; ctx.globalAlpha = 0.35;
    for (let x = 30; x < CW; x += 40) for (let y = 30; y < CH; y += 40) ctx.fillRect(x, y, 2, 2);
    ctx.globalAlpha = 1;

    // header
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.accent; ctx.font = '800 44px ' + F; ctx.textAlign = 'left';
    ctx.fillText('⚡ LOGIC GATE RUSH', 60, 100);
    ctx.fillStyle = C.muted; ctx.font = '600 30px ' + F; ctx.textAlign = 'right';
    ctx.fillText('by ' + App.DEV, CW - 60, 98);
    ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(60, 130); ctx.lineTo(CW - 60, 130); ctx.stroke();

    // title
    ctx.textAlign = 'center'; ctx.fillStyle = C.text; ctx.font = '800 76px ' + F;
    let t = o.title, size = 76;
    while (ctx.measureText(t).width > CW - 120 && size > 40) { size -= 4; ctx.font = '800 ' + size + 'px ' + F; }
    ctx.fillText(t, CW / 2, 235);
    ctx.fillStyle = C.muted; ctx.font = '500 36px ' + F;
    ctx.fillText(o.subtitle || '', CW / 2, 295);

    // stars
    if (typeof o.stars === 'number') {
      for (let i = 0; i < 3; i++) {
        const filled = i < o.stars;
        star(ctx, CW / 2 + (i - 1) * 120, 395, 52, filled ? C.gold : 'rgba(0,0,0,0)', filled ? null : C.wireOff);
      }
    }

    // panel
    const px = 60, py = 470, pw = CW - 120, ph = 700;
    roundRect(ctx, px, py, pw, ph, 36);
    ctx.fillStyle = C.board; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = o.solved ? C.accent : C.line; ctx.stroke();

    if (o.level && o.board) {
      drawBoard(ctx, o.level, o.board, o.vals || {}, px + pw * 0.38, py + 20, pw * 0.62 - 20, ph - 40, C);
      ctx.textAlign = 'left';
      (o.stats || []).forEach((s, i) => {
        const y = py + 110 + i * 130;
        ctx.fillStyle = C.muted; ctx.font = '600 28px ' + F; ctx.fillText(s[0].toUpperCase(), px + 40, y);
        ctx.fillStyle = C.text; ctx.font = '800 56px ' + F; ctx.fillText(String(s[1]), px + 40, y + 62);
      });
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = C.accent; ctx.font = '900 190px ' + F;
      ctx.fillText(String(o.big), CW / 2, py + 270);
      ctx.fillStyle = C.muted; ctx.font = '700 34px ' + F;
      ctx.fillText((o.bigLabel || 'SCORE').toUpperCase(), CW / 2, py + 330);
      const stats = o.stats || [], cols = Math.min(3, stats.length || 1);
      stats.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const cx2 = px + pw * (col + 0.5) / cols, y = py + 450 + row * 140;
        ctx.fillStyle = C.muted; ctx.font = '600 26px ' + F; ctx.fillText(s[0].toUpperCase(), cx2, y);
        ctx.fillStyle = C.text; ctx.font = '800 54px ' + F; ctx.fillText(String(s[1]), cx2, y + 58);
      });
    }

    // expression
    if (o.expr) {
      ctx.textAlign = 'center'; ctx.fillStyle = C.text; ctx.font = '600 36px ui-monospace, Menlo, monospace';
      const lines = [];
      String(o.expr).split('\n').forEach(l => wrap(ctx, l, CW - 160).forEach(x => lines.push(x)));
      lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, CW / 2, 1235 + i * 50));
    }

    // footer
    ctx.fillStyle = C.line; ctx.fillRect(60, 1355, CW - 120, 3);
    ctx.fillStyle = C.muted; ctx.font = '600 30px ' + F; ctx.textAlign = 'left';
    ctx.fillText(LG.dateKey(), 60, 1405);
    ctx.textAlign = 'right'; ctx.fillStyle = C.accent2; ctx.font = '700 30px ' + F;
    ctx.fillText('Developed by ' + App.DEV, CW - 60, 1405);
    return cv;
  }

  function toBlob(cv) {
    return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
  }
  async function download(cv, name) {
    const blob = await toBlob(cv);
    App.save.flags.png = 1; App.persist(); App.checkAch();
    if (!blob) { window.open(cv.toDataURL('image/png'), '_blank'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    App.toast('PNG saved');
  }
  async function share(cv, name, text) {
    const blob = await toBlob(cv);
    try {
      if (blob && navigator.canShare) {
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: text || '' });
          App.save.flags.png = 1; App.persist(); App.checkAch();
          return;
        }
      }
      if (navigator.share) { await navigator.share({ text: text || '' }); return; }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    download(cv, name);
  }

  // modal with a preview and Download / Share buttons
  function preview(cv, name, text, opts) {
    opts = opts || {};
    const img = cv.toDataURL('image/png');
    App.modal(
      '<h3>Your PNG card</h3>' +
      '<img class="pngprev" src="' + img + '" alt="Result card preview">' +
      '<div class="mbtns two"><button class="btn primary" data-act="dl">⬇ Download PNG</button>' +
      '<button class="btn" data-act="sh">Share</button></div>' +
      (opts.next ? '<div class="mbtns"><button class="btn primary" data-act="next">' + opts.next.label + '</button></div>' : '') +
      '<div class="mbtns"><button class="btn ghost" data-act="close">' + (opts.back ? '← Back' : 'Close') + '</button></div>',
      act => {
        FX.play('tap');
        if (act === 'dl') download(cv, name);
        else if (act === 'sh') share(cv, name, text);
        else if (act === 'next' && opts.next) { App.closeModal(); opts.next.go(); }
        else if (opts.back) opts.back();
        else App.closeModal();
      });
  }

  window.Card = { render: render, preview: preview, download: download, share: share, W: CW, H: CH };
})();
