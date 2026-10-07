// Short solver: Kociemba's two-phase algorithm.
//
// Phase 1 turns the cube into a state that only needs U, D, R2, L2, F2 and B2
// (every edge and corner sticker of the top and bottom colors faces up or down,
// and the four middle-layer edges are in the middle layer). Phase 2 finishes the
// cube with those moves only. Both phases search with lookup tables that give a
// lower bound on the moves still needed. Solutions are usually 19 to 22 moves.
//
// The cubie model (which piece is in which slot, and how it is turned) is read
// from the sticker model in cube.ts, so no sticker index is typed by hand here.

import { applyMove, centerColor, Color, CubeState, Face, FACE_NORMAL, slot, solvedState, Vec } from './cube';

// Kociemba's slot order. Corner and edge stickers are listed with the U/D sticker
// first (F/B for the middle-layer edges), then clockwise.
export const CORNERS = ['UFR', 'UFL', 'UBL', 'UBR', 'DFR', 'DFL', 'DBL', 'DBR'];
export const EDGES = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Faces of each corner slot: U/D first, then the other two clockwise. */
const CORNER_FACES: Face[][] = CORNERS.map((name) => {
  const faces = slot(name).faces;
  const [a, b, c] = faces;
  return dot(cross(FACE_NORMAL[a], FACE_NORMAL[b]), FACE_NORMAL[c]) < 0 ? [a, b, c] : [a, c, b];
});
/** Faces of each edge slot: the U/D face first (F/B for middle-layer edges). slot() already lists it that way. */
const EDGE_FACES: Face[][] = EDGES.map((name) => slot(name).faces);

const stickerOf = (name: string, face: Face) => {
  const s = slot(name);
  return s.stickers[s.faces.indexOf(face)];
};
export const CORNER_STICKERS = CORNERS.map((n, i) => CORNER_FACES[i].map((f) => stickerOf(n, f)));
const EDGE_STICKERS = EDGES.map((n, i) => EDGE_FACES[i].map((f) => stickerOf(n, f)));

/** Pieces: cp[i] is the corner in slot i, co[i] its twist (0-2). Edges the same with flip 0-1. */
export interface Cubie {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}

const identity = (): Cubie => ({
  cp: [0, 1, 2, 3, 4, 5, 6, 7],
  co: Array(8).fill(0),
  ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  eo: Array(12).fill(0),
});

/** Read the pieces from the stickers. The center colors say which color belongs to which face. */
export function toCubie(state: CubeState): Cubie {
  const faceOf = new Map<Color, Face>();
  (['U', 'R', 'F', 'D', 'L', 'B'] as Face[]).forEach((f) => faceOf.set(centerColor(state, f), f));
  const ud = new Set<Face>(['U', 'D']);
  const c = identity();
  CORNER_STICKERS.forEach((st, i) => {
    const faces = st.map((k) => faceOf.get(state[k])!);
    const ori = faces.findIndex((f) => ud.has(f));
    // Turn the stickers so the U/D one comes first; then it matches a home slot exactly.
    const turned = [0, 1, 2].map((k) => faces[(ori + k) % 3]).join('');
    const piece = CORNER_FACES.findIndex((h) => h.join('') === turned);
    if (ori < 0 || piece < 0) throw new Error('Not a real corner');
    c.cp[i] = piece;
    c.co[i] = ori;
  });
  EDGE_STICKERS.forEach((st, i) => {
    const faces = st.map((k) => faceOf.get(state[k])!);
    let piece = EDGE_FACES.findIndex((h) => h[0] === faces[0] && h[1] === faces[1]);
    let ori = 0;
    if (piece < 0) {
      piece = EDGE_FACES.findIndex((h) => h[0] === faces[1] && h[1] === faces[0]);
      ori = 1;
    }
    if (piece < 0) throw new Error('Not a real edge');
    c.ep[i] = piece;
    c.eo[i] = ori;
  });
  return c;
}

/** Do b after a. */
function multiply(a: Cubie, b: Cubie): Cubie {
  return {
    cp: b.cp.map((p) => a.cp[p]),
    co: b.cp.map((p, i) => (a.co[p] + b.co[i]) % 3),
    ep: b.ep.map((p) => a.ep[p]),
    eo: b.ep.map((p, i) => (a.eo[p] + b.eo[i]) % 2),
  };
}

// Moves: 18 face turns, index = face * 3 + (quarter turns - 1).
const MOVE_FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const MOVE_NAMES = MOVE_FACES.flatMap((f) => [f, f + '2', f + "'"]);
const N_MOVES = 18;
export const MOVE_CUBIES = MOVE_NAMES.map((m) => toCubie(applyMove(solvedState(), m)));
const PHASE2_MOVES = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16]; // U U2 U' R2 F2 D D2 D' L2 B2
const N_P2 = PHASE2_MOVES.length;

// ---------------------------------------------------------------------------
// Coordinates: small numbers that describe part of the cube.

