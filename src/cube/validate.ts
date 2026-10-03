// Checks that an entered cube is a real, solvable cube.
// Each problem names the stickers to look at, so the app can highlight them.

import {
  applyMoves,
  centerColor,
  Color,
  COLORS,
  CORNER_SLOTS,
  CubeState,
  EDGE_SLOTS,
  Face,
  FACE_NORMAL,
  OPPOSITE_COLOR,
  Slot,
  solvedState,
  stickerIndex,
  Vec,
} from './cube';
import { colorName } from './colors';

export interface Problem {
  message: string;
  stickers: number[];
}

export type Entered = (Color | null)[];

const low = (c: Color) => colorName(c).toLowerCase();

/** The 24 ways to hold a cube, as whole-cube rotations. */
const ALL_HOLDS: string[][] = ['', 'x', 'x2', "x'", 'z', "z'"].flatMap((a) =>
  ['', 'y', 'y2', "y'"].map((b) => [a, b].filter(Boolean)),
);

function det(a: Vec, b: Vec, c: Vec): number {
  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  );
}

/** Corner stickers in the same turning direction for every corner, starting with the U or D sticker. */
function cornerOrder(s: Slot): number[] {
  const n = s.faces.map((f) => FACE_NORMAL[f]);
  return det(n[0], n[1], n[2]) > 0 ? s.stickers : [s.stickers[0], s.stickers[2], s.stickers[1]];
}

/** Read the corner colors in turning order, starting at the U/D colored sticker. Returns the twist too. */
function readCorner(state: CubeState, s: Slot, udColors: Color[]): { seq: Color[]; twist: number } | null {
  const order = cornerOrder(s).map((i) => state[i]);
  const t = order.findIndex((c) => udColors.includes(c));
  if (t < 0) return null;
  return { seq: [order[t], order[(t + 1) % 3], order[(t + 2) % 3]], twist: t };
}

function parity(perm: number[]): number {
  const seen = new Array(perm.length).fill(false);
  let p = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = perm[j]) {
      seen[j] = true;
      len++;
    }
    p += len - 1;
  }
  return p % 2;
}

