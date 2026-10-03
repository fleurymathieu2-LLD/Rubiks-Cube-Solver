import { BASE_MOVES } from '../src/cube/cube';

// Small seeded random generator, so failures can be repeated.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const FACE_MOVES = BASE_MOVES.filter((m) => !'xyz'.includes(m));
export function scramble(seed: number, length = 30): string[] {
  const r = rng(seed);
  const out: string[] = [];
  while (out.length < length) {
    const f = FACE_MOVES[Math.floor(r() * 6)];
    if (out.length && out[out.length - 1][0] === f) continue;
    out.push(f + ['', "'", '2'][Math.floor(r() * 3)]);
  }
  return out;
}