const C12_4: number[] = []; // combination index -> 12-bit mask of the middle-layer edge slots
const MASK_TO_SLICE = new Int16Array(4096).fill(-1);
for (let m = 0; m < 4096; m++) {
  let bits = 0;
  for (let k = m; k; k &= k - 1) bits++;
  if (bits === 4) {
    MASK_TO_SLICE[m] = C12_4.length;
    C12_4.push(m);
  }
}

function permRank(p: number[]): number {
  let r = 0;
  for (let i = 0; i < p.length; i++) {
    let smaller = 0;
    for (let j = i + 1; j < p.length; j++) if (p[j] < p[i]) smaller++;
    r = r * (p.length - i) + smaller;
  }
  return r;
}

function permUnrank(r: number, n: number): number[] {
  const digits: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    digits[i] = r % (n - i);
    r = Math.floor(r / (n - i));
  }
  const pool = Array.from({ length: n }, (_, i) => i);
  return digits.map((d) => pool.splice(d, 1)[0]);
}

const getTwist = (c: Cubie) => c.co.slice(0, 7).reduce((r, o) => r * 3 + o, 0);
const getFlip = (c: Cubie) => c.eo.slice(0, 11).reduce((r, o) => r * 2 + o, 0);
const getSlice = (c: Cubie) => MASK_TO_SLICE[c.ep.reduce((m, p, i) => (p >= 8 ? m | (1 << i) : m), 0)];
const getCornerPerm = (c: Cubie) => permRank(c.cp);
const getEdgePerm = (c: Cubie) => permRank(c.ep.slice(0, 8));
const getSlicePerm = (c: Cubie) => permRank(c.ep.slice(8).map((p) => p - 8));

function setTwist(v: number): Cubie {
  const c = identity();
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    c.co[i] = v % 3;
    sum += c.co[i];
    v = Math.floor(v / 3);
  }
  c.co[7] = (3 - (sum % 3)) % 3;
  return c;
}

function setFlip(v: number): Cubie {
  const c = identity();
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    c.eo[i] = v % 2;
    sum += c.eo[i];
    v = Math.floor(v / 2);
  }
  c.eo[11] = sum % 2;
  return c;
}

function setSlice(v: number): Cubie {
  const c = identity();
  const mask = C12_4[v];
  let mid = 8;
  let other = 0;
  for (let i = 0; i < 12; i++) c.ep[i] = mask & (1 << i) ? mid++ : other++;
  return c;
}

// ---------------------------------------------------------------------------
// Tables, built once on first use (a fraction of a second).

interface Tables {
  twistMove: Uint16Array;
  flipMove: Uint16Array;
  sliceMove: Uint16Array;
  cpMove: Uint16Array;
  epMove: Uint16Array;
  spMove: Uint8Array;
  twistSlicePrune: Int8Array;
  flipSlicePrune: Int8Array;
  cpSpPrune: Int8Array;
  epSpPrune: Int8Array;
  sliceGoal: number;
}

let tables: Tables | null = null;

function moveTable(size: number, moves: Cubie[], make: (v: number) => Cubie, read: (c: Cubie) => number): Uint16Array {
  const t = new Uint16Array(size * moves.length);
  for (let v = 0; v < size; v++) {
    const c = make(v);
    moves.forEach((m, k) => (t[v * moves.length + k] = read(multiply(c, m))));
  }
  return t;
}

