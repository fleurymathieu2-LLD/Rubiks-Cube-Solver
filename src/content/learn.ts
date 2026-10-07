import { applyMoves, Face, parseMoves, solvedState } from '../cube/cube';
import type { StageId } from '../cube/solver';
import { ALG, headlights, OLL_CORNERS, PLL_CORNERS, PLL_EDGES, topRow, yellowCornerLook } from '../cube/solver';

/** Plain words for each move, as you hold the cube. */
export function describeMove(move: string): string {
  const table: Record<string, string> = {
    R: 'Turn the right side up, away from you.',
    "R'": 'Turn the right side down, toward you.',
    R2: 'Turn the right side a half turn (two quarter turns).',
    L: 'Turn the left side down, toward you.',
    "L'": 'Turn the left side up, away from you.',
    L2: 'Turn the left side a half turn.',
    U: 'Turn the top layer to the left.',
    "U'": 'Turn the top layer to the right.',
    U2: 'Turn the top layer a half turn.',
    D: 'Turn the bottom layer to the right.',
    "D'": 'Turn the bottom layer to the left.',
    D2: 'Turn the bottom layer a half turn.',
    F: 'Turn the front face clockwise, like a steering wheel to the right.',
    "F'": 'Turn the front face counter-clockwise, like a steering wheel to the left.',
    F2: 'Turn the front face a half turn.',
    B: 'Turn the back face. Seen from the front, its top goes to the left.',
    "B'": 'Turn the back face. Seen from the front, its top goes to the right.',
    B2: 'Turn the back face a half turn.',
    y: 'Turn the whole cube to the left. The right side comes to the front.',
    "y'": 'Turn the whole cube to the right. The left side comes to the front.',
    y2: 'Turn the whole cube around. The back comes to the front.',
  };
  return table[move] ?? move;
}

export const NOTATION_INTRO = [
  'Each letter names one side of the cube, as you hold it: R is the right side, L the left, U the top ("up"), D the bottom ("down"), F the front (facing you) and B the back.',
  'A letter alone means a quarter turn clockwise, as if you look straight at that side. A small mark (R\') means counter-clockwise. A 2 (R2) means a half turn.',
  'The easy way to remember: R goes up, L goes down, U goes left, D goes right. Add the mark and each one goes the other way.',
];

export const NOTATION_MOVES = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'R2', 'U2'];

export interface Demo {
  /** Moves applied to a solved cube to set up the case. */
  setup: string;
  /** Moves to play. */
  play: string;
  caption: string;
}

export interface StageGuide {
  id: StageId;
  number: number;
  name: string;
  short: string;
  goal: string;
  look: string;
  how: string[];
  algorithms: { name: string; alg: string; when: string; memory?: string; demo: Demo }[];
  tip: string;
}

const inv = (alg: string) =>
  alg
    .split(' ')
    .reverse()
    .map((m) => (m.endsWith("'") ? m[0] : m.endsWith('2') ? m : m + "'"))
    .join(' ');

const times = (alg: string, n: number) => Array.from({ length: n }, () => alg).join(' ');

