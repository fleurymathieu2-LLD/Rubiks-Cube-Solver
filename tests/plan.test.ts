import { describe, expect, it } from 'vitest';
import { applyMoves, isSolved, solvedState } from '../src/cube/cube';
import { solve } from '../src/cube/solver';
import { buildPlan, stateAt } from '../src/ui/plan';
import { scramble } from './helpers';

describe('player plan', () => {
  it('plays every step in order, with only left/right cube turns between them, and ends solved', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const plan = buildPlan(solve(applyMoves(solvedState(), scramble(seed))));
      for (let i = 0; i < plan.length; i++) {
        const st = plan[i];
        const holds = st.seq.filter((m) => m.kind === 'hold');
        expect(holds.length).toBeLessThanOrEqual(1);
        holds.forEach((h) => expect(['y', 'y2', "y'"]).toContain(h.move));
        // Hold moves come first.
        expect(st.seq.findIndex((m) => m.kind === 'turn')).toBe(holds.length);
        // After the hold turn, the cube looks the way the step expects.
        expect(stateAt(st, holds.length)).toEqual(st.stateBefore);
        if (i + 1 < plan.length) expect(plan[i + 1].startState).toEqual(stateAt(st, st.seq.length));
      }
      const last = plan[plan.length - 1];
      expect(isSolved(stateAt(last, last.seq.length))).toBe(true);
    }
  });
});
