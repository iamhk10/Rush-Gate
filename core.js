/* Logic Gate Rush v3 - core logic (no DOM, testable in Node) */
(function (root) {
  'use strict';

  /* ---------- gates ---------- */
  const GATES = {
    NOT:  { in: 1, fn: a => 1 - a,            ic: '7404',  expr: "A'",     desc: 'Inverts the input. 0 becomes 1 and 1 becomes 0.' },
    AND:  { in: 2, fn: (a, b) => a & b,       ic: '7408',  expr: 'A·B',    desc: 'Output is 1 only when both inputs are 1.' },
    OR:   { in: 2, fn: (a, b) => a | b,       ic: '7432',  expr: 'A+B',    desc: 'Output is 1 when at least one input is 1.' },
    NAND: { in: 2, fn: (a, b) => 1 - (a & b), ic: '7400',  expr: "(A·B)'", desc: 'AND followed by NOT. A universal gate: any circuit can be built from NAND alone.' },
    NOR:  { in: 2, fn: (a, b) => 1 - (a | b), ic: '7402',  expr: "(A+B)'", desc: 'OR followed by NOT. Also a universal gate.' },
    XOR:  { in: 2, fn: (a, b) => a ^ b,       ic: '7486',  expr: 'A⊕B',    desc: 'Output is 1 when the two inputs are different.' },
    XNOR: { in: 2, fn: (a, b) => 1 - (a ^ b), ic: '74266', expr: "(A⊕B)'", desc: 'Output is 1 when the two inputs are the same.' }
  };
  const GATE_ORDER = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR'];
  const ALL_GATES = GATE_ORDER.concat(['XNOR']);

  function truthString(type) {
    const d = GATES[type];
    if (d.in === 1) return '10';
    return [[0, 0], [0, 1], [1, 0], [1, 1]].map(r => d.fn(r[0], r[1])).join('');
  }

  /* ---------- solution DSL ----------
     sol.g = [[TYPE, in1, in2?], ...]  gate N is referred to as 'gN'
     sol.o = { OUTNAME: ref }          ref = input name or 'gN'            */
  function sol(g, o) {
    if (typeof o === 'string') o = { Y: o };
    return { g: g, o: o };
  }
  const isGateRef = r => /^g\d+$/.test(r);
  const refToSrc = r => (isGateRef(r) ? 'g:' + r.slice(1) : 'in:' + r);

  function solToBoard(s) {
    const gates = s.g.map((x, i) => ({ id: i + 1, type: x[0], x: 100, y: 10 }));
    const conn = {};
    s.g.forEach((x, i) => {
      x.slice(1).forEach((r, j) => { conn['g:' + (i + 1) + ':' + j] = refToSrc(r); });
    });
    Object.keys(s.o).forEach(k => { conn['out:' + k] = refToSrc(s.o[k]); });
    return { gates: gates, conn: conn, nextId: gates.length + 1 };
  }

  function netlist(s) {
    const lines = s.g.map((x, i) => 'g' + (i + 1) + ' = ' + x[0] + '(' + x.slice(1).join(', ') + ')');
    Object.keys(s.o).forEach(k => lines.push(k + ' ← ' + s.o[k]));
    return lines.join('\n');
  }

  function makeHints(hint, s) {
    const counts = {};
    s.g.forEach(x => { counts[x[0]] = (counts[x[0]] || 0) + 1; });
    const parts = Object.keys(counts).map(k => counts[k] + '× ' + k);
    const n = s.g.length;
    return [
      hint,
      'A solution uses ' + n + ' gate' + (n === 1 ? '' : 's') + (n ? ': ' + parts.join(', ') : '') + '.',
      netlist(s)
    ];
  }

  /* ---------- levels ---------- */
  const WORLDS = [
    { n: 1, name: 'Boot Camp',       blurb: 'Learn the basic gates.',                  from: 1,  to: 8 },
    { n: 2, name: 'Universal Gates', blurb: 'NAND and NOR can build anything.',        from: 9,  to: 16 },
    { n: 3, name: 'Arithmetic',      blurb: 'Adders, decoders and comparators.',       from: 17, to: 24 },
    { n: 4, name: 'Grandmaster',     blurb: 'Brutal puzzles for logic veterans.',      from: 25, to: 30 },
    { n: 5, name: 'Circuit Lab',     blurb: 'Real chip blocks: switches, counters, subtractors.', from: 31, to: 40 },
    { n: 6, name: 'Chip Designer',   blurb: 'Big circuits and clever tricks. Think before you wire.', from: 41, to: 48 }
  ];

  function lv(id, title, inputs, outputs, fn, gates, s, story, hint) {
    const w = WORLDS.find(x => id >= x.from && id <= x.to);
    return {
      id: id, key: 'L' + id, world: w.n, title: title, inputs: inputs, outputs: outputs,
      fn: fn, gates: gates, par: s.g.length, sol: s, story: story, hint: hint,
      hints: makeHints(hint, s), boss: id === w.to
    };
  }

  const Y = ['Y'];
  const LEVELS = [
    lv(1, 'Flip It', ['A'], Y, v => 1 - v.A, ['NOT'], sol([['NOT', 'A']], 'g1'),
      'Make Y the opposite of A.',
      'Wire A into a NOT gate, then wire the NOT output to Y.'),
    lv(2, 'Both Needed', ['A', 'B'], Y, v => v.A & v.B, ['AND'], sol([['AND', 'A', 'B']], 'g1'),
      'Y must be 1 only when A and B are both 1.',
      'AND is 1 only when both inputs are 1.'),
    lv(3, 'Either One', ['A', 'B'], Y, v => v.A | v.B, ['OR'], sol([['OR', 'A', 'B']], 'g1'),
      'Y must be 1 when A or B (or both) is 1.',
      'OR is 1 when at least one input is 1.'),
    lv(4, 'Exclusive', ['A', 'B'], Y, v => v.A ^ v.B, ['XOR'], sol([['XOR', 'A', 'B']], 'g1'),
      'Meet XOR: Y is 1 only when A and B differ.',
      'XOR is 1 when the inputs are different.'),
    lv(5, 'A But Not B', ['A', 'B'], Y, v => v.A & (1 - v.B), ['AND', 'NOT'],
      sol([['NOT', 'B'], ['AND', 'A', 'g1']], 'g2'),
      'Y is 1 when A is 1 and B is 0.',
      'Invert B first, then AND it with A.'),
    lv(6, 'Neither', ['A', 'B'], Y, v => 1 - (v.A | v.B), ['OR', 'NOT'],
      sol([['OR', 'A', 'B'], ['NOT', 'g1']], 'g2'),
      'Y is 1 only when both A and B are 0.',
      'NOR is an OR followed by a NOT.'),
    lv(7, 'Twins', ['A', 'B'], Y, v => 1 - (v.A ^ v.B), ['XOR', 'NOT'],
      sol([['XOR', 'A', 'B'], ['NOT', 'g1']], 'g2'),
      'Y is 1 when A and B are equal.',
      'XNOR is the opposite of XOR.'),
    lv(8, 'Triple Lock', ['A', 'B', 'C'], Y, v => v.A & v.B & v.C, ['AND'],
      sol([['AND', 'A', 'B'], ['AND', 'g1', 'C']], 'g2'),
      'Y is 1 only when all three inputs are 1.',
      'AND gates have two inputs. Chain two of them.'),

    lv(9, 'NAND Flip', ['A'], Y, v => 1 - v.A, ['NAND'], sol([['NAND', 'A', 'A']], 'g1'),
      'You only have NAND. Make Y the opposite of A.',
      'Wire the same signal into both inputs of a NAND.'),
    lv(10, 'NAND to AND', ['A', 'B'], Y, v => v.A & v.B, ['NAND'],
      sol([['NAND', 'A', 'B'], ['NAND', 'g1', 'g1']], 'g2'),
      'Build AND using only NAND gates.',
      'AND is NAND followed by an inverter. You already know how to invert with a NAND.'),
    lv(11, 'NAND to OR', ['A', 'B'], Y, v => v.A | v.B, ['NAND'],
      sol([['NAND', 'A', 'A'], ['NAND', 'B', 'B'], ['NAND', 'g1', 'g2']], 'g3'),
      'Build OR using only NAND gates.',
      "Invert both inputs first (De Morgan), then NAND them: (A'·B')' = A + B."),
    lv(12, 'NOR to AND', ['A', 'B'], Y, v => v.A & v.B, ['NOR'],
      sol([['NOR', 'A', 'A'], ['NOR', 'B', 'B'], ['NOR', 'g1', 'g2']], 'g3'),
      'Build AND using only NOR gates.',
      "Invert each input with a NOR, then NOR the results: (A'+B')' = A·B."),
    lv(13, 'Majority', ['A', 'B', 'C'], Y, v => (v.A & v.B) | (v.B & v.C) | (v.C & v.A), ['AND', 'OR'],
      sol([['AND', 'A', 'B'], ['AND', 'B', 'C'], ['AND', 'C', 'A'], ['OR', 'g1', 'g2'], ['OR', 'g4', 'g3']], 'g5'),
      'Y is 1 when at least two of the three inputs are 1.',
      'Look at the pairs A·B, B·C and C·A. Y is 1 if any pair is 1.'),
    lv(14, 'Data Switch', ['S', 'A', 'B'], Y, v => (v.S ? v.B : v.A), ['NOT', 'AND', 'OR'],
      sol([['NOT', 'S'], ['AND', 'A', 'g1'], ['AND', 'B', 'S'], ['OR', 'g2', 'g3']], 'g4'),
      'A 2-to-1 multiplexer: Y = A when S = 0, Y = B when S = 1.',
      "Use S and S' to enable one of the two data inputs: Y = A·S' + B·S."),
    lv(15, 'XOR from NAND', ['A', 'B'], Y, v => v.A ^ v.B, ['NAND'],
      sol([['NAND', 'A', 'B'], ['NAND', 'A', 'g1'], ['NAND', 'B', 'g1'], ['NAND', 'g2', 'g3']], 'g4'),
      'The classic: build XOR using only NAND gates.',
      'Start with NAND(A, B). Feed it back into two more NANDs, one with A and one with B.'),
    lv(16, 'Boss: Parity', ['A', 'B', 'C'], Y, v => v.A ^ v.B ^ v.C, ['AND', 'OR', 'NAND'],
      sol([['OR', 'A', 'B'], ['NAND', 'A', 'B'], ['AND', 'g1', 'g2'], ['OR', 'g3', 'C'], ['NAND', 'g3', 'C'], ['AND', 'g4', 'g5']], 'g6'),
      'Y is 1 when an odd number of inputs are 1.',
      'Build A⊕B first (OR, NAND, AND), then XOR that result with C the same way.'),

    lv(17, 'Half Adder', ['A', 'B'], ['S', 'C'], v => ({ S: v.A ^ v.B, C: v.A & v.B }), ['XOR', 'AND'],
      sol([['XOR', 'A', 'B'], ['AND', 'A', 'B']], { S: 'g1', C: 'g2' }),
      'Add two bits. S is the sum bit, C is the carry bit.',
      'The sum is an XOR. The carry is an AND.'),
    lv(18, 'Gray Code', ['B1', 'B0'], ['G1', 'G0'], v => ({ G1: v.B1, G0: v.B1 ^ v.B0 }), ['XOR'],
      sol([['XOR', 'B1', 'B0']], { G1: 'B1', G0: 'g1' }),
      'Convert a 2-bit binary number to Gray code.',
      'One output needs no gate at all. Wire an input straight to an output.'),
    lv(19, 'Half Subtractor', ['A', 'B'], ['D', 'Bo'], v => ({ D: v.A ^ v.B, Bo: (1 - v.A) & v.B }), ['XOR', 'NOT', 'AND'],
      sol([['XOR', 'A', 'B'], ['NOT', 'A'], ['AND', 'g2', 'B']], { D: 'g1', Bo: 'g3' }),
      'Compute A - B. D is the difference, Bo is the borrow.',
      'Difference = A⊕B. A borrow happens when A is 0 and B is 1.'),
    lv(20, '2-bit Equal', ['A1', 'A0', 'B1', 'B0'], Y, v => (v.A1 === v.B1 && v.A0 === v.B0 ? 1 : 0), ['XOR', 'NOR'],
      sol([['XOR', 'A1', 'B1'], ['XOR', 'A0', 'B0'], ['NOR', 'g1', 'g2']], 'g3'),
      'Y is 1 when the 2-bit numbers A1A0 and B1B0 are identical.',
      'Two bits match when their XOR is 0. Both XORs must be 0.'),
    lv(21, 'Comparator', ['A', 'B'], ['GT', 'EQ', 'LT'],
      v => ({ GT: v.A > v.B ? 1 : 0, EQ: v.A === v.B ? 1 : 0, LT: v.A < v.B ? 1 : 0 }), ['NOT', 'AND', 'NOR'],
      sol([['NOT', 'A'], ['NOT', 'B'], ['AND', 'A', 'g2'], ['AND', 'g1', 'B'], ['NOR', 'g3', 'g4']], { GT: 'g3', EQ: 'g5', LT: 'g4' }),
      'Compare two bits: A > B, A = B, A < B.',
      'A > B means A = 1 and B = 0. They are equal when neither GT nor LT is true.'),
    lv(22, 'Full Adder', ['A', 'B', 'C'], ['S', 'Co'],
      v => ({ S: v.A ^ v.B ^ v.C, Co: (v.A & v.B) | (v.C & (v.A ^ v.B)) }), ['XOR', 'AND', 'OR'],
      sol([['XOR', 'A', 'B'], ['XOR', 'g1', 'C'], ['AND', 'A', 'B'], ['AND', 'g1', 'C'], ['OR', 'g3', 'g4']], { S: 'g2', Co: 'g5' }),
      'Add three bits (A, B and carry-in C). Outputs: sum S and carry-out Co.',
      'Sum = A⊕B⊕C. Carry = A·B + C·(A⊕B). Reuse A⊕B!'),
    lv(23, 'Decoder 2→4', ['A', 'B'], ['D0', 'D1', 'D2', 'D3'],
      v => { const n = v.A * 2 + v.B; return { D0: n === 0 ? 1 : 0, D1: n === 1 ? 1 : 0, D2: n === 2 ? 1 : 0, D3: n === 3 ? 1 : 0 }; },
      ['NOT', 'AND'],
      sol([['NOT', 'A'], ['NOT', 'B'], ['AND', 'g1', 'g2'], ['AND', 'g1', 'B'], ['AND', 'A', 'g2'], ['AND', 'A', 'B']],
        { D0: 'g3', D1: 'g4', D2: 'g5', D3: 'g6' }),
      'Exactly one output lights up: the one matching the binary value of AB (A is the high bit).',
      "Each output is an AND of A or A', and B or B'."),
    lv(24, 'Boss: 2-bit Adder', ['A1', 'A0', 'B1', 'B0'], ['C', 'S1', 'S0'],
      v => { const s = (v.A1 * 2 + v.A0) + (v.B1 * 2 + v.B0); return { C: (s >> 2) & 1, S1: (s >> 1) & 1, S0: s & 1 }; },
      ['XOR', 'AND', 'OR'],
      sol([['XOR', 'A0', 'B0'], ['AND', 'A0', 'B0'], ['XOR', 'A1', 'B1'], ['XOR', 'g3', 'g2'], ['AND', 'A1', 'B1'], ['AND', 'g3', 'g2'], ['OR', 'g5', 'g6']],
        { C: 'g7', S1: 'g4', S0: 'g1' }),
      'Add A1A0 + B1B0. The result is the 3-bit number C S1 S0.',
      'Chain two adders: the carry from the low bit feeds the high bit.'),

    lv(25, 'Exactly One', ['A', 'B', 'C'], Y, v => (v.A + v.B + v.C === 1 ? 1 : 0), ['XOR', 'AND', 'NAND'],
      sol([['XOR', 'A', 'B'], ['XOR', 'g1', 'C'], ['AND', 'A', 'B'], ['NAND', 'g3', 'C'], ['AND', 'g2', 'g4']], 'g5'),
      'Y is 1 when exactly one input is 1.',
      'Parity is 1 for one or three active inputs. Cancel the "all three" case.'),
    lv(26, 'XOR from NOR', ['A', 'B'], Y, v => v.A ^ v.B, ['NOR'],
      sol([['NOR', 'A', 'B'], ['NOR', 'A', 'g1'], ['NOR', 'B', 'g1'], ['NOR', 'g2', 'g3'], ['NOR', 'g4', 'g4']], 'g5'),
      'Build XOR using only NOR gates.',
      'NOR(A, B) is a good first step. The result of the middle stage is XNOR, so you need one more inverter.'),
    lv(27, 'Exactly Two', ['A', 'B', 'C'], Y, v => (v.A + v.B + v.C === 2 ? 1 : 0), ['XOR', 'AND', 'OR', 'NOT'],
      sol([['XOR', 'A', 'B'], ['AND', 'A', 'B'], ['NOT', 'C'], ['AND', 'g1', 'C'], ['AND', 'g2', 'g3'], ['OR', 'g4', 'g5']], 'g6'),
      'Y is 1 when exactly two inputs are 1.',
      'Either one of A,B plus C, or both A and B without C.'),
    lv(28, 'Priority Encoder', ['D3', 'D2', 'D1', 'D0'], ['A1', 'A0', 'V'],
      v => ({ A1: v.D3 | v.D2, A0: v.D3 | ((1 - v.D2) & v.D1), V: v.D3 | v.D2 | v.D1 | v.D0 }), ['OR', 'AND', 'NOT'],
      sol([['OR', 'D3', 'D2'], ['NOT', 'D2'], ['AND', 'D1', 'g2'], ['OR', 'D3', 'g3'], ['OR', 'D1', 'D0'], ['OR', 'g1', 'g5']],
        { A1: 'g1', A0: 'g4', V: 'g6' }),
      'Output the index (A1 A0) of the highest active input. V says if any input is active.',
      'The highest input wins. D1 only counts when D2 and D3 are off.'),
    lv(29, 'Full Subtractor', ['A', 'B', 'C'], ['D', 'Bo'],
      v => ({ D: v.A ^ v.B ^ v.C, Bo: v.A - v.B - v.C < 0 ? 1 : 0 }), ['XOR', 'NOT', 'AND', 'OR'],
      sol([['XOR', 'A', 'B'], ['XOR', 'g1', 'C'], ['NOT', 'A'], ['AND', 'g3', 'B'], ['NOT', 'g1'], ['AND', 'g5', 'C'], ['OR', 'g4', 'g6']],
        { D: 'g2', Bo: 'g7' }),
      'Compute A - B - C (C is the borrow-in). Outputs: difference D and borrow-out Bo.',
      "D = A⊕B⊕C. Bo = A'·B + (A⊕B)'·C."),
    lv(30, 'Final Boss: NAND Adder', ['A', 'B', 'C'], ['S', 'Co'],
      v => ({ S: v.A ^ v.B ^ v.C, Co: (v.A & v.B) | (v.C & (v.A ^ v.B)) }), ['NAND'],
      sol([['NAND', 'A', 'B'], ['NAND', 'A', 'g1'], ['NAND', 'B', 'g1'], ['NAND', 'g2', 'g3'], ['NAND', 'g4', 'C'],
        ['NAND', 'g4', 'g5'], ['NAND', 'C', 'g5'], ['NAND', 'g6', 'g7'], ['NAND', 'g1', 'g5']], { S: 'g8', Co: 'g9' }),
      'A full adder built only from NAND gates. The legendary final puzzle.',
      'Build XOR from four NANDs, twice. The first NAND of each stage also gives you the carry.'),

    /* ---------- World 5: Circuit Lab ---------- */
    lv(31, 'Gray to Binary', ['G2', 'G1', 'G0'], ['B2', 'B1', 'B0'],
      v => ({ B2: v.G2, B1: v.G2 ^ v.G1, B0: v.G2 ^ v.G1 ^ v.G0 }), ['XOR'],
      sol([['XOR', 'G2', 'G1'], ['XOR', 'g1', 'G0']], { B2: 'G2', B1: 'g1', B0: 'g2' }),
      'Convert a 3-bit Gray code back to normal binary.',
      'B2 is just G2. Each lower bit is the previous binary bit XOR the next Gray bit.'),
    lv(32, 'Demux 1→2', ['D', 'S'], ['Y0', 'Y1'], v => ({ Y0: v.D & (1 - v.S), Y1: v.D & v.S }), ['NOT', 'AND'],
      sol([['NOT', 'S'], ['AND', 'D', 'g1'], ['AND', 'D', 'S']], { Y0: 'g2', Y1: 'g3' }),
      'Send the data bit D to Y0 when S = 0, or to Y1 when S = 1. The other output stays 0.',
      "Each output is D AND S' or D AND S."),
    lv(33, 'Gated Switch', ['E', 'S', 'A', 'B'], Y, v => (v.E ? (v.S ? v.B : v.A) : 0), ['NOT', 'AND', 'OR'],
      sol([['NOT', 'S'], ['AND', 'A', 'g1'], ['AND', 'B', 'S'], ['OR', 'g2', 'g3'], ['AND', 'E', 'g4']], 'g5'),
      'A multiplexer with an enable: Y = A or B (chosen by S) while E = 1. When E = 0, Y is 0.',
      'Build the 2-to-1 mux first, then AND the result with E.'),
    lv(34, 'BCD Check', ['D3', 'D2', 'D1', 'D0'], Y, v => ((v.D3 * 8 + v.D2 * 4 + v.D1 * 2 + v.D0) <= 9 ? 1 : 0), ['NOT', 'AND', 'OR'],
      sol([['OR', 'D2', 'D1'], ['AND', 'D3', 'g1'], ['NOT', 'g2']], 'g3'),
      'Y is 1 when the 4-bit number is a valid decimal digit (0 to 9).',
      'The number is too big when D3 = 1 and (D2 or D1) is 1. D0 does not matter.'),
    lv(35, 'Incrementer', ['A1', 'A0'], ['C', 'S1', 'S0'],
      v => { const n = (v.A1 * 2 + v.A0) + 1; return { C: (n >> 2) & 1, S1: (n >> 1) & 1, S0: n & 1 }; }, ['NOT', 'XOR', 'AND'],
      sol([['NOT', 'A0'], ['XOR', 'A1', 'A0'], ['AND', 'A1', 'A0']], { C: 'g3', S1: 'g2', S0: 'g1' }),
      'Add 1 to the 2-bit number A1A0. Output the 3-bit result C S1 S0.',
      "The low bit always flips. The high bit flips when A0 is 1. A carry appears only for 11."),
    lv(36, 'Parity Checker', ['A', 'B', 'C', 'D'], ['Odd', 'Even'],
      v => { const p = v.A ^ v.B ^ v.C ^ v.D; return { Odd: p, Even: 1 - p }; }, ['XOR', 'NOT'],
      sol([['XOR', 'A', 'B'], ['XOR', 'C', 'D'], ['XOR', 'g1', 'g2'], ['NOT', 'g3']], { Odd: 'g3', Even: 'g4' }),
      'Odd lights up when an odd number of inputs are 1. Even is the opposite.',
      'XOR counts ones modulo 2. Combine the inputs in a tree of XOR gates.'),
    lv(37, 'NAND Majority', ['A', 'B', 'C'], Y, v => (v.A + v.B + v.C >= 2 ? 1 : 0), ['NAND'],
      sol([['NAND', 'A', 'B'], ['NAND', 'B', 'C'], ['NAND', 'C', 'A'], ['NAND', 'g1', 'g2'], ['NAND', 'g4', 'g4'], ['NAND', 'g5', 'g3']], 'g6'),
      'Majority of three, using only NAND gates.',
      'NAND(NAND(A,B), NAND(B,C), NAND(C,A)) works, but you only have 2-input gates. Combine two first and re-invert.'),
    lv(38, 'NOR Half Adder', ['A', 'B'], ['S', 'C'], v => ({ S: v.A ^ v.B, C: v.A & v.B }), ['NOR'],
      sol([['NOR', 'A', 'B'], ['NOR', 'A', 'g1'], ['NOR', 'B', 'g1'], ['NOR', 'g2', 'g3'], ['NOR', 'g4', 'g4'], ['NOR', 'g5', 'g1']], { S: 'g5', C: 'g6' }),
      'A half adder built only from NOR gates.',
      'Build XOR from NOR first. The carry is NOR(sum, NOR(A, B)).'),
    lv(39, '2-bit Greater', ['A1', 'A0', 'B1', 'B0'], Y, v => ((v.A1 * 2 + v.A0) > (v.B1 * 2 + v.B0) ? 1 : 0), ['NOT', 'AND', 'OR', 'XNOR'],
      sol([['NOT', 'B1'], ['AND', 'A1', 'g1'], ['XNOR', 'A1', 'B1'], ['NOT', 'B0'], ['AND', 'A0', 'g4'], ['AND', 'g3', 'g5'], ['OR', 'g2', 'g6']], 'g7'),
      'Y is 1 when the number A1A0 is bigger than B1B0.',
      'A wins on the high bit, or the high bits are equal and A wins on the low bit.'),
    lv(40, 'Boss: 2-bit Subtractor', ['A1', 'A0', 'B1', 'B0'], ['Bo', 'D1', 'D0'],
      v => { const d = (v.A1 * 2 + v.A0) - (v.B1 * 2 + v.B0); const m = ((d % 4) + 4) % 4; return { Bo: d < 0 ? 1 : 0, D1: (m >> 1) & 1, D0: m & 1 }; },
      ['NOT', 'XOR', 'AND', 'OR'],
      sol([['XOR', 'A0', 'B0'], ['NOT', 'A0'], ['AND', 'g2', 'B0'], ['XOR', 'A1', 'B1'], ['XOR', 'g4', 'g3'], ['NOT', 'A1'], ['AND', 'g6', 'B1'],
        ['NOT', 'g4'], ['AND', 'g8', 'g3'], ['OR', 'g7', 'g9']], { Bo: 'g10', D1: 'g5', D0: 'g1' }),
      'Compute A1A0 − B1B0. D1 D0 is the difference and Bo says a borrow was needed.',
      'Chain two subtractors: the borrow from the low bit feeds the high bit.'),

    /* ---------- World 6: Chip Designer ---------- */
    lv(41, 'XNOR from NOR', ['A', 'B'], Y, v => 1 - (v.A ^ v.B), ['NOR'],
      sol([['NOR', 'A', 'B'], ['NOR', 'A', 'g1'], ['NOR', 'B', 'g1'], ['NOR', 'g2', 'g3']], 'g4'),
      'Build XNOR using only NOR gates.',
      'It is the same shape as XOR from NAND, with NOR gates.'),
    lv(42, 'Mux from NAND', ['S', 'A', 'B'], Y, v => (v.S ? v.B : v.A), ['NAND'],
      sol([['NAND', 'S', 'S'], ['NAND', 'A', 'g1'], ['NAND', 'B', 'S'], ['NAND', 'g2', 'g3']], 'g4'),
      'A 2-to-1 multiplexer made of four NAND gates: Y = A when S = 0, Y = B when S = 1.',
      "NAND-NAND is AND-OR. Invert S with a NAND, then NAND (A, S') and (B, S), and NAND those."),
    lv(43, 'Supermajority', ['A', 'B', 'C', 'D'], Y, v => (v.A + v.B + v.C + v.D >= 3 ? 1 : 0), ['AND', 'OR'],
      sol([['AND', 'A', 'B'], ['OR', 'C', 'D'], ['AND', 'g1', 'g2'], ['AND', 'C', 'D'], ['OR', 'A', 'B'], ['AND', 'g4', 'g5'], ['OR', 'g3', 'g6']], 'g7'),
      'Y is 1 when at least three of the four inputs are 1.',
      'Either A and B are both on and one of C, D is on, or the other way around.'),
    lv(44, 'Enabled Decoder', ['E', 'A', 'B'], ['D0', 'D1', 'D2', 'D3'],
      v => { const n = v.A * 2 + v.B; return { D0: v.E && n === 0 ? 1 : 0, D1: v.E && n === 1 ? 1 : 0, D2: v.E && n === 2 ? 1 : 0, D3: v.E && n === 3 ? 1 : 0 }; },
      ['NOT', 'AND'],
      sol([['NOT', 'A'], ['NOT', 'B'], ['AND', 'E', 'g1'], ['AND', 'E', 'A'], ['AND', 'g3', 'g2'], ['AND', 'g3', 'B'], ['AND', 'g4', 'g2'], ['AND', 'g4', 'B']],
        { D0: 'g5', D1: 'g6', D2: 'g7', D3: 'g8' }),
      'A 2-to-4 decoder that only works while E = 1. With E = 0 all outputs are 0.',
      'Do not AND E four times. Combine E with A or A\' once, then reuse those two signals.'),
    lv(45, 'Crossbar', ['S', 'A', 'B'], ['X', 'Y'], v => (v.S ? { X: v.B, Y: v.A } : { X: v.A, Y: v.B }), ['NOT', 'AND', 'OR', 'XOR'],
      sol([['XOR', 'A', 'B'], ['AND', 'g1', 'S'], ['XOR', 'A', 'g2'], ['XOR', 'B', 'g2']], { X: 'g3', Y: 'g4' }),
      'Pass A and B straight through when S = 0. Swap them when S = 1.',
      'XOR-ing both bits with (A⊕B) swaps them. Do it only when S = 1.'),
    lv(46, '2-bit Multiplier', ['A1', 'A0', 'B1', 'B0'], ['P3', 'P2', 'P1', 'P0'],
      v => { const p = (v.A1 * 2 + v.A0) * (v.B1 * 2 + v.B0); return { P3: (p >> 3) & 1, P2: (p >> 2) & 1, P1: (p >> 1) & 1, P0: p & 1 }; }, ['AND', 'XOR'],
      sol([['AND', 'A0', 'B0'], ['AND', 'A1', 'B0'], ['AND', 'A0', 'B1'], ['XOR', 'g2', 'g3'], ['AND', 'A1', 'B1'], ['AND', 'g2', 'g3'], ['XOR', 'g5', 'g6'], ['AND', 'g5', 'g6']],
        { P0: 'g1', P1: 'g4', P2: 'g7', P3: 'g8' }),
      'Multiply A1A0 × B1B0. The product is the 4-bit number P3 P2 P1 P0.',
      'Make the four partial products with AND gates, then add the middle ones with a half adder, and so on.'),
    lv(47, '2-bit Comparator', ['A1', 'A0', 'B1', 'B0'], ['GT', 'EQ', 'LT'],
      v => { const a = v.A1 * 2 + v.A0, b = v.B1 * 2 + v.B0; return { GT: a > b ? 1 : 0, EQ: a === b ? 1 : 0, LT: a < b ? 1 : 0 }; },
      ['NOT', 'AND', 'OR', 'XNOR', 'NOR'],
      sol([['XNOR', 'A1', 'B1'], ['XNOR', 'A0', 'B0'], ['AND', 'g1', 'g2'], ['NOT', 'B1'], ['AND', 'A1', 'g4'], ['NOT', 'B0'], ['AND', 'A0', 'g6'],
        ['AND', 'g1', 'g7'], ['OR', 'g5', 'g8'], ['NOR', 'g9', 'g3']], { GT: 'g9', EQ: 'g3', LT: 'g10' }),
      'Compare A1A0 with B1B0: greater, equal or less.',
      'EQ needs both bit pairs equal. LT is whatever is left when neither GT nor EQ is true.'),
    lv(48, 'Final Boss: Population Count', ['A', 'B', 'C', 'D'], ['C2', 'C1', 'C0'],
      v => { const n = v.A + v.B + v.C + v.D; return { C2: (n >> 2) & 1, C1: (n >> 1) & 1, C0: n & 1 }; }, ['XOR', 'AND'],
      sol([['XOR', 'A', 'B'], ['AND', 'A', 'B'], ['XOR', 'C', 'D'], ['AND', 'C', 'D'], ['XOR', 'g1', 'g3'], ['AND', 'g1', 'g3'],
        ['XOR', 'g2', 'g4'], ['XOR', 'g7', 'g6'], ['AND', 'g2', 'g4']], { C2: 'g9', C1: 'g8', C0: 'g5' }),
      'Count how many of the four inputs are 1. Output the count as the 3-bit number C2 C1 C0.',
      'Use two half adders to add the pairs, then add their sums and merge the carries.')
  ];

  function sandboxLevel(n) {
    n = Math.max(2, Math.min(4, n || 3));
    return {
      id: 'lab', key: 'LAB' + n, sandbox: true, title: 'Free Lab',
      inputs: ['A', 'B', 'C', 'D'].slice(0, n), outputs: ['Y'], fn: () => 0,
      gates: ALL_GATES.slice(), par: 0, hints: [], story: 'No targets here. Build anything and watch the signals flow.'
    };
  }

  /* ---------- truth tables & board evaluation ----------
     board = { gates:[{id,type,x,y}], conn:{ 'g:3:0':'in:A', 'out:Y':'g:3' }, nextId }
     sources: 'in:NAME' or 'g:ID'   targets: 'g:ID:idx' or 'out:NAME'          */
  function expectedOf(level, vals) {
    const r = level.fn(vals), out = {};
    if (r && typeof r === 'object') level.outputs.forEach(n => { out[n] = r[n] ? 1 : 0; });
    else out[level.outputs[0]] = r ? 1 : 0;
    return out;
  }

  function rowsOf(level) {
    const k = level.inputs.length, rows = [];
    for (let i = 0; i < (1 << k); i++) {
      const vals = {};
      level.inputs.forEach((n, j) => { vals[n] = (i >> (k - 1 - j)) & 1; });
      rows.push({ vals: vals, expected: level.sandbox ? null : expectedOf(level, vals) });
    }
    return rows;
  }

  function findGate(board, id) { return board.gates.find(g => g.id === id); }

  function evalSrc(board, src, vals, stack) {
    if (!src) return null;
    if (src.indexOf('in:') === 0) return vals[src.slice(3)] ? 1 : 0;
    const id = +src.slice(2);
    if (stack.has(id)) return null;
    const g = findGate(board, id);
    if (!g) return null;
    stack.add(id);
    const def = GATES[g.type], args = [];
    for (let i = 0; i < def.in; i++) {
      const r = evalSrc(board, board.conn['g:' + id + ':' + i], vals, stack);
      if (r === null) { stack.delete(id); return null; }
      args.push(r);
    }
    stack.delete(id);
    return def.fn.apply(null, args) ? 1 : 0;
  }

  function evalOut(board, vals, name) {
    return evalSrc(board, board.conn['out:' + name], vals, new Set());
  }

  function checkBoard(board, level) {
    let ok = !level.sandbox;
    const rows = rowsOf(level).map(r => {
      const got = {};
      level.outputs.forEach(n => {
        got[n] = evalOut(board, r.vals, n);
        if (r.expected && got[n] !== r.expected[n]) ok = false;
      });
      return { vals: r.vals, expected: r.expected, got: got };
    });
    return { rows: rows, ok: ok };
  }

  function usedGates(board, level) {
    const seen = new Set();
    function walk(src) {
      if (!src || src.indexOf('in:') === 0) return;
      const id = +src.slice(2);
      if (seen.has(id)) return;
      const g = findGate(board, id);
      if (!g) return;
      seen.add(id);
      for (let i = 0; i < GATES[g.type].in; i++) walk(board.conn['g:' + id + ':' + i]);
    }
    level.outputs.forEach(n => walk(board.conn['out:' + n]));
    return Array.from(seen);
  }

  function dependsOn(board, src, gateId) {
    const seen = new Set();
    function walk(s) {
      if (!s || s.indexOf('in:') === 0) return false;
      const id = +s.slice(2);
      if (id === gateId) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      const g = findGate(board, id);
      if (!g) return false;
      for (let i = 0; i < GATES[g.type].in; i++) if (walk(board.conn['g:' + id + ':' + i])) return true;
      return false;
    }
    return walk(src);
  }

  function exprOf(board, src, stack) {
    stack = stack || new Set();
    if (!src) return '?';
    if (src.indexOf('in:') === 0) return src.slice(3);
    const id = +src.slice(2);
    if (stack.has(id)) return '↻';
    const g = findGate(board, id);
    if (!g) return '?';
    stack.add(id);
    const a = [];
    for (let i = 0; i < GATES[g.type].in; i++) a.push(exprOf(board, board.conn['g:' + id + ':' + i], stack));
    stack.delete(id);
    switch (g.type) {
      case 'NOT':  return a[0] + "'";
      case 'AND':  return '(' + a[0] + '·' + a[1] + ')';
      case 'OR':   return '(' + a[0] + '+' + a[1] + ')';
      case 'XOR':  return '(' + a[0] + '⊕' + a[1] + ')';
      case 'XNOR': return '(' + a[0] + '⊕' + a[1] + ")'";
      case 'NAND': return '(' + a[0] + '·' + a[1] + ")'";
      case 'NOR':  return '(' + a[0] + '+' + a[1] + ")'";
    }
    return '?';
  }

  function stripOuter(s) {
    if (s.length > 2 && s[0] === '(' && s[s.length - 1] === ')') {
      let d = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') d++;
        else if (s[i] === ')') { d--; if (d === 0 && i < s.length - 1) return s; }
      }
      return s.slice(1, -1);
    }
    return s;
  }

  function starsFor(used, par) {
    const slack = Math.max(1, Math.floor(par / 3));
    if (used <= par) return 3;
    if (used <= par + slack) return 2;
    return 1;
  }

  /* ---------- dates, rng ---------- */
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function shuffle(arr, rng) {
    rng = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- daily puzzle ---------- */
  function genTree(rng, inputs, pool, n) {
    if (n === 0) return { v: inputs[Math.floor(rng() * inputs.length)] };
    const t = pool[Math.floor(rng() * pool.length)];
    if (t === 'NOT') return { t: t, a: genTree(rng, inputs, pool, n - 1) };
    const l = Math.floor(rng() * n);
    return { t: t, a: genTree(rng, inputs, pool, l), b: genTree(rng, inputs, pool, n - 1 - l) };
  }
  function treeEval(node, vals) {
    if (node.v) return vals[node.v] ? 1 : 0;
    const x = treeEval(node.a, vals);
    return GATES[node.t].fn(x, node.b ? treeEval(node.b, vals) : 0) ? 1 : 0;
  }
  function treeLeaves(node, set) {
    if (node.v) { set.add(node.v); return; }
    treeLeaves(node.a, set);
    if (node.b) treeLeaves(node.b, set);
  }
  function treeBad(node) {
    if (node.v) return false;
    if (node.t === 'NOT' && node.a.t === 'NOT') return true;
    if (node.b && JSON.stringify(node.a) === JSON.stringify(node.b)) return true;
    return treeBad(node.a) || (node.b ? treeBad(node.b) : false);
  }
  function treeToSol(tree) {
    const g = [];
    function walk(n) {
      if (n.v) return n.v;
      const a = walk(n.a);
      if (n.t === 'NOT') { g.push(['NOT', a]); return 'g' + g.length; }
      const b = walk(n.b);
      g.push([n.t, a, b]);
      return 'g' + g.length;
    }
    const out = walk(tree);
    return sol(g, out);
  }

  function dailyLevel(date) {
    const inputs = ['A', 'B', 'C'];
    const rng = mulberry32(hashStr('lgr2-' + date));
    let tree = null;
    for (let attempt = 0; attempt < 500 && !tree; attempt++) {
      const n = 3 + Math.floor(rng() * 3);
      const t = genTree(rng, inputs, GATE_ORDER, n);
      if (treeBad(t)) continue;
      const used = new Set(); treeLeaves(t, used);
      if (used.size < 3) continue;
      let ones = 0;
      for (let i = 0; i < 8; i++) ones += treeEval(t, { A: (i >> 2) & 1, B: (i >> 1) & 1, C: i & 1 });
      if (ones === 0 || ones === 8) continue;
      tree = t;
    }
    if (!tree) tree = { t: 'OR', a: { t: 'AND', a: { v: 'A' }, b: { v: 'B' } }, b: { t: 'XOR', a: { v: 'B' }, b: { v: 'C' } } };
    const s = treeToSol(tree);
    return {
      id: 'daily', key: 'D' + date, date: date, title: 'Daily Puzzle',
      inputs: inputs, outputs: ['Y'], fn: v => treeEval(tree, v),
      gates: GATE_ORDER.slice(), par: s.g.length, sol: s,
      story: "Today's puzzle is the same for everyone. Target: " + s.g.length + ' gates.',
      hint: "Today's puzzle can be solved with " + s.g.length + ' gates.',
      hints: makeHints("Today's puzzle can be solved with " + s.g.length + ' gates.', s)
    };
  }

  /* ---------- Quick Fire ---------- */
  function genQF(rng, n, pool, noNot) {
    if (n === 0) return { k: rng() < 0.5 ? 0 : 1 };
    let t;
    do { t = pool[Math.floor(rng() * pool.length)]; } while (noNot && t === 'NOT');
    if (t === 'NOT') return { t: t, a: genQF(rng, n - 1, pool, true) };
    const l = Math.floor(rng() * n);
    return { t: t, a: genQF(rng, l, pool, false), b: genQF(rng, n - 1 - l, pool, false) };
  }
  function qfEval(node) {
    if ('k' in node) return node.k;
    const x = qfEval(node.a);
    return GATES[node.t].fn(x, node.b ? qfEval(node.b) : 0) ? 1 : 0;
  }
  function qfRound(round, rng, last) {
    rng = rng || Math.random;
    const n = Math.min(1 + Math.floor(round / 3), 4);
    const pool = round < 3 ? ['AND', 'OR', 'NOT']
      : round < 6 ? ['AND', 'OR', 'NOT', 'NAND', 'NOR']
      : ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];
    let r = null;
    for (let i = 0; i < 20; i++) {
      const t = genQF(rng, n, pool, false);
      const a = qfEval(t);
      r = { tree: t, answer: a, gates: n };
      if (a !== last || rng() < 0.25) break;
    }
    return r;
  }

  /* ---------- Bit Flip ---------- */
  function bfRound(round, rng) {
    rng = rng || Math.random;
    const bits = round < 4 ? 4 : round < 9 ? 6 : 8;
    const max = (1 << bits) - 1;
    const target = 1 + Math.floor(rng() * max);
    const type = rng() < 0.55 ? 'set' : 'read';
    let choices = null;
    if (type === 'read') {
      const idx = shuffle(Array.from({ length: bits }, (_, i) => i), rng).slice(0, 3);
      choices = shuffle([target].concat(idx.map(i => target ^ (1 << i))), rng);
    }
    return { bits: bits, target: target, type: type, choices: choices };
  }

  /* ---------- Gate Match ---------- */
  const MATCH_CFG = {
    easy:   { pairs: 4, label: 'Easy',   note: 'Symbol ↔ name' },
    medium: { pairs: 6, label: 'Medium', note: 'Symbol ↔ truth string' },
    hard:   { pairs: 7, label: 'Hard',   note: 'Symbol ↔ Boolean expression' }
  };
  function matchDeck(diff, rng) {
    const cards = [];
    function pair(g, text, kind) {
      cards.push({ pid: g + '-' + kind, kind: 'sym', gate: g });
      cards.push({ pid: g + '-' + kind, kind: kind, gate: g, text: text });
    }
    if (diff === 'easy') ['AND', 'OR', 'NOT', 'NAND'].forEach(g => pair(g, g, 'name'));
    else if (diff === 'medium') ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].forEach(g => pair(g, truthString(g), 'tt'));
    else ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'].forEach(g => pair(g, GATES[g].expr, 'expr'));
    return shuffle(cards, rng);
  }
  function matchStars(moves, pairs) {
    if (moves <= Math.ceil(pairs * 1.6)) return 3;
    if (moves <= Math.ceil(pairs * 2.4)) return 2;
    return 1;
  }

  /* ---------- named trees: Endless, Bug Hunt, Table Fill, Circuit ID ---------- */
  const BIN = ['AND', 'OR', 'NAND', 'NOR', 'XOR'];

  function cloneTree(n) {
    if (n.v) return { v: n.v };
    return n.b ? { t: n.t, a: cloneTree(n.a), b: cloneTree(n.b) } : { t: n.t, a: cloneTree(n.a) };
  }
  // gates of a tree in post-order (children first): index + 1 is the gate id used by the UI
  function gateList(tree) {
    const out = [];
    (function walk(n) {
      if (n.v) return;
      walk(n.a); if (n.b) walk(n.b);
      out.push(n);
    })(tree);
    return out;
  }
  function treeExpr(n) {
    if (n.v) return n.v;
    const a = treeExpr(n.a);
    if (n.t === 'NOT') return a + "'";
    const b = treeExpr(n.b);
    switch (n.t) {
      case 'AND':  return '(' + a + '·' + b + ')';
      case 'OR':   return '(' + a + '+' + b + ')';
      case 'XOR':  return '(' + a + '⊕' + b + ')';
      case 'NAND': return '(' + a + '·' + b + ")'";
      case 'NOR':  return '(' + a + '+' + b + ")'";
    }
    return '?';
  }
  const treeText = n => stripOuter(treeExpr(n));
  function valsOf(inputs, i) {
    const k = inputs.length, v = {};
    inputs.forEach((n, j) => { v[n] = (i >> (k - 1 - j)) & 1; });
    return v;
  }
  function sigOf(tree, inputs) {
    let s = '';
    for (let i = 0; i < (1 << inputs.length); i++) s += treeEval(tree, valsOf(inputs, i));
    return s;
  }
  function dependsAll(tree, inputs) {
    const k = inputs.length;
    for (let j = 0; j < k; j++) {
      let dep = false;
      for (let i = 0; i < (1 << k) && !dep; i++) {
        const v = valsOf(inputs, i), w = Object.assign({}, v);
        w[inputs[j]] = 1 - v[inputs[j]];
        if (treeEval(tree, v) !== treeEval(tree, w)) dep = true;
      }
      if (!dep) return false;
    }
    return true;
  }
  // drawing tree for Draw.treeSvg: leaves {name,k}, gates {t,a,b,id}
  function bindTree(tree, vals) {
    let id = 0;
    function go(n) {
      if (n.v) return { name: n.v, k: vals ? (vals[n.v] ? 1 : 0) : null };
      const a = go(n.a), b = n.b ? go(n.b) : null;
      const o = { t: n.t, a: a, id: ++id };
      if (b) o.b = b;
      return o;
    }
    return go(tree);
  }
  function pickPool(round, a, b) {
    return round < a ? ['AND', 'OR', 'NOT'] : round < b ? ['AND', 'OR', 'NOT', 'NAND', 'NOR'] : GATE_ORDER;
  }
  function usedSet(tree) { const s = new Set(); treeLeaves(tree, s); return s; }

  /* Endless: random build puzzles */
  const ENDLESS = {
    easy:   { label: 'Easy',   inputs: ['A', 'B', 'C'],      gates: [3, 4] },
    medium: { label: 'Medium', inputs: ['A', 'B', 'C'],      gates: [5, 6] },
    hard:   { label: 'Hard',   inputs: ['A', 'B', 'C', 'D'], gates: [6, 8] }
  };
  function randomLevel(seed, diff) {
    const cfg = ENDLESS[diff] || ENDLESS.easy;
    diff = ENDLESS[diff] ? diff : 'easy';
    const rng = mulberry32((seed | 0) ^ 0x5bd1e995);
    const inputs = cfg.inputs;
    let tree = null;
    for (let attempt = 0; attempt < 1500 && !tree; attempt++) {
      const n = cfg.gates[0] + Math.floor(rng() * (cfg.gates[1] - cfg.gates[0] + 1));
      const t = genTree(rng, inputs, GATE_ORDER, n);
      if (treeBad(t) || usedSet(t).size < inputs.length) continue;
      const sig = sigOf(t, inputs);
      if (sig.indexOf('0') < 0 || sig.indexOf('1') < 0 || !dependsAll(t, inputs)) continue;
      tree = t;
    }
    if (!tree) tree = { t: 'OR', a: { t: 'AND', a: { v: 'A' }, b: { v: 'B' } }, b: { t: 'XOR', a: { v: 'B' }, b: { v: 'C' } } };
    const s = treeToSol(tree);
    const hint = 'This puzzle can be solved with ' + s.g.length + ' gates.';
    return {
      id: 'rand', key: 'R' + seed, seed: seed, diff: diff, title: 'Endless · ' + cfg.label,
      inputs: usedSet(tree).size < inputs.length ? ['A', 'B', 'C'] : inputs.slice(), outputs: ['Y'], fn: v => treeEval(tree, v),
      gates: GATE_ORDER.slice(), par: s.g.length, sol: s,
      story: 'A random puzzle. Target: ' + s.g.length + ' gates. Solve it, then take another!',
      hint: hint, hints: makeHints(hint, s)
    };
  }

  /* Bug Hunt: one gate does not match the spec */
  function bhRound(round, rng) {
    rng = rng || Math.random;
    const n = Math.min(3 + Math.floor(round / 3), 6);
    const pool = pickPool(round, 3, 6);
    const inputs = ['A', 'B', 'C'];
    const binPool = BIN.filter(t => pool.indexOf(t) !== -1);
    for (let att = 0; att < 300; att++) {
      const tree = genTree(rng, inputs, pool, n);
      if (treeBad(tree)) continue;
      const list = gateList(tree), bins = list.filter(g => g.b);
      if (!bins.length || usedSet(tree).size < 2) continue;
      const vals = {};
      inputs.forEach(k => { vals[k] = rng() < 0.5 ? 1 : 0; });
      const target = bins[Math.floor(rng() * bins.length)], idx = list.indexOf(target);
      const opts = binPool.filter(t => t !== target.t);
      if (!opts.length) continue;
      const wrong = cloneTree(tree);
      gateList(wrong)[idx].t = opts[Math.floor(rng() * opts.length)];
      const exp = treeEval(tree, vals), got = treeEval(wrong, vals);
      if (exp === got) continue;
      return { spec: treeText(tree), tree: bindTree(wrong, vals), faultyId: idx + 1, expected: exp, shown: got, gates: list.length };
    }
    const t = { t: 'AND', a: { v: 'A' }, b: { t: 'OR', a: { v: 'B' }, b: { v: 'C' } } };
    const w = cloneTree(t); w.t = 'OR';
    const vals = { A: 0, B: 1, C: 0 };
    return { spec: treeText(t), tree: bindTree(w, vals), faultyId: 2, expected: treeEval(t, vals), shown: treeEval(w, vals), gates: 2 };
  }

  /* Table Fill: complete the truth table of a circuit */
  function tfRound(round, rng) {
    rng = rng || Math.random;
    const k = round < 3 ? 2 : 3;
    const inputs = ['A', 'B', 'C'].slice(0, k);
    const n = Math.min(2 + Math.floor(round / 3), 5);
    const pool = pickPool(round, 2, 5);
    for (let att = 0; att < 400; att++) {
      const tree = genTree(rng, inputs, pool, n);
      if (treeBad(tree) || usedSet(tree).size < k) continue;
      const sig = sigOf(tree, inputs);
      if (sig.indexOf('0') < 0 || sig.indexOf('1') < 0) continue;
      return { inputs: inputs, tree: bindTree(tree, null), expr: treeText(tree), out: sig.split('').map(Number), gates: n };
    }
    const t = { t: 'XOR', a: { v: 'A' }, b: { v: 'B' } };
    return { inputs: ['A', 'B'], tree: bindTree(t, null), expr: treeText(t), out: [0, 1, 1, 0], gates: 1 };
  }

  /* Circuit ID: pick the expression that matches the circuit */
  function mutateTree(tree, inputs, rng) {
    const t = cloneTree(tree), nodes = [];
    (function walk(n) { nodes.push(n); if (!n.v) { walk(n.a); if (n.b) walk(n.b); } })(t);
    const n = nodes[Math.floor(rng() * nodes.length)];
    if (n.v) {
      const old = n.v;
      if (rng() < 0.5) {
        const others = inputs.filter(x => x !== old);
        n.v = others[Math.floor(rng() * others.length)];
      } else { delete n.v; n.t = 'NOT'; n.a = { v: old }; }
    } else if (n.t === 'NOT') {
      const c = n.a;
      delete n.a; delete n.t;
      Object.keys(c).forEach(key => { n[key] = c[key]; });
    } else {
      const opts = BIN.filter(x => x !== n.t);
      n.t = opts[Math.floor(rng() * opts.length)];
    }
    return t;
  }
  function ciRound(round, rng) {
    rng = rng || Math.random;
    const n = Math.min(2 + Math.floor(round / 3), 5);
    const pool = pickPool(round, 2, 5);
    const inputs = ['A', 'B', 'C'];
    for (let att = 0; att < 300; att++) {
      const tree = genTree(rng, inputs, pool, n);
      if (treeBad(tree) || usedSet(tree).size < 2) continue;
      const sigs = new Set([sigOf(tree, inputs)]), strs = new Set([treeText(tree)]);
      const opts = [{ text: treeText(tree), ok: true }];
      for (let k = 0; k < 120 && opts.length < 4; k++) {
        const m = mutateTree(tree, inputs, rng), s = sigOf(m, inputs), e = treeText(m);
        if (sigs.has(s) || strs.has(e)) continue;
        sigs.add(s); strs.add(e); opts.push({ text: e, ok: false });
      }
      if (opts.length < 4) continue;
      const sh = shuffle(opts, rng);
      return { tree: bindTree(tree, null), options: sh.map(o => o.text), answer: sh.findIndex(o => o.ok), expr: treeText(tree), gates: n };
    }
    const t = { t: 'AND', a: { v: 'A' }, b: { v: 'B' } };
    return { tree: bindTree(t, null), options: ["A·B", "A+B", "(A·B)'", "A⊕B"], answer: 0, expr: 'A·B', gates: 1 };
  }

  /* ---------- ranks ---------- */
  const RANKS = [
    { xp: 0,    name: 'Rookie',     icon: '🔌' },
    { xp: 60,   name: 'Resistor',   icon: '🔋' },
    { xp: 150,  name: 'Diode',      icon: '💡' },
    { xp: 300,  name: 'Transistor', icon: '📟' },
    { xp: 500,  name: 'Logic Gate', icon: '🧩' },
    { xp: 800,  name: 'Flip-Flop',  icon: '💾' },
    { xp: 1200, name: 'Microchip',  icon: '🖥️' },
    { xp: 1800, name: 'Architect',  icon: '🧠' }
  ];
  function rankOf(xp) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k;
    const cur = RANKS[i], nxt = RANKS[i + 1] || null;
    return { idx: i, name: cur.name, icon: cur.icon, base: cur.xp, next: nxt ? nxt.xp : null, nextName: nxt ? nxt.name : null };
  }

  const API = {
    GATES, GATE_ORDER, ALL_GATES, WORLDS, LEVELS, truthString,
    sol, solToBoard, netlist, sandboxLevel,
    expectedOf, rowsOf, evalSrc, evalOut, checkBoard, usedGates, dependsOn,
    exprOf, stripOuter, starsFor, dateKey, dailyLevel, mulberry32, shuffle,
    genQF, qfEval, qfRound, bfRound, MATCH_CFG, matchDeck, matchStars, RANKS, rankOf, treeEval,
    ENDLESS, randomLevel, bhRound, tfRound, ciRound, treeText, sigOf, cloneTree, gateList
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LGR = API;
})(typeof window !== 'undefined' ? window : globalThis);
