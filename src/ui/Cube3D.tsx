import { useEffect, useRef, useState } from 'react';
import { Color, FACE_NORMAL, Face, moveInfo, stickerAt, Vec } from '../cube/cube';

export interface Anim {
  move: string;
  /** Changes for every new animation, so the same move can play twice in a row. */
  id: number;
}

interface Props {
  state: (Color | null)[];
  anim?: Anim | null;
  onAnimDone?: () => void;
  /** Milliseconds for one quarter turn. */
  speed?: number;
  highlight?: Set<number>;
  /** Camera angles in degrees. */
  rx?: number;
  ry?: number;
  draggable?: boolean;
  label?: string;
  className?: string;
}

const DEFAULT_RX = -26;
const DEFAULT_RY = -36;

interface Cubie {
  pos: Vec;
  /** All six faces. sticker is -1 for a face inside the cube (plain black plastic). */
  faces: { face: Face; sticker: number }[];
}

// The 26 visible cubies and the sticker on each outward face.
const CUBIES: Cubie[] = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++) {
      if (x === 0 && y === 0 && z === 0) continue;
      const pos: Vec = [x, y, z];
      const faces: Cubie['faces'] = [];
      (Object.keys(FACE_NORMAL) as Face[]).forEach((f) => {
        const n = FACE_NORMAL[f];
        const axis = n.findIndex((v) => v !== 0);
        faces.push({ face: f, sticker: pos[axis] === n[axis] ? stickerAt(pos, n) : -1 });
      });
      CUBIES.push({ pos, faces });
    }

// CSS has y pointing down, so turns about x and z change sign.
const FACE_TRANSFORM: Record<Face, string> = {
  F: 'translateZ(var(--half))',
  B: 'rotateY(180deg) translateZ(var(--half))',
  R: 'rotateY(90deg) translateZ(var(--half))',
  L: 'rotateY(-90deg) translateZ(var(--half))',
  U: 'rotateX(90deg) translateZ(var(--half))',
  D: 'rotateX(-90deg) translateZ(var(--half))',
};

function cssRotation(axis: number, logicalDeg: number): string {
  if (axis === 0) return `rotateX(${-logicalDeg}deg)`;
  if (axis === 1) return `rotateY(${logicalDeg}deg)`;
  return `rotateZ(${-logicalDeg}deg)`;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Cube3D({
  state,
  anim,
  onAnimDone,
  speed = 380,
  highlight,
  rx,
  ry,
  draggable = true,
  label,
  className,
}: Props) {
  const [view, setView] = useState({ rx: rx ?? DEFAULT_RX, ry: ry ?? DEFAULT_RY });
  const [angle, setAngle] = useState(0);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const doneRef = useRef(onAnimDone);
  doneRef.current = onAnimDone;

  // Follow camera changes from the parent.
  useEffect(() => {
    setView({ rx: rx ?? DEFAULT_RX, ry: ry ?? DEFAULT_RY });
  }, [rx, ry]);

  // Play one move.
  useEffect(() => {
    if (!anim) return;
    const { turns, turn } = moveInfo(anim.move);
    const quarter = turns === 3 ? -1 : turns;
    const target = turn.dir * 90 * quarter;
    const duration = reducedMotion() ? 1 : speed * (turns === 2 ? 1.5 : 1);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setAngle(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setAngle(0);
        doneRef.current?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const moving = anim ? moveInfo(anim.move).turn : null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rx: view.rx, ry: view.ry };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const nrx = Math.max(-85, Math.min(85, d.rx - (e.clientY - d.y) * 0.4));
    setView({ rx: nrx, ry: d.ry + (e.clientX - d.x) * 0.4 });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className={`cube3d ${draggable ? 'cube3d--drag' : ''} ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => setView({ rx: rx ?? DEFAULT_RX, ry: ry ?? DEFAULT_RY })}
      role="img"
      aria-label={label ?? 'Cube'}
    >
      <div
        className="cube3d__scene"
        style={{ transform: `rotateX(${view.rx}deg) rotateY(${view.ry}deg)` }}
      >
        {CUBIES.map((c) => {
          const inLayer = moving && moving.layers.includes(c.pos[moving.axis]);
          const spin = inLayer && moving ? cssRotation(moving.axis, angle) + ' ' : '';
          return (
            <div
              key={c.pos.join()}
              className="cube3d__cubie"
              style={{
                transform: `${spin}translate3d(calc(${c.pos[0]} * var(--cell)), calc(${-c.pos[1]} * var(--cell)), calc(${c.pos[2]} * var(--cell)))`,
              }}
            >
              {c.faces.map(({ face, sticker }) => {
                if (sticker < 0)
                  return <div key={face} className="cube3d__face" style={{ transform: FACE_TRANSFORM[face] }} />;
                const color = state[sticker];
                const hl = highlight?.has(sticker);
                return (
                  <div key={face} className="cube3d__face" style={{ transform: FACE_TRANSFORM[face] }}>
                    <div
                      className={`cube3d__sticker ${hl ? 'is-focus' : ''} ${highlight && highlight.size && !hl ? 'is-dim' : ''}`}
                      style={{ background: color ? `var(--st-${color})` : 'var(--st-empty)' }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
