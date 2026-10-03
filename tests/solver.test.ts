import { describe, expect, it } from 'vitest';
import { applyMoves, Color, CubeState, isSolved, solvedState } from '../src/cube/cube';
import { solve, STAGE_ORDER } from '../src/cube/solver';

import { scramble } from './helpers';

function replay(start: CubeState, steps: ReturnType<typeof solve>['steps']) {
  // Every step must start from the state the previous step left, seen from the new hold.
  let s = start;
  for (const st of steps) {
    const held = rotateToHold(s, st.front, st.top);
    expect(held).toEqual(st.stateBefore);
    s = applyMoves(held, st.moves);
  }
  return s;
}

function rotateToHold(s: CubeState, front: Color, top: Color): CubeState {
  const rots = ['', 'x', 'x2', "x'", 'z', "z'"];
  for (const r of rots) {
    let t = r ? applyMoves(s, [r]) : s;
    for (let k = 0; k < 4; k++) {
      if (t[22] === front && t[4] === top) return t;
      t = applyMoves(t, ['y']);
    }
  }
  throw new Error('hold not reachable');
}

describe('solver', () => {
  it('returns no steps for a cube that is already solved', () => {
    const sol = solve(solvedState());
    expect(sol.steps.length).toBe(0);
  });

  it('solves 3000 random scrambles, and every step replays from the one before', () => {
    let maxMoves = 0;
    let total = 0;
    const N = 3000;
    for (let seed = 1; seed <= N; seed++) {
      const start = applyMoves(solvedState(), scramble(seed));
      const sol = solve(start);
      const end = replay(sol.start, sol.steps);
      expect(isSolved(end), `seed ${seed}`).toBe(true);
      for (const st of sol.steps) {
        expect(st.moves.length).toBeGreaterThan(0);
        expect(st.top).toBe('yellow');
      }
      maxMoves = Math.max(maxMoves, sol.totalMoves);
      total += sol.totalMoves;
    }
    console.log(`average ${Math.round(total / N)} moves, max ${maxMoves}`);
  }, 60_000);

  it('solves a cube that was entered upside down (white on top)', () => {
    const start = applyMoves(solvedState(), ['x2', ...scramble(7)]);
    const sol = solve(start);
    expect(isSolved(replay(sol.start, sol.steps))).toBe(true);
  });

  it('keeps stages in order', () => {
    const sol = solve(applyMoves(solvedState(), scramble(42)));
    const idx = sol.steps.map((s) => STAGE_ORDER.indexOf(s.stage));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});
