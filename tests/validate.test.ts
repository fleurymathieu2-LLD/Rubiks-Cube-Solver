import { describe, expect, it } from 'vitest';
import { applyMoves, CubeState, solvedState, stickerIndex, slot } from '../src/cube/cube';
import { validate } from '../src/cube/validate';
import { scramble } from './helpers';

const swap = (s: CubeState, a: number, b: number) => {
  const t = s.slice();
  [t[a], t[b]] = [t[b], t[a]];
  return t;
};

describe('validate', () => {
  it('accepts solved and scrambled cubes, including other holds', () => {
    expect(validate(solvedState())).toEqual([]);
    for (let seed = 1; seed <= 500; seed++) {
      expect(validate(applyMoves(solvedState(), scramble(seed)))).toEqual([]);
    }
    expect(validate(applyMoves(solvedState(), ['x', 'y', ...scramble(3)]))).toEqual([]);
  });

  it('reports empty stickers', () => {
    const s: (string | null)[] = solvedState().slice();
    s[3] = null;
    s[10] = null;
    const p = validate(s as never);
    expect(p[0].message).toMatch(/2 stickers have no color/);
    expect(p[0].stickers).toEqual([3, 10]);
  });

  it('reports wrong color counts', () => {
    const s = solvedState().slice();
    s[stickerIndex('F', 0)] = 'red';
    const p = validate(s);
    expect(p[0].message).toMatch(/10 red, 8 green/);
  });

  it('reports a flipped edge', () => {
    const e = slot('UF').stickers;
    const p = validate(swap(applyMoves(solvedState(), scramble(9)), e[0], e[1]));
    expect(p.map((x) => x.message).join()).toMatch(/edge is flipped/);
  });

  it('reports a twisted corner', () => {
    const c = slot('UFR').stickers;
    const s = applyMoves(solvedState(), scramble(11));
    const t = s.slice();
    [t[c[0]], t[c[1]], t[c[2]]] = [s[c[1]], s[c[2]], s[c[0]]];
    const p = validate(t);
    expect(p.map((x) => x.message).join()).toMatch(/corner is twisted/);
  });

  it('reports a corner in mirror order', () => {
    const c = slot('DFL').stickers;
    const p = validate(swap(applyMoves(solvedState(), scramble(12)), c[1], c[2]));
    expect(p.map((x) => x.message).join()).toMatch(/impossible order/);
  });

  it('reports two swapped edges', () => {
    const s = applyMoves(solvedState(), scramble(13));
    const a = slot('UF').stickers;
    const b = slot('UB').stickers;
    const t = swap(swap(s, a[0], b[0]), a[1], b[1]);
    const p = validate(t);
    expect(p.map((x) => x.message).join()).toMatch(/swapped/);
  });

  it('reports impossible edges and bad centers', () => {
    const s = solvedState().slice();
    // Swap green (front top edge) with white (bottom front edge): the top edge becomes yellow and white.
    const t = swap(s, stickerIndex('F', 1), stickerIndex('D', 1));
    expect(validate(t)[0].message).toMatch(/edge has/);
    const c = swap(s, stickerIndex('F', 4), stickerIndex('R', 4));
    expect(validate(c)[0].message).toMatch(/center stickers/);
  });

  it('reports sides entered in the wrong order', () => {
    // Swap the whole right and left sides.
    const s = solvedState().slice();
    const t = s.slice();
    for (let i = 0; i < 9; i++) {
      t[stickerIndex('R', i)] = s[stickerIndex('L', i)];
      t[stickerIndex('L', i)] = s[stickerIndex('R', i)];
    }
    // Centers are still opposite pairs, so the check must come from the corners.
    expect(validate(t)[0].message).toMatch(/mirror order/);
    // A real cube held another way is fine.
    expect(validate(applyMoves(s, ['z', 'y']))).toEqual([]);
  });
});