/** Breadth-first search from the goal: how many moves each pair of coordinates needs at least. */
function pruneTable(n1: number, m1: ArrayLike<number>, n2: number, m2: ArrayLike<number>, nMoves: number, goal1: number, goal2: number): Int8Array {
  const t = new Int8Array(n1 * n2).fill(-1);
  t[goal1 * n2 + goal2] = 0;
  let frontier = [goal1 * n2 + goal2];
  for (let depth = 0; frontier.length; depth++) {
    const next: number[] = [];
    for (const idx of frontier) {
      const a = Math.floor(idx / n2);
      const b = idx % n2;
      for (let k = 0; k < nMoves; k++) {
        const j = m1[a * nMoves + k] * n2 + m2[b * nMoves + k];
        if (t[j] < 0) {
          t[j] = depth + 1;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return t;
}

function getTables(): Tables {
  if (tables) return tables;
  const moveCubies = MOVE_CUBIES;
  const p2Cubies = PHASE2_MOVES.map((k) => moveCubies[k]);

  const twistMove = moveTable(2187, moveCubies, setTwist, getTwist);
  const flipMove = moveTable(2048, moveCubies, setFlip, getFlip);
  const sliceMove = moveTable(495, moveCubies, setSlice, getSlice);
  const cpMove = moveTable(40320, p2Cubies, (v) => ({ ...identity(), cp: permUnrank(v, 8) }), getCornerPerm);
  const epMove = moveTable(40320, p2Cubies, (v) => ({ ...identity(), ep: [...permUnrank(v, 8), 8, 9, 10, 11] }), getEdgePerm);
  const spMove = Uint8Array.from(
    moveTable(24, p2Cubies, (v) => ({ ...identity(), ep: [0, 1, 2, 3, 4, 5, 6, 7, ...permUnrank(v, 4).map((p) => p + 8)] }), getSlicePerm),
  );
  const sliceGoal = getSlice(identity());

  tables = {
    twistMove,
    flipMove,
    sliceMove,
    cpMove,
    epMove,
    spMove,
    sliceGoal,
    twistSlicePrune: pruneTable(2187, twistMove, 495, sliceMove, N_MOVES, 0, sliceGoal),
    flipSlicePrune: pruneTable(2048, flipMove, 495, sliceMove, N_MOVES, 0, sliceGoal),
    cpSpPrune: pruneTable(40320, cpMove, 24, spMove, N_P2, 0, 0),
    epSpPrune: pruneTable(40320, epMove, 24, spMove, N_P2, 0, 0),
  };
  return tables;
}

/** Build the tables now, for example while the user is still entering colors. */
export function warmUpShortSolver() {
  getTables();
}

// ---------------------------------------------------------------------------
// Search.

const face = (m: number) => Math.floor(m / 3);
/** Skip a move on the same face as the last one, and fix the order of opposite faces (U before D, and so on). */
const skip = (last: number, m: number) => last >= 0 && (face(last) === face(m) || face(last) === face(m) + 3);

/**
 * Find a short solution for the cube. Returns face turns (U R F D L B with ', 2).
 * It keeps looking for shorter solutions until it finds one of `target` moves
 * or fewer, or until `timeMs` has passed.
 */
export function solveShort(state: CubeState, { target = 20, timeMs = 1500 } = {}): string[] {
  const T = getTables();
  const start = toCubie(state);
  const deadline = Date.now() + timeMs;
  let best = null as number[] | null;
  let nodes = 0;
  let stop = false;
  const path1: number[] = [];
  const path2: number[] = [];

  const outOfTime = () => {
    if (++nodes % 4096 === 0 && best && Date.now() > deadline) stop = true;
    return stop;
  };

  // Phase 2: finish with U, D and half turns of the sides.
  const phase2 = (cp: number, ep: number, sp: number, depth: number, last: number): boolean => {
    if (cp === 0 && ep === 0 && sp === 0) return true;
    if (depth === 0 || outOfTime()) return false;
    if (Math.max(T.cpSpPrune[cp * 24 + sp], T.epSpPrune[ep * 24 + sp]) > depth) return false;
    for (let k = 0; k < N_P2; k++) {
      const m = PHASE2_MOVES[k];
      if (skip(last, m)) continue;
      path2.push(m);
      if (phase2(T.cpMove[cp * N_P2 + k], T.epMove[ep * N_P2 + k], T.spMove[sp * N_P2 + k], depth - 1, m)) return true;
      path2.pop();
    }
    return false;
  };

  const startPhase2 = () => {
    let c = start;
    for (const m of path1) c = multiply(c, MOVE_CUBIES[m]);
    const cp = getCornerPerm(c);
    const ep = getEdgePerm(c);
    const sp = getSlicePerm(c);
    const limit = (best ? best.length - 1 : 30) - path1.length;
    const last = path1.length ? path1[path1.length - 1] : -1;
    for (let d = Math.max(T.cpSpPrune[cp * 24 + sp], T.epSpPrune[ep * 24 + sp]); d <= limit; d++) {
      path2.length = 0;
      if (phase2(cp, ep, sp, d, last)) {
        best = [...path1, ...path2];
        return;
      }
      if (stop) return;
    }
  };

  // Phase 1: reach a state that phase 2 can finish.
  const phase1 = (twist: number, flip: number, sl: number, depth: number, last: number) => {
    if (stop) return;
    if (depth === 0) {
      // A last move that phase 2 could also make means a shorter phase 1 was already tried.
      if (twist === 0 && flip === 0 && sl === T.sliceGoal && (last < 0 || !PHASE2_MOVES.includes(last))) startPhase2();
      return;
    }
    if (outOfTime()) return;
    if (Math.max(T.twistSlicePrune[twist * 495 + sl], T.flipSlicePrune[flip * 495 + sl]) > depth) return;
    for (let m = 0; m < N_MOVES; m++) {
      if (skip(last, m)) continue;
      path1.push(m);
      phase1(T.twistMove[twist * N_MOVES + m], T.flipMove[flip * N_MOVES + m], T.sliceMove[sl * N_MOVES + m], depth - 1, m);
      path1.pop();
      if (stop || (best && best.length <= target)) return;
    }
  };

  const tw = getTwist(start);
  const fl = getFlip(start);
  const sl = getSlice(start);
  for (let d1 = 0; d1 <= 12 && !stop; d1++) {
    if (best && d1 >= best.length) break;
    phase1(tw, fl, sl, d1, -1);
    if (best && best.length <= target) break;
  }
  if (!best) throw new Error('No short solution found');
  return best.map((m) => MOVE_NAMES[m]);
}
