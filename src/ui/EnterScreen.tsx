import { useEffect, useMemo, useState } from 'react';
import { applyMoves, Color, COLORS, CubeState, Face, stickerIndex } from '../cube/cube';
import { colorName } from '../cube/colors';
import { Entered, Problem } from '../cube/validate';
import { Cube3D } from './Cube3D';

interface Props {
  entered: Entered;
  setEntered: (e: Entered) => void;
  problems: Problem[];
  onCheck: () => void;
  onExample: () => void;
  onStartOver: () => void;
  onHome: () => void;
}

const low = (c: Color | null) => (c ? colorName(c).toLowerCase() : 'its');

interface EntryStep {
  face: Face;
  name: string;
  hold: (c: Record<Face, Color | null>) => string;
  /** Whole-cube turns that show this side to the front in the preview. */
  turns: string[];
  rx?: number;
  ry?: number;
}

const STEPS: EntryStep[] = [
  {
    face: 'F',
    name: 'Front',
    hold: (c) =>
      `Hold the cube with the ${low(c.U)} center on top and the ${low(c.F)} center facing you. Copy the 9 colors you see on the front.`,
    turns: [],
  },
  {
    face: 'R',
    name: 'Right',
    hold: (c) =>
      `Turn the whole cube a quarter turn to the left. Keep ${low(c.U)} on top. The ${low(c.R)} center now faces you.`,
    turns: ['y'],
  },
  {
    face: 'B',
    name: 'Back',
    hold: (c) => `Turn the cube to the left again. Keep ${low(c.U)} on top. The ${low(c.B)} center now faces you.`,
    turns: ['y2'],
  },
  {
    face: 'L',
    name: 'Left',
    hold: (c) => `Turn the cube to the left once more. Keep ${low(c.U)} on top. The ${low(c.L)} center now faces you.`,
    turns: ["y'"],
  },
  {
    face: 'U',
    name: 'Top',
    hold: (c) =>
      `Turn the cube back so ${low(c.F)} faces you. Tip the top toward you and look down at the ${low(c.U)} center. The ${low(c.F)} side is now at the bottom of your view.`,
    turns: [],
    rx: -68,
    ry: 0,
  },
  {
    face: 'D',
    name: 'Bottom',
    hold: (c) =>
      `Keep ${low(c.F)} facing you. Tip the cube up so you look at the ${low(c.D)} bottom. The ${low(c.F)} side is now at the top of your view.`,
    turns: [],
    rx: 68,
    ry: 0,
  },
];

const KEYS: Record<string, Color> = { w: 'white', y: 'yellow', g: 'green', b: 'blue', r: 'red', o: 'orange' };

