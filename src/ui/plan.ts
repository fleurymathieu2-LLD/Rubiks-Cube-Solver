// Turns a Solution into something the player can step through, one move at a time.

import { applyMoves, CubeState, locate, slot } from '../cube/cube';
import type { MovePart, Solution, SolveStep } from '../cube/solver';

export interface PlayMove {
  move: string;
  /** "turn" is a face turn. "hold" turns the whole cube to the next hold. */
  kind: 'turn' | 'hold';
  /** Index of the part this move belongs to (-1 for a hold move). */
  part: number;
  /** Round inside a repeated part, starting at 1. */
  round: number;
}

export interface PlayStep extends SolveStep {
  index: number;
  seq: PlayMove[];
  /** The cube before the first move of seq (still in the previous hold). */
  startState: CubeState;
}

const HOLD_TURNS = [[], ['y'], ['y2'], ["y'"]];

export function buildPlan(solution: Solution): PlayStep[] {
  let prev = solution.start;
  return solution.steps.map((st, index) => {
    const k = HOLD_TURNS.findIndex((h) => sameState(applyMoves(prev, h), st.stateBefore));
    if (k < 0) throw new Error(`Step ${index + 1} does not follow the previous step`);
    const seq: PlayMove[] = HOLD_TURNS[k].map((m) => ({ move: m, kind: 'hold', part: -1, round: 1 }));
    st.parts.forEach((p: MovePart, pi) => {
      for (let r = 1; r <= p.repeat; r++)
        for (const m of p.moves) seq.push({ move: m, kind: 'turn', part: pi, round: r });
    });
    const step: PlayStep = { ...st, index, seq, startState: prev };
    prev = applyMoves(st.stateBefore, st.moves);
    return step;
  });
}

function sameState(a: CubeState, b: CubeState) {
  for (let i = 0; i < 54; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The cube after the first n moves of a step. */
export function stateAt(step: PlayStep, n: number): CubeState {
  return applyMoves(step.startState, step.seq.slice(0, n).map((m) => m.move));
}

/** Sticker indexes of the focus pieces in a given state. */
export function focusStickers(state: CubeState, focus: SolveStep['focus']): Set<number> {
  const out = new Set<number>();
  for (const colors of focus) {
    try {
      const loc = locate(state, colors);
      slot(loc.slot).stickers.forEach((i) => out.add(i));
    } catch {
      // A piece that cannot be found is simply not highlighted.
    }
  }
  return out;
}
