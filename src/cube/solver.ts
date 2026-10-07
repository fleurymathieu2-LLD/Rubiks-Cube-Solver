// Beginner layer-by-layer solver.
//
// The solver works like a person: it holds the cube with white on the bottom
// and yellow on top, and it only turns the whole cube left or right to choose
// which side faces you. Each step records how to hold the cube, the moves to
// make, and why they work.

import {
  applyMove,
  applyMoves,
  centerColor,
  Color,
  CORNER_SLOTS,
  CubeState,
  Face,
  isSolved,
  locate,
  parseMoves,
  slot,
  slotColors,
  slotSolved,
} from './cube';
import { colorName } from './colors';
import { solveShort } from './twophase';

export type StageId =
  | 'cross'
  | 'corners'
  | 'middle'
  | 'yellowCross'
  | 'yellowEdges'
  | 'cornerPositions'
  | 'cornerTwist'
  /** The short solution has one stage of its own. */
  | 'short';

/** "beginner": the 7-stage layer-by-layer method. "short": about 20 moves, found by a computer search. */
export type Method = 'beginner' | 'short';

export const STAGE_ORDER: StageId[] = [
  'cross',
  'corners',
  'middle',
  'yellowCross',
  'yellowEdges',
  'cornerPositions',
  'cornerTwist',
];

export interface MovePart {
  label: string;
  moves: string[];
  repeat: number;
}

export interface SolveStep {
  stage: StageId;
  title: string;
  /** What to do, in one or two short sentences. */
  instruction: string;
  /** Why these moves work. Shown in "Explain" mode. */
  why: string;
  /** How to hold the cube: the center colors that face you and face up. */
  front: Color;
  top: Color;
  parts: MovePart[];
  /** All moves of the step, in order (repeats written out). */
  moves: string[];
  /** The cube as you hold it at the start of the step. */
  stateBefore: CubeState;
  /** Pieces to highlight, by their colors. */
  focus: Color[][];
}

export interface StageSummary {
  id: StageId;
  steps: number;
  moves: number;
}

export interface Solution {
  method: Method;
  start: CubeState;
  startFront: Color;
  startTop: Color;
  steps: SolveStep[];
  stages: StageSummary[];
  totalMoves: number;
}

export const ALG = {
  cornerInsert: "R U R' U'",
  cornerPop: "R U R'",
  middleRight: "U R U' R' U' F' U F",
  middleLeft: "U' L' U L U F U' F'",
  yellowCross: "F R U R' U' F'",
  yellowEdges: "R U R' U R U2 R' U",
  cornerCycle: "U R U' L' U R' U' L",
  cornerTwist: "R' D' R D",
} as const;

const SIDES: Face[] = ['F', 'R', 'B', 'L'];
const U_TURN = ['', 'U', 'U2', "U'"];

const cap = (c: Color) => colorName(c);
const low = (c: Color) => colorName(c).toLowerCase();

function part(label: string, alg: string | string[], repeat = 1): MovePart {
  const moves = typeof alg === 'string' ? parseMoves(alg) : alg;
  return { label, moves, repeat };
}

class Solver {
  s: CubeState;
  steps: SolveStep[] = [];
  stage: StageId = 'cross';

  constructor(state: CubeState) {
    this.s = state.slice();
  }

  c(face: Face): Color {
    return centerColor(this.s, face);
  }

  /** Turn the whole cube left or right until this center color faces you. */
  hold(front: Color) {
    for (let k = 0; k < 4; k++) {
      if (this.c('F') === front) return;
      this.s = applyMove(this.s, 'y');
    }
    throw new Error(`No side center is ${front}`);
  }

  /** Record a step and apply its moves. Empty parts are dropped. */
  step(info: { title: string; instruction: string; why: string; parts: MovePart[]; focus?: Color[][] }) {
    const parts = info.parts.filter((p) => p.moves.length > 0 && p.repeat > 0);
    if (parts.length === 0) return;
    const moves = parts.flatMap((p) => Array.from({ length: p.repeat }, () => p.moves).flat());
    this.steps.push({
      stage: this.stage,
      title: info.title,
      instruction: info.instruction,
      why: info.why,
      front: this.c('F'),
      top: this.c('U'),
      parts,
      moves,
      stateBefore: this.s.slice(),
      focus: info.focus ?? [],
    });
    this.s = applyMoves(this.s, moves);
  }

