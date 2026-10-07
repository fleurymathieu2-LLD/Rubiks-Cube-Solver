// Searches for the fast method (CFOP): the shortest white cross, and the
// shortest way to put one corner and edge pair into its slot.
//
// Both work on single pieces: where each piece is and how it is turned. That
// keeps the lookup tables tiny, so they are built in a few milliseconds.

import { CubeState } from './cube';
import { CORNERS, EDGES, MOVE_CUBIES, MOVE_NAMES, toCubie } from './twophase';

const N = MOVE_NAMES.length; // 18

// Piece state: corner = slot * 3 + twist (24 values), edge = slot * 2 + flip (24 values).
const CORNER_MOVE = new Uint8Array(24 * N);
const EDGE_MOVE = new Uint8Array(24 * N);
MOVE_CUBIES.forEach((M, m) => {
  for (let j = 0; j < 8; j++)
    for (let o = 0; o < 3; o++) CORNER_MOVE[(M.cp[j] * 3 + o) * N + m] = j * 3 + ((o + M.co[j]) % 3);
  for (let j = 0; j < 12; j++)
    for (let o = 0; o < 2; o++) EDGE_MOVE[(M.ep[j] * 2 + o) * N + m] = j * 2 + ((o + M.eo[j]) % 2);
});

const CROSS_EDGES = ['DR', 'DF', 'DL', 'DB'].map((n) => EDGES.indexOf(n));
const crossIndex = (e: number[]) => ((e[0] * 24 + e[1]) * 24 + e[2]) * 24 + e[3];
const CROSS_GOAL = crossIndex(CROSS_EDGES.map((p) => p * 2));

