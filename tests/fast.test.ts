import { describe, expect, it } from 'vitest';
import { applyMoves, isSolved, solvedState } from '../src/cube/cube';
import { FAST_STAGE_ORDER, solve } from '../src/cube/solver';
import { buildPlan, stateAt } from '../src/ui/plan';
import { scramble } from './helpers';

describe('fast method (CFOP)', () => {
  it('solves 500 random scrambles, step after step, with stages in order', () => {
    let total = 0;
    let max = 0;
    let slowest = 0;
    const perStage: Record<string, number> = {};
    const N = 500;
    for (let seed = 1; seed <= N; seed++) {
      const t = Date.now();
      const sol = solve(applyMoves(solvedState(), scramble(seed)), 'fast');
      slowest = Math.max(slowest, Date.now() - t);
      const plan = buildPlan(sol);
      const last = plan[plan.length - 1];
      expect(isSolved(stateAt(last, last.seq.length)), `seed ${seed}`).toBe(true);
      const idx = sol.steps.map((s) => FAST_STAGE_ORDER.indexOf(s.stage));
      expect(idx.every((i) => i >= 0)).toBe(true);
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
      for (const st of sol.steps) expect(st.top).toBe('yellow');
      for (const s of sol.stages) perStage[s.id] = (perStage[s.id] ?? 0) + s.moves;
      total += sol.totalMoves;
      max = Math.max(max, sol.totalMoves);
    }
    const avg = Object.entries(perStage).map(([k, v]) => `${k} ${(v / N).toFixed(1)}`).join(', ');
    console.log(`fast method: average ${(total / N).toFixed(1)} moves, max ${max}, slowest ${slowest} ms (${avg})`);
    expect(total / N).toBeLessThan(90);
  }, 600_000);

  it('returns no steps for a solved cube', () => {
    expect(solve(solvedState(), 'fast').steps).toEqual([]);
  });
});