  /** How many U turns bring a top-layer piece to a slot (0-3), checked by trying them. */
  uTurnsTo(colors: Color[], target: string, state = this.s): number {
    let t = state;
    for (let k = 0; k < 4; k++) {
      if (locate(t, colors).slot === target) return k;
      t = applyMove(t, 'U');
    }
    throw new Error(`Piece ${colors.join('-')} cannot reach ${target} with U turns`);
  }

  // -------------------------------------------------------------------------
  // Stage 1: white cross on the bottom.

  solveCross() {
    this.stage = 'cross';
    const order = SIDES.map((f) => this.c(f));
    for (const side of order) {
      this.hold(side);
      const piece: Color[] = ['white', side];
      const loc = locate(this.s, piece);
      if (loc.slot === 'DF' && loc.faceOf.white === 'D') continue;

      const lift: Record<string, { alg: string; where: string; why: string }> = {
        DF: {
          alg: 'F2',
          where: `It is already in its spot, but flipped: the white sticker faces you instead of down.`,
          why: `F2 lifts the edge to the top so you can put it back the right way.`,
        },
        DR: {
          alg: 'R2',
          where: `It is on the bottom, but under the wrong center.`,
          why: `R2 lifts it to the top. This does not break the cross, because this spot was not finished yet.`,
        },
        DB: {
          alg: 'B2',
          where: `It is on the bottom, but at the back, under the wrong center.`,
          why: `B2 (turn the back face twice) lifts it to the top.`,
        },
        DL: {
          alg: 'L2',
          where: `It is on the bottom, but under the wrong center.`,
          why: `L2 lifts it to the top.`,
        },
        FR: {
          alg: "R U R'",
          where: `It is in the middle layer, at the front right.`,
          why: `R lifts the edge to the top. U moves it out of the way. R' turns the right side back, so a white edge you already placed there comes home again.`,
        },
        FL: {
          alg: "L' U' L",
          where: `It is in the middle layer, at the front left.`,
          why: `L' lifts the edge to the top. U' moves it out of the way. L turns the left side back, so the bottom stays as it was.`,
        },
        BR: {
          alg: "R' U R",
          where: `It is in the middle layer, at the back right.`,
          why: `R' lifts the edge to the top. U moves it out of the way. R turns the right side back.`,
        },
        BL: {
          alg: "L U' L'",
          where: `It is in the middle layer, at the back left.`,
          why: `L lifts the edge to the top. U' moves it out of the way. L' turns the left side back.`,
        },
      };

      const parts: MovePart[] = [];
      const whyParts: string[] = [];
      let where = `It is in the top layer.`;
      const l = lift[loc.slot];
      if (l) {
        parts.push(part('Lift it to the top', l.alg));
        whyParts.push(l.why);
        where = l.where;
      }
      // Try the moves on a copy to see where the edge ends up. step() applies them for real.
      const lifted = l ? applyMoves(this.s, parseMoves(l.alg)) : this.s;
      // U turns do not change which way the white sticker points.
      const whiteUp = locate(lifted, piece).faceOf.white === 'U';
      // White up: line it up above its center, then F2.
      // White on the side: line it up at the top right, then R' F R.
      const k = this.uTurnsTo(piece, whiteUp ? 'UF' : 'UR', lifted);
      const align = U_TURN[k] ? [U_TURN[k]] : [];

      if (whiteUp) {
        if (align.length) {
          parts.push(part(`Line it up above ${low(side)}`, align));
          whyParts.push(`Turn the top until the edge sits right above the ${low(side)} center. The top layer has no finished pieces yet, so you can turn it freely.`);
        }
        parts.push(part('Bring it down', 'F2'));
        whyParts.push(`The white sticker points up. A half turn of the front (F2) takes the edge straight down, so white ends on the bottom.`);
      } else {
        if (align.length) {
          parts.push(part('Line it up at the top right', align));
          whyParts.push(`The white sticker points to the side, so a plain F2 would put the edge in upside down. Turn the top until the edge sits at the top right, next to the ${low(side)} center.`);
        } else {
          whyParts.push(`The white sticker points to the side, so a plain F2 would put the edge in upside down. The edge already sits at the top right.`);
        }
        parts.push(part('Bring it down', "R' F R"));
        whyParts.push(`R' turns the edge down to the front right. F drops it into the bottom with white down. R puts the right side back.`);
      }

      // Join U turns that touch, for example "R U R'" then "U'".
      this.step({
        title: `White and ${low(side)} edge`,
        instruction: `Find the white and ${low(side)} edge. ${where} Put it on the bottom, under the ${low(side)} center, with white facing down.`,
        why: whyParts.join(' '),
        parts,
        focus: [piece],
      });
      if (!slotSolved(this.s, 'DF')) throw new Error('Cross edge not solved');
    }
  }

