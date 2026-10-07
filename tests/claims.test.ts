// Every claim the learning guide makes about an algorithm, checked on a real cube model.
import { describe, expect, it } from 'vitest';
import { applyMoves, CORNER_SLOTS, CubeState, EDGE_SLOTS, Face, isSolved, locate, parseMoves, slotSolved, solvedState } from '../src/cube/cube';
import { ALG, headlights, OLL_CORNERS, PLL_CORNERS, PLL_EDGES, solve, topRow } from '../src/cube/solver';
import { FAST_STAGES, STAGES } from '../src/content/learn';
import { scramble } from './helpers';

const solved = solvedState();
const run = (alg: string, s: CubeState = solved) => applyMoves(s, parseMoves(alg));
const changedSlots = (s: CubeState) => [...EDGE_SLOTS, ...CORNER_SLOTS].filter((x) => !slotSolved(s, x.name)).map((x) => x.name).sort();

describe('claims in the guide', () => {
  it('every demo in the guide ends with a solved cube', () => {
    for (const st of [...STAGES, ...FAST_STAGES]) for (const a of st.algorithms) {
      const s = run(a.demo.play, a.demo.setup ? run(a.demo.setup) : solved);
      expect(isSolved(s), `${st.name}: ${a.name}`).toBe(true);
    }
  });

  it("R' D' R D six times and R U R' U' six times do nothing", () => {
    expect(isSolved(run(Array(6).fill(ALG.cornerTwist).join(' ')))).toBe(true);
    expect(isSolved(run(Array(6).fill(ALG.cornerInsert).join(' ')))).toBe(true);
  });

  it('the yellow-edges algorithm swaps only the front and left top edges, and keeps the first two layers', () => {
    const s = run(ALG.yellowEdges);
    const edges = changedSlots(s).filter((n) => n.length === 2);
    expect(edges).toEqual(['UF', 'UL']);
    expect(changedSlots(s).filter((n) => !n.startsWith('U'))).toEqual([]);
  });

  it('the corner cycle keeps the top front right corner and moves the other three top corners', () => {
    const s = run(ALG.cornerCycle);
    expect(changedSlots(s)).toEqual(['UBL', 'UBR', 'UFL']);
  });

  it('the yellow-cross algorithm turns the L at the back left into a line, and the dot into an L', () => {
    // Look only at which top edges show yellow, over many real last-layer cases.
    const seen = { dotToL: 0, lToLine: 0, lineToCross: 0 };
    for (let seed = 1; seed <= 400; seed++) {
      for (const st of solve(applyMoves(solved, scramble(seed))).steps) {
        if (st.stage !== 'yellowCross') continue;
        const after = applyMoves(st.stateBefore, st.moves);
        const up = (s: CubeState) => ['UF', 'UR', 'UB', 'UL'].filter((n) => s[EDGE_SLOTS.find((e) => e.name === n)!.stickers[0]] === 'yellow');
        const n = up(after).length;
        if (st.title.endsWith('dot')) { expect(n).toBe(2); expect(up(after).sort().join()).not.toMatch(/UB,UF|UL,UR/); seen.dotToL++; }
        if (st.title.endsWith('the L')) { expect(n).toBe(2); expect(['UB,UF', 'UL,UR']).toContain(up(after).sort().join()); seen.lToLine++; }
        if (st.title.endsWith('line')) { expect(n).toBe(4); seen.lineToCross++; }
      }
    }
    expect(seen.dotToL).toBeGreaterThan(0);
    expect(seen.lToLine).toBeGreaterThan(0);
    expect(seen.lineToCross).toBeGreaterThan(0);
  });

  it('corner inserts take 1, 3 or 5 rounds; corner twists take 2 or 4 rounds', () => {
    const inserts = new Set<number>();
    const twists = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      for (const st of solve(applyMoves(solved, scramble(seed))).steps) {
        for (const p of st.parts) {
          if (p.moves.join(' ') === ALG.cornerInsert) inserts.add(p.repeat);
          if (p.moves.join(' ') === ALG.cornerTwist) twists.add(p.repeat);
        }
      }
    }
    expect([...inserts].sort()).toEqual([1, 3, 5]);
    expect([...twists].sort()).toEqual([2, 4]);
  });

  it('an opposite pair of matching yellow edges always becomes a neighbor pair or done', () => {
    let opposite = 0;
    for (let seed = 1; seed <= 1500; seed++) {
      const steps = solve(applyMoves(solved, scramble(seed))).steps;
      steps.forEach((st, i) => {
        if (st.title !== 'Yellow edges: opposite pair') return;
        opposite++;
        const next = steps[i + 1];
        expect(['Yellow edges: find two that match', 'Yellow edges: swap two', 'Yellow edges: line up the top']).toContain(next.title);
        // It must never be followed by the opposite case again.
      });
    }
    expect(opposite).toBeGreaterThan(0);
  });

  it('the middle-layer moves only change the top layer and their target spot', () => {
    const r = changedSlots(run(ALG.middleRight)).filter((n) => !n.startsWith('U'));
    expect(r).toEqual(['FR']);
    const l = changedSlots(run(ALG.middleLeft)).filter((n) => !n.startsWith('U'));
    expect(l).toEqual(['FL']);
  });

  it('the corner pop and insert never touch the white cross or other bottom corners', () => {
    for (const alg of [ALG.cornerPop, ALG.cornerInsert]) {
      const bottom = changedSlots(run(alg)).filter((n) => n.startsWith('D'));
      expect(bottom).toEqual(['DFR']);
    }
  });
});

