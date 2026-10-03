// Every claim the learning guide makes about an algorithm, checked on a real cube model.
import { describe, expect, it } from 'vitest';
import { applyMoves, CORNER_SLOTS, CubeState, EDGE_SLOTS, isSolved, parseMoves, slotSolved, solvedState } from '../src/cube/cube';
import { ALG, solve } from '../src/cube/solver';
import { STAGES } from '../src/content/learn';
import { scramble } from './helpers';

const solved = solvedState();
const run = (alg: string, s: CubeState = solved) => applyMoves(s, parseMoves(alg));
const changedSlots = (s: CubeState) => [...EDGE_SLOTS, ...CORNER_SLOTS].filter((x) => !slotSolved(s, x.name)).map((x) => x.name).sort();

describe('claims in the guide', () => {
  it('every demo in the guide ends with a solved cube', () => {
    for (const st of STAGES) for (const a of st.algorithms) {
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