  // -------------------------------------------------------------------------
  // Stage 2: white corners.

  solveWhiteCorners() {
    this.stage = 'corners';
    const order = SIDES.map((f) => this.c(f));
    for (const side of order) {
      this.hold(side);
      const right = this.c('R');
      const piece: Color[] = ['white', side, right];
      const name = `White, ${low(side)} and ${low(right)} corner`;
      let loc = locate(this.s, piece);
      if (loc.slot === 'DFR' && slotSolved(this.s, 'DFR')) continue;

      if (loc.slot.startsWith('D')) {
        // It is stuck in the bottom layer. Hold it at the front right and pop it out.
        const viewFor: Record<string, Face> = { DFR: 'F', DFL: 'L', DBL: 'B', DBR: 'R' };
        this.hold(this.c(viewFor[loc.slot]));
        this.step({
          title: `${name}: take it out`,
          instruction: `The corner is stuck in the bottom layer, in the wrong spot or turned the wrong way. Hold the cube so the corner is at the bottom front right. Then lift it out.`,
          why: `R U R' lifts the corner to the top layer. R moves it up, U moves it away, and R' puts the right side back. Your white cross is safe: R' returns every bottom piece that R moved.`,
          parts: [part('Lift it to the top', ALG.cornerPop)],
          focus: [piece],
        });
        this.hold(side);
        loc = locate(this.s, piece);
      }

      const k = this.uTurnsTo(piece, 'UFR');
      let t = applyMoves(this.s, U_TURN[k] ? [U_TURN[k]] : []);
      let n = 0;
      while (!slotSolved(t, 'DFR')) {
        t = applyMoves(t, parseMoves(ALG.cornerInsert));
        n++;
        if (n > 5) throw new Error('Corner insert did not finish');
      }
      const align = U_TURN[k] ? [U_TURN[k]] : [];
      const whiteFace = locate(applyMoves(this.s, align), piece).faceOf.white;
      const whiteWhere =
        whiteFace === 'U' ? 'on top' : whiteFace === 'F' ? 'toward you' : 'to the right';
      this.step({
        title: name,
        instruction: `Turn the top so the corner sits above its spot (top front right). Then repeat R U R' U' until the corner drops in with white on the bottom. Here you need ${n} ${n === 1 ? 'time' : 'times'}.`,
        why:
          (align.length ? `First the top turns the corner above the spot where it belongs, between the ${low(side)} and ${low(right)} centers. ` : '') +
          `The white sticker points ${whiteWhere}. Each R U R' U' twists the corner and moves it between the top and the bottom. After 1, 3 or 5 times it lands in the bottom with white down. It never breaks the cross: every R is undone by an R'.`,
        parts: [part('Line it up', align), part('Insert', ALG.cornerInsert, n)],
        focus: [piece],
      });
      this.hold(side);
      if (!slotSolved(this.s, 'DFR')) throw new Error('White corner not solved');
    }
  }

  // -------------------------------------------------------------------------
  // Stage 3: middle layer edges.