describe('claims in the fast-method guide', () => {
  const f2l = (alg: string) => {
    const s = run(alg.split(' ').reverse().map((m) => (m.endsWith("'") ? m[0] : m.endsWith('2') ? m : m + "'")).join(' '));
    const c = locate(s, ['white', 'green', 'orange']);
    const e = locate(s, ['green', 'orange']);
    return { corner: c.slot, white: c.faceOf.white, edge: e.slot };
  };

  it('describes where the pair pieces start in each F2L demo', () => {
    expect(f2l("R U R'")).toEqual({ corner: 'UFR', white: 'R', edge: 'UB' });
    expect(f2l("F' U' F")).toEqual({ corner: 'UFR', white: 'F', edge: 'UL' });
    expect(f2l("U R U' R'")).toEqual({ corner: 'UFR', white: 'F', edge: 'UR' });
    expect(f2l("R U2 R' U' R U R'")).toEqual({ corner: 'UFR', white: 'U', edge: 'UR' });
  });

  it('every last-layer algorithm keeps the first two layers', () => {
    for (const a of [...OLL_CORNERS, ...PLL_CORNERS, ...PLL_EDGES]) {
      expect(changedSlots(run(a.alg)).filter((n) => !n.startsWith('U')), a.name).toEqual([]);
    }
  });

  it('the yellow-face algorithms keep the yellow cross, and the last-layer algorithms keep the yellow face', () => {
    for (const a of OLL_CORNERS) expect(['UF', 'UR', 'UB', 'UL'].every((n) => run(a.alg)[EDGE_SLOTS.find((e) => e.name === n)!.stickers[0]] === 'yellow')).toBe(true);
    for (const a of [...PLL_CORNERS, ...PLL_EDGES]) expect(run(a.alg).slice(0, 9).every((c) => c === 'yellow'), a.name).toBe(true);
  });

  it('the T-perm case has headlights on the left, the Y-perm case has none, and edge cases keep the corners', () => {
    const inv = (alg: string) => alg.split(' ').reverse().map((m) => (m.endsWith("'") ? m[0] : m.endsWith('2') ? m : m + "'")).join(' ');
    expect(headlights(run(inv(PLL_CORNERS[0].alg)))).toEqual(['L']);
    expect(headlights(run(inv(PLL_CORNERS[1].alg)))).toEqual([]);
    for (const id of ['ua', 'ub']) {
      const s = run(inv(PLL_EDGES.find((e) => e.id === id)!.alg));
      expect(new Set(topRow(s, 'B')).size, id).toBe(1);
    }
  });

  it('the solve steps say the truth about the last layer', () => {
    const sides: Face[] = ['F', 'R', 'B', 'L'];
    const opposite: Record<string, Face> = { F: 'B', B: 'F', R: 'L', L: 'R' };
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      for (const st of solve(applyMoves(solved, scramble(seed)), 'fast').steps) {
        const lined = applyMoves(st.stateBefore, st.parts[0].label === 'Line it up' ? st.parts[0].moves : []);
        if (st.title === 'Corners: swap two neighbors') expect(headlights(lined)).toEqual(['L']);
        if (st.title === 'Corners: swap across') expect(headlights(lined)).toEqual([]);
        if (st.title === 'Edges: Ua-perm' || st.title === 'Edges: Ub-perm') expect(new Set(topRow(lined, 'B')).size).toBe(1);
        if (st.title === 'Edges: H-perm')
          for (const f of sides) expect(topRow(lined, f)[1]).toBe(topRow(lined, opposite[f])[0]);
        if (st.title === 'Edges: Z-perm')
          for (const f of sides) {
            expect(topRow(lined, f)[1]).not.toBe(topRow(lined, f)[0]);
            expect(topRow(lined, f)[1]).not.toBe(topRow(lined, opposite[f])[0]);
          }
        if (st.stage === 'pllCorners' || st.stage === 'pllEdges' || st.stage === 'ollCorners') seen.add(st.title);
      }
    }
    // Every case shows up in 400 solves.
    expect(seen.size).toBe(7 + 2 + 4 + 1);
  });
});