export function validate(entered: Entered): Problem[] {
  // 1. Every sticker needs a color.
  const empty = entered.flatMap((c, i) => (c ? [] : [i]));
  if (empty.length) {
    return [{
      message: `${empty.length} ${empty.length === 1 ? 'sticker has' : 'stickers have'} no color yet. Fill in every square.`,
      stickers: empty,
    }];
  }
  const state = entered as CubeState;

  // 2. Each color exactly 9 times.
  const counts = new Map<Color, number>(COLORS.map((c) => [c, 0]));
  state.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  const over = COLORS.filter((c) => counts.get(c)! > 9);
  const under = COLORS.filter((c) => counts.get(c)! < 9);
  if (over.length || under.length) {
    const parts = [
      ...over.map((c) => `${counts.get(c)} ${low(c)}`),
      ...under.map((c) => `${counts.get(c)} ${low(c)}`),
    ];
    return [{
      message: `Each color must appear exactly 9 times. You have ${parts.join(', ')}. Look for a sticker you tapped with the wrong color.`,
      stickers: state.flatMap((c, i) => (over.includes(c) ? [i] : [])),
    }];
  }

  // 3. Centers: six different colors, with the usual opposite pairs.
  const faces: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  const centers = Object.fromEntries(faces.map((f) => [f, centerColor(state, f)])) as Record<Face, Color>;
  const centerStickers = faces.map((f) => stickerIndex(f, 4));
  const pairs: [Face, Face][] = [['U', 'D'], ['F', 'B'], ['R', 'L']];
  for (const [a, b] of pairs) {
    if (OPPOSITE_COLOR[centers[a]] !== centers[b]) {
      return [{
        message: `The center stickers do not match a real cube. ${colorName(centers[a])} and ${low(centers[b])} centers are on opposite sides, but on a standard cube ${low(centers[a])} is opposite ${low(OPPOSITE_COLOR[centers[a]])}. Check the middle sticker of each side.`,
        stickers: centerStickers,
      }];
    }
  }

  // A real cube has the standard color layout: with yellow on top and green
  // in front, orange is on the right. A mirror layout means two sides were swapped.
  const standard = ALL_HOLDS.some((h) => {
    const t = applyMoves(solvedState(), h);
    return faces.every((f) => centerColor(t, f) === centers[f]);
  });
  if (!standard) {
    return [{
      message: `The sides are in mirror order. With yellow on top and green in front, red must be on the left and orange on the right. Most likely the cube was turned to the right instead of the left between two sides. Check the middle sticker of each side.`,
      stickers: centerStickers,
    }];
  }

  // 4. Every edge and corner must be a real piece, and each piece must appear once.
  const solved = solvedState(centers);
  const ud = [centers.U, centers.D];
  const fb = [centers.F, centers.B];
  const problems: Problem[] = [];

  const edgeKey = (cs: Color[]) => cs.slice().sort().join('+');
  const edgeHome = new Map(EDGE_SLOTS.map((s, i) => [edgeKey(s.stickers.map((k) => solved[k])), i]));
  const edgePerm: number[] = [];
  const seenEdges = new Map<number, number>();
  let flips = 0;
  EDGE_SLOTS.forEach((s, i) => {
    const cs = s.stickers.map((k) => state[k]);
    const home = edgeHome.get(edgeKey(cs));
    if (home === undefined) {
      problems.push({
        message:
          cs[0] === cs[1]
            ? `One edge has two ${low(cs[0])} stickers. A real edge always has two different colors.`
            : `One edge has ${low(cs[0])} and ${low(cs[1])}. Those colors are on opposite sides, so no real edge has both.`,
        stickers: s.stickers,
      });
      return;
    }
    if (seenEdges.has(home)) {
      problems.push({
        message: `The ${low(cs[0])} and ${low(cs[1])} edge appears twice. Each edge exists only once.`,
        stickers: [...s.stickers, ...EDGE_SLOTS[seenEdges.get(home)!].stickers],
      });
      return;
    }
    seenEdges.set(home, i);
    edgePerm[i] = home;
    // The edge is "good" when its main color sits on the main face of the slot.
    const main = cs.find((c) => ud.includes(c)) ?? cs.find((c) => fb.includes(c));
    if (cs[0] !== main) flips++;
  });

  const cornerKey = (seq: Color[]) => seq.join('>');
  const cornerHome = new Map(
    CORNER_SLOTS.map((s, i) => [cornerKey(readCorner(solved, s, ud)!.seq), i]),
  );
  const cornerSet = new Map(
    CORNER_SLOTS.map((s, i) => [s.stickers.map((k) => solved[k]).sort().join('+'), i]),
  );
  const cornerPerm: number[] = [];
  const seenCorners = new Map<number, number>();
  let twist = 0;
  CORNER_SLOTS.forEach((s, i) => {
    const cs = s.stickers.map((k) => state[k]);
    const read = readCorner(state, s, ud);
    const home = read ? cornerHome.get(cornerKey(read.seq)) : undefined;
    if (!read || home === undefined) {
      const names = [...new Set(cs)].map(low).join(', ');
      problems.push({
        message: cornerSet.has(cs.slice().sort().join('+'))
          ? `One corner has its colors in an impossible order (${names}). Two of its stickers are probably swapped.`
          : `One corner has the colors ${names}. No real corner has these colors together.`,
        stickers: s.stickers,
      });
      return;
    }
    if (seenCorners.has(home)) {
      problems.push({
        message: `The ${cs.map(low).join(', ')} corner appears twice. Each corner exists only once.`,
        stickers: [...s.stickers, ...CORNER_SLOTS[seenCorners.get(home)!].stickers],
      });
      return;
    }
    seenCorners.set(home, i);
    cornerPerm[i] = home;
    twist += read.twist;
  });

  const mirrored = problems.filter((p) => p.message.includes('impossible order'));
  if (mirrored.length >= 4) {
    return [{
      message: `Many corners have their colors in mirror order. This usually means two sides were entered in each other's places, or a side was entered while the cube was held a different way. Check the hold instructions for each side.`,
      stickers: mirrored.flatMap((p) => p.stickers),
    }];
  }
  if (problems.length) return problems;

  // 5. Hidden rules every real cube follows.
  if (twist % 3 !== 0) {
    problems.push({
      message: `One corner is twisted in a way a real cube cannot be. Usually one corner was entered turned the wrong way: check the three stickers of each corner.`,
      stickers: [],
    });
  }
  if (flips % 2 !== 0) {
    problems.push({
      message: `One edge is flipped in a way a real cube cannot be. Usually the two stickers of one edge were entered the wrong way around.`,
      stickers: [],
    });
  }
  if (parity(edgePerm) !== parity(cornerPerm)) {
    problems.push({
      message: `Two pieces look swapped in a way a real cube cannot be. Usually two stickers were entered in each other's places. Check each side again.`,
      stickers: [],
    });
  }
  return problems;
}