  solveMiddle() {
    this.stage = 'middle';
    const order = SIDES.map((f) => this.c(f));
    for (const side of order) {
      this.hold(side);
      const right = this.c('R');
      const piece: Color[] = [side, right];
      const name = `${cap(side)} and ${low(right)} edge`;
      let loc = locate(this.s, piece);
      if (loc.slot === 'FR' && slotSolved(this.s, 'FR')) continue;

      if (!loc.slot.startsWith('U')) {
        const viewFor: Record<string, Face> = { FR: 'F', FL: 'L', BL: 'B', BR: 'R' };
        this.hold(this.c(viewFor[loc.slot]));
        this.step({
          title: `${name}: take it out`,
          instruction: `The edge is in the middle layer, but in the wrong spot or flipped. Hold the cube so it is at the front right. Do the right-hand move to push it up to the top.`,
          why: `The right-hand move puts some top edge into the front right spot. That pushes this edge out to the top layer, where you can line it up properly.`,
          parts: [part('Push it out', ALG.middleRight)],
          focus: [piece],
        });
        this.hold(side);
        loc = locate(this.s, piece);
      }

      // The edge is in the top layer. Its side sticker decides where it lines up.
      const sideColor = loc.faceOf[side] === 'U' ? right : side;
      const topColor = sideColor === side ? right : side;
      // Turn the top so the side sticker sits above its center. That center is your front.
      this.hold(sideColor);
      const k = this.uTurnsTo(piece, 'UF');
      const goesRight = this.c('R') === topColor;
      this.step({
        title: name,
        instruction:
          `Hold ${low(sideColor)} in front. Turn the top until the edge makes an upside-down T with the ${low(sideColor)} center. ` +
          (goesRight
            ? `The top of the edge is ${low(topColor)}, and ${low(topColor)} is on the right, so the edge goes to the right.`
            : `The top of the edge is ${low(topColor)}, and ${low(topColor)} is on the left, so the edge goes to the left.`),
        why: goesRight
          ? `U R U' R' moves the edge away and brings the white corner up next to it. U' F' U F puts the corner back down. The edge rides along into the middle layer. Both halves are the same "lift, turn, return" idea you used for the corners.`
          : `U' L' U L moves the edge away and brings the white corner up. U F U' F' puts the corner back down, and the edge drops into the middle layer on the left. It is the mirror image of the right-hand move.`,
        parts: [
          part('Line it up', U_TURN[k] ? [U_TURN[k]] : []),
          part(goesRight ? 'Insert to the right' : 'Insert to the left', goesRight ? ALG.middleRight : ALG.middleLeft),
        ],
        focus: [piece],
      });
      const target = goesRight ? 'FR' : 'FL';
      if (!slotSolved(this.s, target)) throw new Error('Middle edge not solved');
    }
    for (const f of SIDES) {
      this.hold(this.c(f));
      if (!slotSolved(this.s, 'FR')) throw new Error('Middle layer not solved');
    }
  }

  // -------------------------------------------------------------------------
  // Stage 4: yellow cross on top.

  yellowEdgesUp(state = this.s): Face[] {
    const up: Face[] = [];
    for (const f of SIDES) {
      const name = 'U' + f;
      if (slotColors(state, name).U === 'yellow') up.push(f);
    }
    return up;
  }

  solveYellowCross() {
    this.stage = 'yellowCross';
    for (let guard = 0; guard < 4; guard++) {
      const up = this.yellowEdgesUp();
      if (up.length === 4) return;
      if (up.length === 0) {
        this.step({
          title: 'Yellow cross: the dot',
          instruction: `Only the yellow center is yellow on top (a "dot"). Do the algorithm once. You get a yellow L shape.`,
          why: `F R U R' U' F' flips edges on the top. From the dot it makes two edges yellow, so you get the L shape.`,
          parts: [part('Make an L', ALG.yellowCross)],
        });
        continue;
      }
      if (up.length !== 2) throw new Error('Odd number of yellow edges: the cube was entered wrong');
      const line = (up.includes('F') && up.includes('B')) || (up.includes('L') && up.includes('R'));
      // Find the U turn that puts the shape in its spot.
      let k = 0;
      for (; k < 4; k++) {
        const t = applyMoves(this.s, U_TURN[k] ? [U_TURN[k]] : []);
        const u = this.yellowEdgesUp(t);
        if (line ? u.includes('L') && u.includes('R') : u.includes('B') && u.includes('L')) break;
      }
      if (k === 4) throw new Error('Yellow cross shape not found');
      this.step({
        title: line ? 'Yellow cross: the line' : 'Yellow cross: the L',
        instruction: line
          ? `You have a yellow line. Turn the top so the line goes left to right. Then do the algorithm once to finish the cross.`
          : `You have a yellow L. Turn the top so the L points to the back left (yellow at the back and on the left, like 9 o'clock to 12 o'clock). Then do the algorithm once.`,
        why: line
          ? `With the line from left to right, F R U R' U' F' flips the front and back edges up at the same time.`
          : `With the L at the back left, the algorithm turns it into a line. You then repeat it once more for the cross. It always works in this order: dot, L, line, cross.`,
        parts: [part('Line it up', U_TURN[k] ? [U_TURN[k]] : []), part(line ? 'Make the cross' : 'Make a line', ALG.yellowCross)],
      });
    }
    if (this.yellowEdgesUp().length !== 4) throw new Error('Yellow cross not solved');
  }

