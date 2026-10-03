// Cube model: 54 stickers ("facelets"), 9 per face.
//
// Face order is U R F D L B. Inside a face, stickers go row by row, as you
// see the face when you look straight at it:
//   U: looked at from above, the front edge at the bottom.
//   D: looked at from below, the front edge at the top.
//   F R B L: looked at from the side, the top edge at the top.
// This is the usual "unfolded cube" net layout.
//
// All move tables come from 3D geometry, so no permutation is typed by hand.

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
export const FACE_INDEX: Record<Face, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

export type Color = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export const COLORS: Color[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];
export const OPPOSITE_COLOR: Record<Color, Color> = {
  white: 'yellow',
  yellow: 'white',
  green: 'blue',
  blue: 'green',
  red: 'orange',
  orange: 'red',
};

export type CubeState = Color[];
export type Vec = [number, number, number];

// Logical axes: x to the right, y up, z toward you (out of the front face).
export const FACE_NORMAL: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

export function stickerIndex(face: Face, i: number): number {
  return FACE_INDEX[face] * 9 + i;
}

/** Position of the cubie and outward normal of one sticker. */
export function stickerGeometry(index: number): { pos: Vec; normal: Vec; face: Face } {
  const face = FACES[Math.floor(index / 9)];
  const i = index % 9;
  const r = Math.floor(i / 3);
  const c = i % 3;
  let pos: Vec;
  switch (face) {
    case 'U': pos = [c - 1, 1, r - 1]; break;
    case 'D': pos = [c - 1, -1, 1 - r]; break;
    case 'F': pos = [c - 1, 1 - r, 1]; break;
    case 'B': pos = [1 - c, 1 - r, -1]; break;
    case 'R': pos = [1, 1 - r, 1 - c]; break;
    case 'L': pos = [-1, 1 - r, c - 1]; break;
  }
  return { pos, normal: FACE_NORMAL[face], face };
}

const key = (p: Vec, n: Vec) => `${p.join(',')}|${n.join(',')}`;
const STICKER_BY_GEOMETRY = new Map<string, number>();
for (let i = 0; i < 54; i++) {
  const g = stickerGeometry(i);
  STICKER_BY_GEOMETRY.set(key(g.pos, g.normal), i);
}

/** Sticker index at a cubie position with a given outward normal. */
export function stickerAt(pos: Vec, normal: Vec): number {
  const i = STICKER_BY_GEOMETRY.get(key(pos, normal));
  if (i === undefined) throw new Error(`No sticker at ${key(pos, normal)}`);
  return i;
}

/** Rotate a vector a quarter turn about an axis (0=x, 1=y, 2=z). dir=+1 is counter-clockwise (right-hand rule). */
export function rotateQuarter(v: Vec, axis: number, dir: 1 | -1): Vec {
  const [x, y, z] = v;
  if (axis === 0) return [x, -dir * z, dir * y];
  if (axis === 1) return [dir * z, y, -dir * x];
  return [-dir * y, dir * x, z];
}

/**
 * A quarter-turn: which axis, which layers, and the rotation direction.
 * A face turn is clockwise as seen when you look at that face.
 */
interface QuarterTurn {
  axis: number;
  layers: number[]; // values of the coordinate on that axis that turn
  dir: 1 | -1;
}

const BASE_TURNS: Record<string, QuarterTurn> = {
  // Clockwise seen from outside = -90 degrees about the outward normal.
  R: { axis: 0, layers: [1], dir: -1 },
  L: { axis: 0, layers: [-1], dir: 1 },
  U: { axis: 1, layers: [1], dir: -1 },
  D: { axis: 1, layers: [-1], dir: 1 },
  F: { axis: 2, layers: [1], dir: -1 },
  B: { axis: 2, layers: [-1], dir: 1 },
  // Whole-cube rotations follow R, U and F.
  x: { axis: 0, layers: [-1, 0, 1], dir: -1 },
  y: { axis: 1, layers: [-1, 0, 1], dir: -1 },
  z: { axis: 2, layers: [-1, 0, 1], dir: -1 },
};

export const BASE_MOVES = Object.keys(BASE_TURNS);

/** perm[newIndex] = oldIndex for one clockwise quarter turn. */
function buildPerm(t: QuarterTurn): number[] {
  const perm = Array.from({ length: 54 }, (_, i) => i);
  for (let i = 0; i < 54; i++) {
    const { pos, normal } = stickerGeometry(i);
    if (!t.layers.includes(pos[t.axis])) continue;
    const j = stickerAt(rotateQuarter(pos, t.axis, t.dir), rotateQuarter(normal, t.axis, t.dir));
    perm[j] = i;
  }
  return perm;
}

const QUARTER_PERMS: Record<string, number[]> = {};
for (const m of BASE_MOVES) QUARTER_PERMS[m] = buildPerm(BASE_TURNS[m]);

export function moveInfo(move: string): { base: string; turns: 1 | 2 | 3; turn: QuarterTurn } {
  const base = move[0];
  const t = BASE_TURNS[base];
  if (!t || move.length > 2) throw new Error(`Unknown move "${move}"`);
  const suffix = move.slice(1);
  const turns = suffix === '' ? 1 : suffix === '2' ? 2 : suffix === "'" ? 3 : 0;
  if (turns === 0) throw new Error(`Unknown move "${move}"`);
  return { base, turns, turn: t };
}

