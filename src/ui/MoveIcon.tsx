// A small front view of the cube with an arrow that shows the turn.

import type { ReactElement } from 'react';

interface Props {
  move: string;
  size?: number;
}

const CELL = 20;
const O = 10; // grid offset inside the 80 x 80 view box

export function MoveIcon({ move, size = 72 }: Props) {
  const base = move[0];
  const prime = move.endsWith("'");
  const double = move.endsWith('2');

  // Which cells turn: [col, row] pairs.
  const cells: [number, number][] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const on =
        (base === 'R' && c === 2) ||
        (base === 'L' && c === 0) ||
        (base === 'U' && r === 0) ||
        (base === 'D' && r === 2) ||
        base === 'F' ||
        base === 'y';
      if (on) cells.push([c, r]);
    }

  // Straight arrows: start and end points, center of the cell column or row.
  const mid = (i: number) => O + CELL * i + CELL / 2;
  let arrow: ReactElement | null = null;
  const straight = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} className="mi-arrow" markerEnd="url(#mi-head)" />
  );
  const top = O + 4;
  const bottom = O + CELL * 3 - 4;
  const left = O + 4;
  const right = O + CELL * 3 - 4;

  if (base === 'R') arrow = prime ? straight(mid(2), top, mid(2), bottom) : straight(mid(2), bottom, mid(2), top);
  if (base === 'L') arrow = prime ? straight(mid(0), bottom, mid(0), top) : straight(mid(0), top, mid(0), bottom);
  if (base === 'U') arrow = prime ? straight(left, mid(0), right, mid(0)) : straight(right, mid(0), left, mid(0));
  if (base === 'D') arrow = prime ? straight(right, mid(2), left, mid(2)) : straight(left, mid(2), right, mid(2));
  if (base === 'F' || base === 'B') {
    // A circle arrow. Clockwise for F, and for B' (B turns the other way when seen from the front).
    const cw = base === 'F' ? !prime : prime;
    const r = 19;
    const cx = 40;
    const cy = 40;
    // Screen angles grow clockwise. Each arc covers 270 degrees.
    const a0 = cw ? -150 : -30;
    const a1 = cw ? 120 : 60;
    const p = (deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    arrow = (
      <path
        d={`M ${x0} ${y0} A ${r} ${r} 0 1 ${cw ? 1 : 0} ${x1} ${y1}`}
        className="mi-arrow"
        fill="none"
        markerEnd="url(#mi-head)"
      />
    );
  }
  if (base === 'y') {
    const toLeft = !prime;
    arrow = toLeft ? straight(right + 2, 40, left - 2, 40) : straight(left - 2, 40, right + 2, 40);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={`move-icon ${base === 'B' ? 'move-icon--back' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <marker id="mi-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="mi-head" />
        </marker>
      </defs>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={O + c * CELL + 1.5}
            y={O + r * CELL + 1.5}
            width={CELL - 3}
            height={CELL - 3}
            rx={3}
            className={cells.some(([cc, rr]) => cc === c && rr === r) ? 'mi-cell mi-cell--on' : 'mi-cell'}
          />
        )),
      )}
      {arrow}
      {double && (
        <g>
          <circle cx={68} cy={12} r={9} className="mi-badge" />
          <text x={68} y={16} textAnchor="middle" className="mi-badge-text">
            2
          </text>
        </g>
      )}
      {base === 'B' && (
        <text x={40} y={78} textAnchor="middle" className="mi-note">
          back
        </text>
      )}
    </svg>
  );
}
