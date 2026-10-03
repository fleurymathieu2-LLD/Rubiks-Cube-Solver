import { describe, expect, it } from 'vitest';
import {
  applyMoves, BASE_MOVES, isSolved, parseMoves, solvedState, stickerIndex, invertMoves, simplifyMoves,
  EDGE_SLOTS, CORNER_SLOTS,
} from '../src/cube/cube';

const solved = solvedState();
const repeat = (alg: string, n: number) => Array.from({ length: n }, () => parseMoves(alg)).flat();

describe('cube model', () => {
  it('has 12 edges and 8 corners', () => {
    expect(EDGE_SLOTS.map((s) => s.name).sort()).toEqual(
      ['BL', 'BR', 'DB', 'DF', 'DL', 'DR', 'FL', 'FR', 'UB', 'UF', 'UL', 'UR'],
    );
    expect(CORNER_SLOTS.map((s) => s.name).sort()).toEqual(
      ['DBL', 'DBR', 'DFL', 'DFR', 'UBL', 'UBR', 'UFL', 'UFR'],
    );
  });

  it('returns to solved after four quarter turns of any move', () => {
    for (const m of BASE_MOVES) expect(isSolved(applyMoves(solved, [m, m, m, m]))).toBe(true);
  });

  it('R turns the front right column up (white from the bottom comes to the front)', () => {
    const s = applyMoves(solved, ['R']);
    for (const i of [2, 5, 8]) expect(s[stickerIndex('F', i)]).toBe('white');
    for (const i of [2, 5, 8]) expect(s[stickerIndex('U', i)]).toBe('green');
    for (const i of [0, 3, 6]) expect(s[stickerIndex('B', i)]).toBe('yellow');
  });

  it('U moves the front top row to the left', () => {
    const s = applyMoves(solved, ['U']);
    for (const i of [0, 1, 2]) expect(s[stickerIndex('L', i)]).toBe('green');
    for (const i of [0, 1, 2]) expect(s[stickerIndex('F', i)]).toBe('orange');
  });

  it('L turns the front left column down, D turns the front bottom row to the right', () => {
    const l = applyMoves(solved, ['L']);
    for (const i of [0, 3, 6]) expect(l[stickerIndex('D', i)]).toBe('green');
    const d = applyMoves(solved, ['D']);
    for (const i of [6, 7, 8]) expect(d[stickerIndex('R', i)]).toBe('green');
  });

  it('F turns the top row of the front onto the right side', () => {
    const s = applyMoves(solved, ['F']);
    for (const i of [0, 3, 6]) expect(s[stickerIndex('R', i)]).toBe('yellow');
  });

  it('matches known move orders: (R U) is 105, (R U R\' U\') is 6', () => {
    expect(isSolved(applyMoves(solved, repeat('R U', 105)))).toBe(true);
    expect(isSolved(applyMoves(solved, repeat('R U', 35)))).toBe(false);
    expect(isSolved(applyMoves(solved, repeat('R U', 21)))).toBe(false);
    expect(isSolved(applyMoves(solved, repeat("R U R' U'", 6)))).toBe(true);
    expect(isSolved(applyMoves(solved, repeat("R U R' U'", 3)))).toBe(false);
  });

  it('y brings the right face to the front', () => {
    const s = applyMoves(solved, ['y']);
    expect(s[stickerIndex('F', 4)]).toBe('orange');
    expect(s[stickerIndex('U', 4)]).toBe('yellow');
  });

  it('inverts and simplifies', () => {
    const alg = parseMoves("R U2 F' D B L'");
    expect(isSolved(applyMoves(solved, [...alg, ...invertMoves(alg)]))).toBe(true);
    expect(simplifyMoves(parseMoves("U U R R' F U' U'"))).toEqual(['U2', 'F', 'U2']);
  });
});