export function applyMove(state: CubeState, move: string): CubeState {
  const { base, turns } = moveInfo(move);
  const perm = QUARTER_PERMS[base];
  let s = state;
  for (let k = 0; k < turns; k++) {
    const next = new Array<Color>(54);
    for (let i = 0; i < 54; i++) next[i] = s[perm[i]];
    s = next;
  }
  return s;
}

export function applyMoves(state: CubeState, moves: string[]): CubeState {
  return moves.reduce(applyMove, state);
}

export function parseMoves(alg: string): string[] {
  return alg.trim().split(/\s+/).filter(Boolean).map((m) => {
    moveInfo(m);
    return m;
  });
}

export function invertMove(move: string): string {
  const { base, turns } = moveInfo(move);
  return turns === 1 ? `${base}'` : turns === 3 ? base : `${base}2`;
}

export function invertMoves(moves: string[]): string[] {
  return moves.slice().reverse().map(invertMove);
}

/** Join turns of the same face that follow each other: U U -> U2, R R' -> nothing. */
export function simplifyMoves(moves: string[]): string[] {
  const out: { base: string; turns: number }[] = [];
  for (const m of moves) {
    const { base, turns } = moveInfo(m);
    const last = out[out.length - 1];
    if (last && last.base === base) {
      last.turns = (last.turns + turns) % 4;
      if (last.turns === 0) out.pop();
    } else {
      out.push({ base, turns });
    }
  }
  return out.map(({ base, turns }) => base + (turns === 1 ? '' : turns === 2 ? '2' : "'"));
}

/** The standard solved cube, held with yellow on top and green in front (white on the bottom). */
export const SOLVED_COLORS: Record<Face, Color> = {
  U: 'yellow',
  D: 'white',
  F: 'green',
  B: 'blue',
  R: 'orange',
  L: 'red',
};

export function solvedState(centers: Record<Face, Color> = SOLVED_COLORS): CubeState {
  return FACES.flatMap((f) => Array<Color>(9).fill(centers[f]));
}

export function centerColor(state: CubeState, face: Face): Color {
  return state[stickerIndex(face, 4)];
}

export function isSolved(state: CubeState): boolean {
  return FACES.every((f) => {
    const c = centerColor(state, f);
    for (let i = 0; i < 9; i++) if (state[stickerIndex(f, i)] !== c) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Pieces. A slot name lists its faces: U/D first, then F/B, then R/L
// (for example "UF", "FR", "DFR", "UBL").

export interface Slot {
  name: string;
  faces: Face[];
  stickers: number[]; // same order as faces
  pos: Vec;
}

function slotFaces(pos: Vec): Face[] {
  const faces: Face[] = [];
  if (pos[1] === 1) faces.push('U');
  if (pos[1] === -1) faces.push('D');
  if (pos[2] === 1) faces.push('F');
  if (pos[2] === -1) faces.push('B');
  if (pos[0] === 1) faces.push('R');
  if (pos[0] === -1) faces.push('L');
  return faces;
}

function buildSlots(kind: 2 | 3): Slot[] {
  const slots: Slot[] = [];
  for (const y of [1, 0, -1])
    for (const z of [1, -1, 0])
      for (const x of [1, -1, 0]) {
        const pos: Vec = [x, y, z];
        const faces = slotFaces(pos);
        if (faces.length !== kind) continue;
        slots.push({
          name: faces.join(''),
          faces,
          stickers: faces.map((f) => stickerAt(pos, FACE_NORMAL[f])),
          pos,
        });
      }
  return slots;
}

export const EDGE_SLOTS = buildSlots(2);
export const CORNER_SLOTS = buildSlots(3);
const SLOT_BY_NAME = new Map<string, Slot>([...EDGE_SLOTS, ...CORNER_SLOTS].map((s) => [s.name, s]));

export function slot(name: string): Slot {
  const s = SLOT_BY_NAME.get(name);
  if (!s) throw new Error(`Unknown slot ${name}`);
  return s;
}

/** Colors in a slot, keyed by face. */
export function slotColors(state: CubeState, name: string): Partial<Record<Face, Color>> {
  const s = slot(name);
  const out: Partial<Record<Face, Color>> = {};
  s.faces.forEach((f, k) => (out[f] = state[s.stickers[k]]));
  return out;
}

export interface Located {
  slot: string;
  /** For each color of the piece, the face where that sticker is now. */
  faceOf: Partial<Record<Color, Face>>;
}

/** Find the piece with exactly these colors. */
export function locate(state: CubeState, colors: Color[]): Located {
  const slots = colors.length === 2 ? EDGE_SLOTS : CORNER_SLOTS;
  for (const s of slots) {
    const here = s.stickers.map((i) => state[i]);
    if (here.length === colors.length && colors.every((c) => here.includes(c))) {
      const faceOf: Partial<Record<Color, Face>> = {};
      s.faces.forEach((f, k) => (faceOf[here[k]] = f));
      return { slot: s.name, faceOf };
    }
  }
  throw new Error(`Piece ${colors.join('-')} not found`);
}

/** True when the slot holds the piece that belongs there, turned the right way. */
export function slotSolved(state: CubeState, name: string): boolean {
  const s = slot(name);
  return s.faces.every((f, k) => state[s.stickers[k]] === centerColor(state, f));
}
