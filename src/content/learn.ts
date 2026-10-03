import type { StageId } from '../cube/solver';
import { ALG } from '../cube/solver';

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

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageGuide>;