export const STAGES: StageGuide[] = [
  {
    id: 'cross',
    number: 1,
    name: 'White cross',
    short: 'Make a white plus sign on the bottom.',
    goal: 'Put the four white edges on the bottom, around the white center. Each edge must also match the center on its side.',
    look: 'An edge is a piece with two colors. Look for the four edges that have white on them.',
    how: [
      'Hold the cube with white on the bottom and yellow on top. Keep it this way for the whole solve. You only turn the cube left or right to choose which side faces you.',
      'Pick one white edge. Turn the cube so the center of its other color faces you.',
      'Bring the edge to the top layer if it is not there yet. Turn the top until the edge sits above its center. Then turn the front side twice (F2) to bring it down.',
      'If the white sticker faces to the side instead of up, put the edge at the top right and use R\' F R.',
    ],
    algorithms: [
      {
        name: 'Bring it down',
        alg: 'F2',
        when: 'The edge is above its center and the white sticker points up.',
        demo: { setup: 'F2', play: 'F2', caption: 'The edge goes straight down. White ends on the bottom.' },
      },
      {
        name: 'Bring it down, flipped',
        alg: "R' F R",
        when: 'The edge is at the top right and the white sticker points to the right.',
        demo: { setup: "R' F' R", play: "R' F R", caption: 'R\' turns the edge down, F puts it in, R repairs the right side.' },
      },
    ],
    tip: 'The cross is the only stage without a fixed recipe. Take your time and watch where each piece goes. That is how you learn to "see" the cube.',
  },
  {
    id: 'corners',
    number: 2,
    name: 'White corners',
    short: 'Finish the white side and the first layer.',
    goal: 'Put the four white corners on the bottom. When you are done, the bottom layer is complete on all sides.',
    look: 'A corner has three colors. Each white corner belongs between two side centers. For example the white, green and orange corner goes between the green and orange centers.',
    how: [
      'Hold the cube so the two centers of the corner face you and the right. The spot for the corner is now at the bottom front right.',
      'Find the corner. If it is in the top layer, turn the top until it sits right above its spot.',
      'Repeat R U R\' U\' until the corner drops in with white on the bottom. You need it 1, 3 or 5 times.',
      'If the corner is stuck in the bottom layer in the wrong place, hold it at the bottom front right and do R U R\' once to lift it out.',
    ],
    algorithms: [
      {
        name: 'Insert a corner',
        alg: ALG.cornerInsert,
        when: 'The corner is at the top front right, above its spot. Repeat until it is in.',
        memory: 'People call this the "sexy move". Right up, top left, right down, top right.',
        demo: { setup: inv(times(ALG.cornerInsert, 3)), play: times(ALG.cornerInsert, 3), caption: 'Three rounds of R U R\' U\'. Watch the corner go down and turn.' },
      },
      {
        name: 'Lift a stuck corner',
        alg: ALG.cornerPop,
        when: 'The corner is in the bottom layer, but in the wrong spot or turned the wrong way.',
        demo: { setup: inv(ALG.cornerPop), play: ALG.cornerPop, caption: 'The stuck corner comes up to the top.' },
      },
    ],
    tip: 'R U R\' U\' is the most useful move set on the cube. Practice it until your hands do it without thinking.',
  },
  {
    id: 'middle',
    number: 3,
    name: 'Middle layer',
    short: 'Put the four side edges into the middle layer.',
    goal: 'Put the four edges without yellow into the middle layer. Then two layers are done.',
    look: 'Look in the top layer for an edge with no yellow on it.',
    how: [
      'Turn the cube so the side color of the edge faces you. Turn the top until that sticker sits above its center. It looks like an upside-down T.',
      'Look at the top color of the edge. If it matches the center on the right, use the right-hand move. If it matches the left center, use the left-hand move.',
      'If an edge is stuck in the middle layer in the wrong spot, hold it at the front right and do the right-hand move once. This pushes it out to the top.',
    ],
    algorithms: [
      {
        name: 'Edge to the right',
        alg: ALG.middleRight,
        when: 'The top color of the edge matches the right center.',
        memory: 'Away, right side up, back, right side down. Then the same with the front: back, front, return.',
        demo: { setup: inv(ALG.middleRight), play: ALG.middleRight, caption: 'The edge moves from the top into the front right spot.' },
      },
      {
        name: 'Edge to the left',
        alg: ALG.middleLeft,
        when: 'The top color of the edge matches the left center.',
        memory: 'The mirror image of the right-hand move.',
        demo: { setup: inv(ALG.middleLeft), play: ALG.middleLeft, caption: 'The edge moves from the top into the front left spot.' },
      },
    ],
    tip: 'Both moves have two halves: one takes out the corner, the other puts it back with the edge. If you understand the halves, you never forget the moves.',
  },
  {
    id: 'yellowCross',
    number: 4,
    name: 'Yellow cross',
    short: 'Make a yellow plus sign on top.',
    goal: 'Make the four top edges show yellow on top. The corners do not matter yet.',
    look: 'Look only at the top face. Ignore the corners. You see a dot, an L shape, a line, or a cross.',
    how: [
      'Dot: do the algorithm once. You get an L.',
      'L: turn the top so the L points to the back left, like the hands of a clock at 9:00 and 12:00. Do the algorithm. You get a line.',
      'Line: turn the top so the line goes from left to right. Do the algorithm. You get the cross.',
    ],
    algorithms: [
      {
        name: 'Yellow cross',
        alg: ALG.yellowCross,
        when: 'Dot, L at the back left, or a line from left to right.',
        memory: 'F, then the sexy move (R U R\' U\'), then F\'.',
        demo: { setup: inv(ALG.yellowCross), play: ALG.yellowCross, caption: 'From the line to the cross in one go.' },
      },
    ],
    tip: 'The algorithm is just the corner move from stage 2 with F before and F\' after.',
  },
  {
    id: 'yellowEdges',
    number: 5,
    name: 'Yellow edges',
    short: 'Match the yellow edges with the side colors.',
    goal: 'Make the side sticker of each yellow edge match the center below it.',
    look: 'Turn the top and count how many edges match the centers below them. You can always make at least two match.',
    how: [
      'Turn the top until two edges match.',
      'If the two are next to each other, hold them at the back and on the right. Do the algorithm once.',
      'If the two are opposite each other, hold them at the front and back. Do the algorithm once. Now you have two next to each other.',
      'Turn the top if needed so all four match.',
    ],
    algorithms: [
      {
        name: 'Swap two edges',
        alg: ALG.yellowEdges,
        when: 'Two matching edges are at the back and on the right.',
        memory: 'Right up, top left, right down, top left, right up, top twice, right down, top left.',
        demo: { setup: inv(ALG.yellowEdges), play: ALG.yellowEdges, caption: 'The front and left top edges trade places.' },
      },
    ],
    tip: 'Say it with a rhythm: "R U R\' U, R U2 R\' U". The U2 is the only half turn.',
  },
  {
    id: 'cornerPositions',
    number: 6,
    name: 'Yellow corner spots',
    short: 'Move each yellow corner to its own spot.',
    goal: 'Move each top corner to its own spot. It may still be twisted, and that is fine for now.',
    look: 'A corner is in its spot when its three colors match the three centers around it, in any direction. Yellow does not have to face up.',
    how: [
      'Find a corner that is already in its spot. Hold the cube so it is at the top front right.',
      'Do the algorithm. Check the other three corners. If they are not in place yet, do the algorithm once more.',
      'If no corner is in its spot, do the algorithm once from any side. Then one corner is in its spot.',
    ],
    algorithms: [
      {
        name: 'Cycle three corners',
        alg: ALG.cornerCycle,
        when: 'A good corner is at the top front right, or no corner is good.',
        memory: 'U R U\' L\', then U R\' U\' L. The second half is the first half with R and L turned around.',
        demo: { setup: inv(ALG.cornerCycle), play: ALG.cornerCycle, caption: 'The top front right corner stays. The other three move in a circle.' },
      },
    ],
    tip: 'Look at the colors, not at where yellow points. Twisted corners get fixed in the last stage.',
  },
  {
    id: 'cornerTwist',
    number: 7,
    name: 'Twist yellow corners',
    short: 'Turn each yellow corner so yellow faces up.',
    goal: 'Twist each top corner so yellow faces up. Then the cube is solved.',
    look: 'A corner needs a twist when its yellow sticker faces the side.',
    how: [
      'Hold the cube with yellow on top and a twisted corner at the top front right. Do not turn the whole cube again until the stage is over.',
      'Repeat R\' D\' R D until yellow faces up on that corner. That takes 2 or 4 times.',
      'The bottom layers look broken now. This is normal. Do not try to fix them.',
      'Turn only the top layer (U) to bring the next twisted corner to the top front right. Repeat R\' D\' R D again.',
      'When all yellow faces up, the bottom repairs itself. Turn the top to line it up. Done!',
    ],
    algorithms: [
      {
        name: 'Twist a corner',
        alg: ALG.cornerTwist,
        when: 'A twisted corner is at the top front right. Repeat until yellow faces up.',
        memory: 'Right down, bottom left, right up, bottom right.',
        demo: { setup: '', play: times(ALG.cornerTwist, 6), caption: 'Six rounds bring the cube back to where it started. That is why the bottom repairs itself.' },
      },
    ],
    tip: 'This stage feels scary the first time, because the cube looks broken. Trust the moves and keep the cube in the same hands.',
  },
];