  // -------------------------------------------------------------------------
  // Stage 5: match the yellow edges with the side centers.

  matchedEdges(state = this.s): Face[] {
    return SIDES.filter((f) => slotColors(state, 'U' + f)[f] === centerColor(state, f));
  }

  bestUTurn(): { k: number; matched: Face[] } {
    let best = { k: 0, matched: [] as Face[] };
    for (let k = 0; k < 4; k++) {
      const t = applyMoves(this.s, U_TURN[k] ? [U_TURN[k]] : []);
      const m = this.matchedEdges(t);
      if (m.length > best.matched.length) best = { k, matched: m };
    }
    return best;
  }

  solveYellowEdges() {
    this.stage = 'yellowEdges';
    for (let guard = 0; guard < 6; guard++) {
      const { k, matched } = this.bestUTurn();
      if (matched.length === 4) {
        this.step({
          title: 'Yellow edges: line up the top',
          instruction: `Turn the top until all four top edges match the centers below them.`,
          why: `The edges are already in the right order. They only need a turn of the top.`,
          parts: [part('Turn the top', U_TURN[k] ? [U_TURN[k]] : [])],
        });
        return;
      }
      if (k) {
        this.step({
          title: 'Yellow edges: find two that match',
          instruction: `Turn the top until two top edges match the color of the centers below them.`,
          why: `You can always get at least two edges to match. They tell you how to hold the cube for the next step.`,
          parts: [part('Turn the top', [U_TURN[k]])],
        });
      }
      const adjacent = !(
        (matched.includes('F') && matched.includes('B')) ||
        (matched.includes('L') && matched.includes('R'))
      );
      // Hold the cube so the matched edges are at the back and right (adjacent),
      // or at the front and back (opposite).
      const want: Face[] = adjacent ? ['B', 'R'] : ['F', 'B'];
      let found = false;
      for (const f of SIDES) {
        const t = rotateTo(this.s, centerColor(this.s, f));
        const m = this.matchedEdges(t);
        if (want.every((w) => m.includes(w))) {
          this.hold(centerColor(this.s, f));
          found = true;
          break;
        }
      }
      if (!found) throw new Error('Could not hold the cube for the yellow edges');
      this.step({
        title: adjacent ? 'Yellow edges: swap two' : 'Yellow edges: opposite pair',
        instruction: adjacent
          ? `Hold the cube so the two matching edges are at the back and on the right. Do the algorithm once.`
          : `The two matching edges are opposite each other. Hold them at the front and back, and do the algorithm once. Then you get two matching edges next to each other.`,
        why: adjacent
          ? `R U R' U R U2 R' U swaps the front and left top edges. It keeps the back and right edges, and it keeps the yellow cross.`
          : `When the matching edges are opposite, no single swap fixes them. One algorithm changes the case to two neighbors, which you know how to solve.`,
        parts: [part(adjacent ? 'Swap front and left' : 'Change the case', ALG.yellowEdges)],
      });
    }
    throw new Error('Yellow edges did not finish');
  }

  // -------------------------------------------------------------------------
  // Stage 6: put the yellow corners in their spots (they may still be twisted).