export function EnterScreen({ entered, setEntered, problems, onCheck, onExample, onStartOver, onHome }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [paint, setPaint] = useState<Color>('white');
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const step = STEPS[stepIdx];

  const centers = useMemo(() => {
    const c = {} as Record<Face, Color | null>;
    for (const s of STEPS) c[s.face] = entered[stickerIndex(s.face, 4)];
    return c;
  }, [entered]);

  const problemStickers = useMemo(() => new Set(problems.flatMap((p) => p.stickers)), [problems]);
  const filled = entered.filter(Boolean).length;

  // Keyboard: W Y G B R O choose a color, arrows change the side.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = KEYS[e.key.toLowerCase()];
      if (c) setPaint(c);
      if (e.key === 'ArrowRight') setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setStepIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setSticker = (i: number) => {
    const next = entered.slice();
    next[i] = paint;
    setEntered(next);
  };

  const clearSide = () => {
    const next = entered.slice();
    for (let i = 0; i < 9; i++) if (i !== 4) next[stickerIndex(step.face, i)] = null;
    setEntered(next);
  };

  // Preview: the entered colors, held the way the instructions say.
  const preview = useMemo(
    () => applyMoves(entered.map((c) => c ?? ('none' as Color)) as CubeState, step.turns).map((c) => (c === ('none' as Color) ? null : c)),
    [entered, step.turns],
  );
  const previewFocus = useMemo(() => {
    // Highlight the side being entered, which is in front (or on top or bottom) of the preview.
    const f: Face = step.face === 'U' ? 'U' : step.face === 'D' ? 'D' : 'F';
    return new Set(Array.from({ length: 9 }, (_, i) => stickerIndex(f, i)));
  }, [step.face]);

  const showProblem = (p: Problem) => {
    if (!p.stickers.length) return;
    const face = Math.floor(p.stickers[0] / 9);
    const idx = STEPS.findIndex((s) => stickerIndex(s.face, 0) === face * 9);
    if (idx >= 0) setStepIdx(idx);
    setFlash(new Set(p.stickers));
    window.setTimeout(() => setFlash(new Set()), 1600);
  };

  return (
    <div className="screen enter">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="topbar__title">Enter your cube</div>
        <div className="topbar__meta">{filled} of 54 stickers</div>
      </header>

      <div className="enter__layout">
        <section className="enter__main" aria-label={`${step.name} side`}>
          <div className="eyebrow">
            Side {stepIdx + 1} of 6 · {step.name}
          </div>
          <p className="enter__hold">{step.hold(centers)}</p>

          <div className="enter__work">
            <div className="grid3" role="grid" aria-label={`${step.name} side stickers`}>
              {Array.from({ length: 9 }, (_, i) => {
                const idx = stickerIndex(step.face, i);
                const c = entered[idx];
                return (
                  <button
                    key={i}
                    className={`grid3__cell ${!c ? 'is-empty' : ''} ${problemStickers.has(idx) ? 'is-problem' : ''} ${flash.has(idx) ? 'is-flash' : ''}`}
                    style={{ background: c ? `var(--st-${c})` : undefined }}
                    onClick={() => setSticker(idx)}
                    aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${c ? colorName(c) : 'empty'}${i === 4 ? ' (center)' : ''}`}
                  >
                    {i === 4 ? <span className="grid3__center-mark" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="enter__preview">
              <Cube3D state={preview} rx={step.rx} ry={step.ry} highlight={previewFocus} label="Preview of the colors you entered" />
              <div className="caption">This is how your cube should look in your hands.</div>
            </div>
          </div>

          <div className="palette" role="radiogroup" aria-label="Color to paint">
            {COLORS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={paint === c}
                className={`palette__btn ${paint === c ? 'is-on' : ''}`}
                onClick={() => setPaint(c)}
              >
                <span className="palette__swatch" style={{ background: `var(--st-${c})` }} />
                <span className="palette__name">{colorName(c)}</span>
              </button>
            ))}
          </div>
          <p className="hint">Pick a color, then tap the squares. The middle square is the center. It never moves, so it tells you the color of the side.</p>

          <div className="enter__nav">
            <button className="btn" onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={stepIdx === 0}>
              ← Previous side
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button className="btn btn--primary" onClick={() => setStepIdx((i) => i + 1)}>
                Next side →
              </button>
            ) : (
              <button className="btn btn--primary" onClick={onCheck}>
                Check and solve
              </button>
            )}
          </div>
        </section>

        <aside className="enter__side">
          <div className="eyebrow">All sides</div>
          <div className="net" aria-label="All six sides">
            {STEPS.map((s, k) => (
              <button
                key={s.face}
                className={`net__face net__face--${s.face} ${k === stepIdx ? 'is-on' : ''}`}
                onClick={() => setStepIdx(k)}
                aria-label={`Go to the ${s.name.toLowerCase()} side`}
              >
                {Array.from({ length: 9 }, (_, i) => {
                  const c = entered[stickerIndex(s.face, i)];
                  const idx = stickerIndex(s.face, i);
                  return (
                    <span
                      key={i}
                      className={`net__cell ${problemStickers.has(idx) ? 'is-problem' : ''}`}
                      style={{ background: c ? `var(--st-${c})` : undefined }}
                    />
                  );
                })}
                <span className="net__name">{s.name}</span>
              </button>
            ))}
          </div>

          {problems.length > 0 && (
            <div className="problems" role="alert">
              <div className="problems__title">Please check your cube</div>
              <ul>
                {problems.map((p, i) => (
                  <li key={i}>
                    <span>{p.message}</span>
                    {p.stickers.length > 0 && (
                      <button className="btn btn--small" onClick={() => showProblem(p)}>
                        Show me
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="enter__extra">
            <button className="btn btn--small" onClick={clearSide}>
              Clear this side
            </button>
            <button className="btn btn--small" onClick={onExample}>
              Fill with an example
            </button>
            <button className="btn btn--small" onClick={onStartOver}>
              Start over
            </button>
            <button className="btn btn--small" onClick={onCheck} disabled={filled < 54}>
              Check and solve
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