// ---------------------------------------------------------------------------
// The fast method (CFOP). Case descriptions are worked out from the demo cube,
// so they always match what the demo shows.

/** The cube a demo starts from: the case its algorithm solves. */
const caseOf = (alg: string) => applyMoves(solvedState(), parseMoves(inv(alg)));

const SIDE_WORD: Record<string, string> = { F: 'front', R: 'right', B: 'back', L: 'left' };

function edgeCaseWhen(alg: string, id: string): string {
  const s = caseOf(alg);
  if (id === 'h') return 'No side is finished. Each side shows the edge color of the opposite side, like a checkerboard.';
  if (id === 'z') return 'No side is finished. Each side shows the edge color of a side next to it.';
  const front = topRow(s, 'F')[1];
  const goes = (['R', 'L'] as Face[]).find((f) => topRow(s, f)[0] === front)!;
  return `One side is finished. Hold it at the back. The front edge belongs on the ${SIDE_WORD[goes]}: ${id === 'ua' ? 'the three edges go around' : 'they go around the other way'}.`;
}

export const FAST_STAGES: StageGuide[] = [
  {
    id: 'fCross',
    number: 1,
    name: 'Planned cross',
    short: 'Make the white cross in 8 moves or fewer.',
    goal: 'The same white cross as in the beginner\'s method, but planned all at once instead of one edge at a time.',
    look: 'Find all four white edges before you turn. For each one, think: which center does it belong to, and which move brings it there?',
    how: [
      'Hold the cube with white on the bottom and yellow on top, like always.',
      'Look for edges that you can bring down together, or with one move each. A white edge on top, right above its center, needs only a half turn.',
      'Use the bottom layer (D) to move an edge you already placed out of the way, then put it back.',
      'The app shows the shortest cross for your cube. Try to find your own first, then compare.',
    ],
    algorithms: [
      {
        name: 'Two edges with two moves',
        alg: 'F2 R2',
        when: 'Two white edges sit on top, each one right above its own center.',
        demo: { setup: 'R2 F2', play: 'F2 R2', caption: 'One half turn for each edge. No edge needs more than that.' },
      },
    ],
    tip: 'Every cross can be done in 8 moves or fewer. Fast solvers plan it during the 15 seconds they may look at the cube before the timer starts.',
  },
  {
    id: 'f2l',
    number: 2,
    name: 'First two layers (F2L)',
    short: 'Join each white corner with its edge, then insert the pair.',
    goal: 'Finish the first two layers with 4 pairs. Each pair is a white corner and the middle-layer edge with the same two side colors.',
    look: 'Pick a pair whose corner and edge are both on top. Hold the cube so their slot is at the front right.',
    how: [
      'Turn the top so the corner and the edge are not yet stuck together the wrong way.',
      'Bring them together on top, with the matching colors side by side. They form a small 1 × 1 × 2 block.',
      'Put the block into its slot in one go, usually with R U R\' or F\' U\' F.',
      'If a piece is stuck in a wrong slot, hold that slot at the front right and lift it out with R U R\'.',
    ],
    algorithms: [
      {
        name: 'Corner and edge far apart',
        alg: "R U R'",
        when: 'The corner is at the top front right with white facing right, and the edge is at the back of the top.',
        memory: 'R lifts the slot, U brings the corner over its edge, R\' drops both in.',
        demo: { setup: inv("R U R'"), play: "R U R'", caption: 'R U R\' joins the pair and inserts it at the same time.' },
      },
      {
        name: 'The same, mirrored',
        alg: "F' U' F",
        when: 'The corner is at the top front right with white facing you, and the edge is on the left of the top.',
        demo: { setup: inv("F' U' F"), play: "F' U' F", caption: 'The mirror image of R U R\', with the front face.' },
      },
      {
        name: 'Pair already joined',
        alg: "U R U' R'",
        when: 'The corner and edge already stick together on top, at the top front right and top right.',
        demo: { setup: inv("U R U' R'"), play: "U R U' R'", caption: 'U moves the block away, R U\' R\' brings the slot up and drops the block in.' },
      },
      {
        name: 'White facing up',
        alg: "R U2 R' U' R U R'",
        when: 'The corner is at the top front right with white facing up, and the edge is at the top right.',
        memory: 'R U2 R\' turns it into the first case, then U\' R U R\' finishes it.',
        demo: { setup: inv("R U2 R' U' R U R'"), play: "R U2 R' U' R U R'", caption: 'First pair them up, then insert the block.' },
      },
    ],
    tip: 'F2L is learned by understanding, not memorizing. Watch what each R or F does to your pair, and how the next move undoes it so the cross stays safe.',
  },
  {
    id: 'ollEdges',
    number: 3,
    name: 'Yellow cross',
    short: 'Make a yellow plus sign on top.',
    goal: 'Exactly like stage 4 of the beginner\'s method: make the four top edges show yellow on top.',
    look: 'Look only at the top face and ignore the corners. You see a dot, an L shape, a line, or a cross.',
    how: [
      'Dot: do the algorithm once. You get an L.',
      'L: turn the top so the L points to the back left. Do the algorithm. You get a line.',
      'Line: turn the top so the line goes from left to right. Do the algorithm. You get the cross.',
    ],
    algorithms: [
      {
        name: 'Yellow cross',
        alg: ALG.yellowCross,
        when: 'Dot, L at the back left, or a line from left to right.',
        demo: { setup: inv(ALG.yellowCross), play: ALG.yellowCross, caption: 'From the line to the cross in one go.' },
      },
    ],
    tip: 'Fast solvers later learn two more algorithms, so the L and the dot each take only one algorithm.',
  },
  {
    id: 'ollCorners',
    number: 4,
    name: 'Yellow face',
    short: 'Turn all the yellow corners up with one of 7 algorithms.',
    goal: 'Make the whole top face yellow in one algorithm. The beginner\'s method needs a corner-by-corner twist for this.',
    look: 'Count the corners with yellow on top (0, 1 or 2), then look at where the other yellow stickers point. That tells you the case.',
    how: [
      'Find your case below by where the yellow stickers of the four top corners point.',
      'Turn the top until they point exactly like in the case.',
      'Do the algorithm for that case. The top face is now all yellow.',
    ],
    algorithms: OLL_CORNERS.map((c) => ({
      name: c.name,
      alg: c.alg,
      when: `Yellow stickers of the top corners: ${yellowCornerLook(caseOf(c.alg))}.`,
      memory:
        c.id === 'sune'
          ? 'R U R\' U, R U2 R\'. Learn this one first: Anti-Sune is the same moves backwards.'
          : c.id === 'antisune'
            ? 'The Sune played backwards.'
            : undefined,
      demo: { setup: inv(c.alg), play: c.alg, caption: `The ${c.name} case. Watch every yellow sticker turn up.` },
    })),
    tip: 'Learn Sune and Anti-Sune first. With only those two you can solve every case: repeat them until the top is yellow. Then learn the others one at a time.',
  },
  {
    id: 'pllCorners',
    number: 5,
    name: 'Last layer corners',
    short: 'Put the yellow corners in the right places.',
    goal: 'Move the top corners to the right places, compared to each other. The edges may get mixed up, and that is fine.',
    look: 'Look at the sides of the top layer. Two corners on one side with the same color look like headlights.',
    how: [
      'Headlights on one side: turn the top so they are on the left. Do the T-perm.',
      'No headlights at all: do the Y-perm.',
      'Headlights on every side: the corners are already done.',
    ],
    algorithms: PLL_CORNERS.map((c) => ({
      name: c.name,
      alg: c.alg,
      when:
        headlights(caseOf(c.alg)).length > 0
          ? `Headlights on the ${headlights(caseOf(c.alg)).map((f) => SIDE_WORD[f]).join(' and ')}.`
          : 'No headlights on any side.',
      demo: { setup: inv(c.alg), play: c.alg, caption: `The ${c.name}. It also swaps two edges.` },
    })),
    tip: 'The T-perm is one of the best-known algorithms in speedcubing. Learn it until your hands play it by themselves.',
  },
  {
    id: 'pllEdges',
    number: 6,
    name: 'Last layer edges',
    short: 'Swap the yellow edges into place. Done!',
    goal: 'Move the top edges to their places. Then turn the top once to finish the cube.',
    look: 'Look for a side whose whole top row has one color: that side is finished.',
    how: [
      'One side finished: hold it at the back. Use Ua or Ub, depending on which way the edges must go around.',
      'No side finished: use H-perm or Z-perm.',
      'Turn the top to line it up with the rest. Solved!',
    ],
    algorithms: PLL_EDGES.map((c) => ({
      name: c.name,
      alg: c.alg,
      when: edgeCaseWhen(c.alg, c.id),
      demo: { setup: inv(c.alg), play: c.alg, caption: `The ${c.name}.` },
    })),
    tip: 'With these 6 algorithms you have the "2-look" last layer. Experts learn all 57 yellow-face cases and all 21 last-layer cases, so each takes one look.',
  },
];

export const STAGE_BY_ID = Object.fromEntries([...STAGES, ...FAST_STAGES].map((s) => [s.id, s])) as Record<StageId, StageGuide>;