  cornerInPlace(state: CubeState, name: string): boolean {
    const s = slot(name);
    const want = s.faces.map((f) => centerColor(state, f)).sort().join();
    const have = s.stickers.map((i) => state[i]).sort().join();
    return want === have;
  }

  topCornersInPlace(state = this.s): string[] {
    return CORNER_SLOTS.filter((s) => s.name.startsWith('U') && this.cornerInPlace(state, s.name)).map((s) => s.name);
  }

  solveCornerPositions() {
    this.stage = 'cornerPositions';
    for (let guard = 0; guard < 4; guard++) {
      const ok = this.topCornersInPlace();
      if (ok.length === 4) return;
      if (ok.length === 0) {
        this.step({
          title: 'Yellow corners: none in place',
          instruction: `No top corner is in its spot yet. A corner is "in its spot" when its three colors match the three centers around it, even if it is twisted. Do the algorithm once from any side.`,
          why: `U R U' L' U R' U' L moves three corners around in a circle. After one round, one corner always lands in its spot.`,
          parts: [part('Cycle three corners', ALG.cornerCycle)],
        });
        continue;
      }
      // Hold the cube so a good corner is at the top front right.
      const viewFor: Record<string, Face> = { UFR: 'F', UFL: 'L', UBL: 'B', UBR: 'R' };
      const good = ok[0];
      this.hold(this.c(viewFor[good]));
      const colors = slot('UFR').stickers.map((i) => this.s[i]);
      this.step({
        title: 'Yellow corners: move them into place',
        instruction: `Hold the cube so the corner that is already in its spot is at the top front right. Do the algorithm, then check. If the other corners are not in their spots yet, do it once more.`,
        why: `U R U' L' U R' U' L keeps the top front right corner where it is. It moves the other three top corners around it in a circle. One or two rounds put them all in place.`,
        parts: [part('Cycle the other three', ALG.cornerCycle)],
        focus: [colors],
      });
    }
    if (this.topCornersInPlace().length !== 4) throw new Error('Corner positions not solved');
  }

  // -------------------------------------------------------------------------
  // Stage 7: twist the yellow corners. Do not turn the whole cube in this stage.

  solveCornerTwist() {
    this.stage = 'cornerTwist';
    // U turns you make to visit the next corner. They join the next twist step.
    let pending = 0;
    let first = true;
    for (let visited = 0; visited < 4; visited++) {
      const here = applyMoves(this.s, uMoves(pending));
      if (slotColors(here, 'UFR').U !== 'yellow') {
        let n = 0;
        let t = here;
        while (slotColors(t, 'UFR').U !== 'yellow') {
          t = applyMoves(t, parseMoves(ALG.cornerTwist));
          n++;
          if (n > 4) throw new Error('Corner twist did not finish');
        }
        const colors = slot('UFR').stickers.map((i) => here[i]);
        this.step({
          title: first ? 'Twist the first yellow corner' : 'Twist the next yellow corner',
          instruction:
            (first
              ? `Keep the cube in your hands the same way for this whole stage. `
              : `Turn only the top layer to bring the next twisted corner to the top front right. `) +
            `Repeat R' D' R D until yellow faces up on the top front right corner. Here you need ${n} times.` +
            (first ? ` The bottom will look broken for a while. That is normal: keep going and it comes back.` : ''),
          why: `R' D' R D twists the top front right corner, and it mixes up the bottom for a while. Six rounds of R' D' R D in a row change nothing at all. Each corner takes 2 or 4 rounds, and the rounds always add up to a multiple of 6, so when every yellow faces up, the bottom is whole again. Do not turn the whole cube in this stage, or the bottom cannot heal.`,
          parts: [part('Bring the corner', uMoves(pending)), part('Twist', ALG.cornerTwist, n)],
          focus: [colors],
        });
        pending = 0;
        first = false;
      }
      pending = (pending + 1) % 4;
    }
    // Finally turn the top so it matches the rest of the cube.
    let k = 0;
    for (; k < 4; k++) if (isSolved(applyMoves(this.s, uMoves(k)))) break;
    if (k === 4) throw new Error('Cube not solved after twisting corners');
    this.step({
      title: 'Last turn',
      instruction: `All yellow faces up and the bottom is whole again. Turn the top to line it up with the rest. Your cube is solved!`,
      why: `During the twists you turned the top to visit each corner. One last turn of the top puts it back in line.`,
      parts: [part('Line up the top', uMoves(k))],
    });
  }
}

