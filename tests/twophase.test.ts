import { describe, expect, it } from 'vitest';
import { applyMoves, isSolved, solvedState } from '../src/cube/cube';
import { solveShort, warmUpShortSolver } from '../src/cube/twophase';
import { scramble } from './helpers';

describe('short solver', () => {
  it('builds its tables quickly', () => {
    const t = Date.now();
    warmUpShortSolver();
    console.log(`tables built in ${Date.now() - t} ms`);
  }, 30_000);

  it('returns no moves for a solved cube', () => {
    expect(solveShort(solvedState())).toEqual([]);
  });

  it('solves random scrambles in 22 moves or fewer', () => {
    let total = 0;
    let max = 0;
    let time = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      const start = applyMoves(solvedState(), scramble(seed));
      const t = Date.now();
      const sol = solveShort(start);
      time = Math.max(time, Date.now() - t);
      expect(isSolved(applyMoves(start, sol)), `seed ${seed}`).toBe(true);
      expect(sol.length).toBeLessThanOrEqual(22);
      total += sol.length;
      max = Math.max(max, sol.length);
    }
    console.log(`short solver: average ${(total / N).toFixed(1)} moves, max ${max}, slowest ${time} ms`);
  }, 600_000);

  it('works whichever way the cube is held', () => {
    const start = applyMoves(solvedState(), ['x', 'y2', ...scramble(9)]);
    expect(isSolved(applyMoves(start, solveShort(start)))).toBe(true);
  });
});
