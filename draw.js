/* Logic Gate Rush - shared drawing helpers (SVG markup + geometry) */
(function () {
  'use strict';

  const LG = window.LGR;
  const W = 400, H = 560, IN_X = 64, OUT_X = 325, LAMP_X = 368;

  const AND_B = 'M0 0H34A28 28 0 0 1 34 56H0Z';
  const OR_B = 'M0 0Q24 0 62 28Q24 56 0 56Q17 28 0 0Z';
  const X_ARC = 'M-8 0Q9 28 -8 56';
  const SH = {
    AND:  { body: AND_B, stub: [62, 80], lab: ['AND', 28] },
    NAND: { body: AND_B, bub: [67, 28, 5], stub: [72, 80], lab: ['NAND', 28] },
    OR:   { body: OR_B,  stub: [62, 80], lab: ['OR', 24] },
    NOR:  { body: OR_B,  bub: [67, 28, 5], stub: [72, 80], lab: ['NOR', 24] },
    XOR:  { body: OR_B,  extra: X_ARC, stub: [62, 80], lab: ['XOR', 26] },
    XNOR: { body: OR_B,  extra: X_ARC, bub: [67, 28, 5], stub: [72, 80], lab: ['XNOR', 26] },
    NOT:  { body: 'M0 6L56 28L0 50Z', bub: [61, 28, 5], stub: [66, 80], lab: ['NOT', 23] }
  };

  function bodyMarkup(type) {
    const s = SH[type];
    if (!s) return '';
    return '<path class="gshape" d="' + s.body + '"/>' +
      (s.extra ? '<path class="gline" d="' + s.extra + '"/>' : '') +
      (s.bub ? '<circle class="gshape" cx="' + s.bub[0] + '" cy="' + s.bub[1] + '" r="' + s.bub[2] + '"/>' : '') +
      '<path class="gline" d="M' + s.stub[0] + ' 28H' + s.stub[1] + '"/>' +
      '<text class="glabel" x="' + s.lab[1] + '" y="32" text-anchor="middle">' + s.lab[0] + '</text>';
  }
  function gateIcon(type, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="-12 -4 108 64" aria-hidden="true">' + bodyMarkup(type) + '</svg>';
  }

  function spread(n) {
    const a = [];
    for (let i = 0; i < n; i++) a.push(Math.round(H * (i + 1) / (n + 1)));
    return a;
  }
  const inPorts = type => (LG.GATES[type].in === 1 ? [28] : [14, 42]);

  function geom(level, board) {
    const iy = spread(level.inputs.length), oy = spread(level.outputs.length);
    return {
      iy: iy, oy: oy,
      srcPos: function (src) {
        if (src.indexOf('in:') === 0) {
          const i = level.inputs.indexOf(src.slice(3));
          return i < 0 ? null : { x: IN_X, y: iy[i] };
        }
        const g = board.gates.find(x => 'g:' + x.id === src);
        return g ? { x: g.x + 80, y: g.y + 28 } : null;
      },
      dstPos: function (dst) {
        if (dst.indexOf('out:') === 0) {
          const i = level.outputs.indexOf(dst.slice(4));
          return i < 0 ? null : { x: OUT_X, y: oy[i] };
        }
        const p = dst.split(':');
        const g = board.gates.find(x => x.id === +p[1]);
        return g ? { x: g.x, y: g.y + inPorts(g.type)[+p[2]] } : null;
      }
    };
  }

  function wirePath(a, b) {
    const dx = Math.max(30, Math.abs(b.x - a.x) / 2);
    return 'M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
  }
  function wire(a, b, cls) {
    return '<path class="wire ' + cls + '" d="' + wirePath(a, b) + '"/>';
  }

  /* ---------- Quick Fire circuit (tree) ---------- */
  function treeSvg(tree) {
    const S = 0.7, COLW = 92, ROWH = 56, LEFT = 6, CHIP = 30;
    let leaf = 0;
    (function lay(n) {
      if ('k' in n) { n.h = 0; n.cy = leaf++ * ROWH + ROWH / 2; n.val = n.k; return; }
      lay(n.a); if (n.b) lay(n.b);
      n.h = 1 + Math.max(n.a.h, n.b ? n.b.h : 0);
      n.cy = n.b ? (n.a.cy + n.b.cy) / 2 : n.a.cy;
      n.val = LG.qfEval(n);
    })(tree);
    const gx = h => 70 + (h - 1) * COLW;
    const outX = n => ('k' in n ? LEFT + CHIP : gx(n.h) + 80 * S);
    let wires = '', nodes = '';
    (function draw(n) {
      if ('k' in n) {
        nodes += '<g><rect class="qchip" x="' + LEFT + '" y="' + (n.cy - 14) + '" width="' + CHIP + '" height="28" rx="8"/>' +
          '<text class="qchipt" x="' + (LEFT + CHIP / 2) + '" y="' + (n.cy + 5) + '">' + n.k + '</text></g>';
        return;
      }
      draw(n.a); if (n.b) draw(n.b);
      const x = gx(n.h), y = n.cy;
      const ports = n.b ? [y - 14 * S, y + 14 * S] : [y];
      [n.a, n.b].forEach((c, i) => {
        if (!c) return;
        wires += '<path class="qw" data-v="' + c.val + '" d="' + wirePath({ x: outX(c), y: c.cy }, { x: x, y: ports[i] }) + '"/>';
      });
      nodes += '<g transform="translate(' + x + ',' + (y - 28 * S) + ') scale(' + S + ')">' + bodyMarkup(n.t) + '</g>';
    })(tree);
    const rx = outX(tree), ex = rx + 34;
    wires += '<path class="qw" data-v="' + tree.val + '" d="M' + rx + ' ' + tree.cy + ' H' + ex + '"/>';
    nodes += '<rect class="qout" x="' + ex + '" y="' + (tree.cy - 16) + '" width="34" height="32" rx="9"/>' +
      '<text class="qoutt" id="qfOut" x="' + (ex + 17) + '" y="' + (tree.cy + 6) + '">?</text>';
    const w = ex + 34 + 6, h = leaf * ROWH;
    return '<svg class="qsvg" viewBox="0 0 ' + w + ' ' + h + '" style="max-height:' + Math.min(300, h * 1.6) + 'px" role="img" aria-label="Logic circuit">' +
      wires + nodes + '</svg>';
  }

  window.Draw = {
    W: W, H: H, IN_X: IN_X, OUT_X: OUT_X, LAMP_X: LAMP_X, SH: SH,
    bodyMarkup: bodyMarkup, gateIcon: gateIcon, spread: spread, inPorts: inPorts,
    geom: geom, wirePath: wirePath, wire: wire, treeSvg: treeSvg
  };
})();