const uMoves = (k: number): string[] => (U_TURN[k % 4] ? [U_TURN[k % 4]] : []);

function rotateTo(state: CubeState, front: Color): CubeState {
  let s = state;
  for (let k = 0; k < 4; k++) {
    if (centerColor(s, 'F') === front) return s;
    s = applyMove(s, 'y');
  }
  throw new Error(`No side center is ${front}`);
}

/** Put white on the bottom, keeping as much of the user's view as possible. */
function orientWhiteDown(state: CubeState): CubeState {
  const where: Record<Face, string[]> = { D: [], U: ['x2'], F: ["x'"], B: ['x'], R: ['z'], L: ["z'"] };
  for (const f of Object.keys(where) as Face[]) {
    if (centerColor(state, f) === 'white') return applyMoves(state, where[f]);
  }
  throw new Error('No white center');
}

export function solve(input: CubeState, method: Method = 'beginner'): Solution {
  return method === 'short' ? solveShortSteps(input) : solveBeginner(input);
}

/** Moves per step in the short solution: small enough to check the cube against the picture often. */
const SHORT_CHUNK = 5;

function solveShortSteps(input: CubeState): Solution {
  const start = orientWhiteDown(input);
  const moves = solveShort(start);
  const front = centerColor(start, 'F');
  const top = centerColor(start, 'U');
  const chunks = Math.ceil(moves.length / SHORT_CHUNK);
  const steps: SolveStep[] = [];
  let s = start;
  for (let i = 0, from = 0; i < chunks; i++) {
    // Spread the moves evenly, for example 21 moves as 6, 5, 5, 5.
    const to = Math.round(((i + 1) * moves.length) / chunks);
    const chunk = moves.slice(from, to);
    steps.push({
      stage: 'short',
      title: `Moves ${from + 1} to ${to}`,
      instruction:
        `Keep ${low(front)} in front and ${low(top)} on top for the whole solve. Do these ${chunk.length} moves, then check that your cube looks like the picture.` +
        (i === chunks - 1 ? ' After the last one, your cube is solved.' : ''),
      why: `A computer tried millions of move sequences and picked one of the shortest it found: ${moves.length} moves for the whole cube. The cube only looks solved at the very end, because these moves do not build it layer by layer. That is why there is nothing to learn from each step. To learn to solve the cube yourself, switch to the beginner's method.`,
      front,
      top,
      parts: [part(`Moves ${from + 1}–${to}`, chunk)],
      moves: chunk,
      stateBefore: s,
      focus: [],
    });
    s = applyMoves(s, chunk);
    from = to;
  }
  if (!isSolved(s)) throw new Error('Short solver did not finish');
  return {
    method: 'short',
    start,
    startFront: front,
    startTop: top,
    steps,
    stages: [{ id: 'short', steps: steps.length, moves: moves.length }],
    totalMoves: moves.length,
  };
}

function solveBeginner(input: CubeState): Solution {
  const start = orientWhiteDown(input);
  const solver = new Solver(start);
  solver.solveCross();
  solver.solveWhiteCorners();
  solver.solveMiddle();
  solver.solveYellowCross();
  solver.solveYellowEdges();
  solver.solveCornerPositions();
  solver.solveCornerTwist();
  if (!isSolved(solver.s)) throw new Error('Solver did not finish');

  const stages = STAGE_ORDER.map((id) => {
    const steps = solver.steps.filter((s) => s.stage === id);
    return { id, steps: steps.length, moves: steps.reduce((n, s) => n + s.moves.length, 0) };
  });
  return {
    method: 'beginner',
    start,
    startFront: centerColor(start, 'F'),
    startTop: centerColor(start, 'U'),
    steps: solver.steps,
    stages,
    totalMoves: solver.steps.reduce((n, s) => n + s.moves.length, 0),
  };
}