/** Breadth-first search from the goal over the given moves: the exact number of moves each state needs (-1 = not reachable). */
function crossTable(moves: number[]): Int8Array {
  const t = new Int8Array(24 ** 4).fill(-1);
  t[CROSS_GOAL] = 0;
  let frontier = [CROSS_GOAL];
  for (let d = 0; frontier.length; d++) {
    const next: number[] = [];
    for (const idx of frontier) {
      const e = [Math.floor(idx / 13824), Math.floor(idx / 576) % 24, Math.floor(idx / 24) % 24, idx % 24];
      for (const m of moves) {
        const j = crossIndex(e.map((x) => EDGE_MOVE[x * N + m]));
        if (t[j] < 0) {
          t[j] = d + 1;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return t;
}

const ALL_MOVES = MOVE_NAMES.map((_, i) => i);
/** Moves for putting a pair in, with the slot held at the front right: the faces in `faces`. */
const movesOf = (faces: string) => ALL_MOVES.filter((m) => faces.includes(MOVE_NAMES[m][0]));

let crossAll: Int8Array | null = null;

const face = (m: number) => Math.floor(m / 3);
const skip = (last: number, m: number) => last >= 0 && (face(last) === face(m) || face(last) === face(m) + 3);

/**
 * The shortest white cross. White must be the bottom center. When several are
 * equally short, the first move in the order U R F D L B wins, which favors
 * moves that are easy to see.
 */
export function shortestCross(state: CubeState): string[] {
  crossAll ??= crossTable(ALL_MOVES);
  const c = toCubie(state);
  let e = CROSS_EDGES.map((p) => {
    const i = c.ep.indexOf(p);
    return i * 2 + c.eo[i];
  });
  const out: string[] = [];
  let last = -1;
  while (crossAll[crossIndex(e)] > 0) {
    const d = crossAll[crossIndex(e)];
    const m = ALL_MOVES.find((m) => !skip(last, m) && crossAll![crossIndex(e.map((x) => EDGE_MOVE[x * N + m]))] === d - 1)!;
    e = e.map((x) => EDGE_MOVE[x * N + m]);
    out.push(MOVE_NAMES[m]);
    last = m;
  }
  return out;
}

// ---------------------------------------------------------------------------
// F2L pairs. Slots are named by their edge: FR, FL, BL, BR.

export type PairSlot = 'FR' | 'FL' | 'BL' | 'BR';
const SLOT_PIECES: Record<PairSlot, [number, number]> = {
  FR: [CORNERS.indexOf('DFR'), EDGES.indexOf('FR')],
  FL: [CORNERS.indexOf('DFL'), EDGES.indexOf('FL')],
  BL: [CORNERS.indexOf('DBL'), EDGES.indexOf('BL')],
  BR: [CORNERS.indexOf('DBR'), EDGES.indexOf('BR')],
};
const SLOTS = Object.keys(SLOT_PIECES) as PairSlot[];
interface PairTables {
  moves: number[];
  cross: Int8Array;
  pairs: Record<PairSlot, Int8Array>;
}
const pairTablesByFaces = new Map<string, PairTables>();

function pairTables(faces: string): PairTables {
  let t = pairTablesByFaces.get(faces);
  if (!t) {
    const moves = movesOf(faces);
    t = {
      moves,
      cross: crossTable(moves),
      pairs: Object.fromEntries(SLOTS.map((s) => [s, pairTable(s, moves)])) as Record<PairSlot, Int8Array>,
    };
    pairTablesByFaces.set(faces, t);
  }
  return t;
}

function pairTable(slot: PairSlot, moves: number[]): Int8Array {
  const [cp, ep] = SLOT_PIECES[slot];
  const t = new Int8Array(576).fill(-1);
  const goal = cp * 3 * 24 + ep * 2;
  t[goal] = 0;
  let frontier = [goal];
  for (let d = 0; frontier.length; d++) {
    const next: number[] = [];
    for (const idx of frontier) {
      const c = Math.floor(idx / 24);
      const e = idx % 24;
      for (const m of moves) {
        const j = CORNER_MOVE[c * N + m] * 24 + EDGE_MOVE[e * N + m];
        if (t[j] < 0) {
          t[j] = d + 1;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return t;
}

/**
 * The shortest sequence of turns of `faces` (for example "URF") that puts the
 * front-right pair in its slot and keeps the cross and the pairs in `keep`.
 * Null when the pieces cannot get there with these moves (one of them is stuck
 * in a slot these faces do not turn) or it needs more than `maxDepth` moves.
 */
export function shortestPair(state: CubeState, keep: PairSlot[], maxDepth = 12, faces = 'URF'): string[] | null {
  const T = pairTables(faces);
  const cube = toCubie(state);
  const cornerState = (p: number) => {
    const i = cube.cp.indexOf(p);
    return i * 3 + cube.co[i];
  };
  const edgeState = (p: number) => {
    const i = cube.ep.indexOf(p);
    return i * 2 + cube.eo[i];
  };
  const slots: PairSlot[] = ['FR', ...keep.filter((s) => s !== 'FR')];
  const tables = slots.map((s) => T.pairs[s]);
  // Pieces followed by the search: the four cross edges, then a corner and an edge per slot.
  const cross0 = CROSS_EDGES.map(edgeState);
  const pairs0 = slots.map((s) => [cornerState(SLOT_PIECES[s][0]), edgeState(SLOT_PIECES[s][1])]);

  const bound = (cross: number[], pairs: number[][]) => {
    let h = T.cross[crossIndex(cross)];
    if (h < 0) return Infinity;
    for (let k = 0; k < pairs.length; k++) {
      const v = tables[k][pairs[k][0] * 24 + pairs[k][1]];
      if (v < 0) return Infinity;
      if (v > h) h = v;
    }
    return h;
  };

  const path: number[] = [];
  const search = (cross: number[], pairs: number[][], depth: number, last: number): boolean => {
    const h = bound(cross, pairs);
    if (h === 0) return true;
    if (h > depth) return false;
    for (const m of T.moves) {
      if (skip(last, m)) continue;
      path.push(m);
      if (
        search(
          cross.map((x) => EDGE_MOVE[x * N + m]),
          pairs.map(([c, e]) => [CORNER_MOVE[c * N + m], EDGE_MOVE[e * N + m]]),
          depth - 1,
          m,
        )
      )
        return true;
      path.pop();
    }
    return false;
  };

  const h0 = bound(cross0, pairs0);
  if (h0 === Infinity) return null;
  for (let d = h0; d <= maxDepth; d++) if (search(cross0, pairs0, d, -1)) return path.map((m) => MOVE_NAMES[m]);
  return null;
}
