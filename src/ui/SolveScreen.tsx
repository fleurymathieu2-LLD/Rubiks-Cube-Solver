import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invertMove } from '../cube/cube';
import { colorName } from '../cube/colors';
import { Solution, STAGE_ORDER } from '../cube/solver';
import { describeMove, STAGE_BY_ID } from '../content/learn';
import { Anim, Cube3D } from './Cube3D';
import { ColorChip } from './Chip';
import { MoveIcon } from './MoveIcon';
import { buildPlan, focusStickers, stateAt } from './plan';

interface Props {
  solution: Solution;
  position: { step: number; move: number };
  setPosition: (p: { step: number; move: number }) => void;
  explain: boolean;
  setExplain: (v: boolean) => void;
  onHome: () => void;
  onNewCube: () => void;
  onLearn: (stage?: string) => void;
}

const HOLD_TEXT: Record<string, string> = {
  y: 'Turn the whole cube to the left',
  "y'": 'Turn the whole cube to the right',
  y2: 'Turn the whole cube around',
};

export function SolveScreen({ solution, position, setPosition, explain, setExplain, onHome, onNewCube, onLearn }: Props) {
  const plan = useMemo(() => buildPlan(solution), [solution]);
  const [anim, setAnim] = useState<(Anim & { back: boolean }) | null>(null);
  const [playing, setPlaying] = useState(false);
  const animId = useRef(0);

  const done = plan.length === 0 || position.step >= plan.length;
  const step = plan[Math.min(position.step, plan.length - 1)];
  const n = position.move;

  // The cube shown on screen. While a move plays back, it starts from the later state.
  const shown = useMemo(() => {
    if (!step) return solution.start;
    if (done) return stateAt(plan[plan.length - 1], plan[plan.length - 1].seq.length);
    return stateAt(step, n);
  }, [step, n, done, plan, solution.start]);

  const highlight = useMemo(
    () => (step && !done ? focusStickers(shown, step.focus) : new Set<number>()),
    [shown, step, done],
  );

  const forward = useCallback(() => {
    if (anim || done) return;
    if (n < step.seq.length) {
      setAnim({ move: step.seq[n].move, id: ++animId.current, back: false });
    } else {
      setPosition({ step: position.step + 1, move: 0 });
    }
  }, [anim, done, n, step, position.step, setPosition]);

  const backward = useCallback(() => {
    if (anim) return;
    setPlaying(false);
    if (done) {
      const last = plan.length - 1;
      if (last >= 0) setPosition({ step: last, move: plan[last].seq.length });
      return;
    }
    if (n > 0) {
      // Show the cube as it was, then undo the last move.
      setPosition({ step: position.step, move: n - 1 });
      setAnim({ move: invertMove(step.seq[n - 1].move), id: ++animId.current, back: true });
    } else if (position.step > 0) {
      const prev = plan[position.step - 1];
      setPosition({ step: position.step - 1, move: prev.seq.length });
    }
  }, [anim, done, n, step, position.step, plan, setPosition]);

  const animRef = useRef(anim);
  animRef.current = anim;
  const onAnimDone = useCallback(() => {
    const a = animRef.current;
    if (a && !a.back) setPosition({ step: position.step, move: n + 1 });
    setAnim(null);
  }, [position.step, n, setPosition]);

  // Auto play: keep going until the end of the step.
  useEffect(() => {
    if (!playing || anim || done) return;
    if (n >= step.seq.length) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(forward, 260);
    return () => window.clearTimeout(t);
  }, [playing, anim, done, n, step, forward]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') forward();
      if (e.key === 'ArrowLeft') backward();
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [forward, backward]);

  // In the normal view you see the top (stickers 0-8), right (9-17) and front (18-26).
  const focusHidden = highlight.size > 0 && ![...highlight].some((i) => i < 27);

  // While a backward move plays, the screen shows the state before the undo.
  const cubeState = anim?.back && step ? stateAt(step, n + 1) : shown;

  if (plan.length === 0) {
    return (
      <div className="screen solve">
        <header className="topbar">
          <button className="btn btn--ghost" onClick={onHome}>← Home</button>
          <div className="topbar__title">Your solution</div>
          <div />
        </header>
        <div className="finish">
          <Cube3D state={solution.start} label="Solved cube" />
          <h2>This cube is already solved.</h2>
          <button className="btn btn--primary" onClick={onNewCube}>Enter another cube</button>
        </div>
      </div>
    );
  }

  const stageIdx = STAGE_ORDER.indexOf(step.stage);
  const guide = STAGE_BY_ID[step.stage];
  const firstOfStage = position.step === 0 || plan[position.step - 1].stage !== step.stage;
  const current = !done && n < step.seq.length ? step.seq[n] : null;
  const stageSteps = plan.filter((s) => s.stage === step.stage);
  const stepInStage = stageSteps.findIndex((s) => s.index === step.index) + 1;

  return (
    <div className="screen solve">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={onHome}>← Home</button>
        <div className="topbar__title">
          {done ? 'Solved!' : `Step ${position.step + 1} of ${plan.length}`}
        </div>
        <button
          className={`btn btn--toggle ${explain ? 'is-on' : ''}`}
          aria-pressed={explain}
          onClick={() => setExplain(!explain)}
        >
          {explain ? 'Explain: on' : 'Explain: off'}
        </button>
      </header>

      <nav className="stages" aria-label="Stages">
        {STAGE_ORDER.map((id, i) => {
          const steps = plan.filter((s) => s.stage === id);
          const first = steps[0];
          const state = done || i < stageIdx ? 'done' : i === stageIdx ? 'now' : 'next';
          return (
            <button
              key={id}
              className={`stages__item is-${state}`}
              disabled={!first}
              onClick={() => first && setPosition({ step: first.index, move: 0 })}
              title={STAGE_BY_ID[id].name}
            >
              <span className="stages__num">{i + 1}</span>
              <span className="stages__name">{STAGE_BY_ID[id].name}</span>
              {!first && <span className="stages__skip">already done</span>}
            </button>
          );
        })}
      </nav>

      <div className="solve__layout">
        <section className="solve__cube">
          <Cube3D
            state={cubeState}
            anim={anim}
            onAnimDone={onAnimDone}
            highlight={highlight}
            label="Your cube"
          />
          {focusHidden ? (
            <div className="caption caption--note">The piece for this step is at the back or bottom. Drag the cube to see it.</div>
          ) : (
            <div className="caption">Drag to look around the cube. Double-tap to reset the view.</div>
          )}
        </section>

        <section className="solve__panel" aria-live="polite">
          {done ? (
            <div className="finish">
              <div className="eyebrow">All 7 stages done</div>
              <h2>Your cube is solved!</h2>
              <p>
                You made {solution.totalMoves} moves in {plan.length} steps. Every time you solve with the app, you
                learn the patterns a little more. Turn on <b>Explain</b> next time to learn why each step works.
              </p>
              <div className="row">
                <button className="btn btn--primary" onClick={onNewCube}>Solve another cube</button>
                <button className="btn" onClick={() => onLearn()}>Learn the method</button>
              </div>
            </div>
          ) : (
            <>
              <div className="eyebrow">
                Stage {stageIdx + 1} of 7 · {guide.name}
                {stageSteps.length > 1 ? ` · part ${stepInStage} of ${stageSteps.length}` : ''}
              </div>

              {firstOfStage && n === 0 && (
                <div className="stage-intro">
                  <b>New stage: {guide.name}.</b> {guide.goal}
                </div>
              )}

              <h2 className="step-title">{step.title}</h2>

              <div className="hold">
                <span className="hold__label">Hold</span>
                <ColorChip color={step.front} label="front" />
                <ColorChip color={step.top} label="top" />
              </div>

              <p className="instruction">{step.instruction}</p>

              <div className="seq" aria-label="Moves for this step">
                {step.seq.some((m) => m.kind === 'hold') && (
                  <div className="seq__part">
                    <div className="seq__label">Turn the cube</div>
                    <div className="seq__moves">
                      {step.seq
                        .map((m, i) => ({ m, i }))
                        .filter(({ m }) => m.kind === 'hold')
                        .map(({ m, i }) => (
                          <button
                            key={i}
                            className={`tok tok--hold ${i < n ? 'is-done' : i === n ? 'is-now' : ''}`}
                            onClick={() => !anim && setPosition({ step: position.step, move: i })}
                          >
                            {HOLD_TEXT[m.move]}: {colorName(step.front)} to the front
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {step.parts.map((p, pi) => {
                  const idxs = step.seq.map((m, i) => ({ m, i })).filter(({ m }) => m.part === pi);
                  const roundNow = current && current.part === pi ? current.round : null;
                  // Show one round of tokens. Their state follows the current round.
                  const round = roundNow ?? (idxs.length && idxs[idxs.length - 1].i < n ? p.repeat : 1);
                  const shownIdx = idxs.filter(({ m }) => m.round === round);
                  return (
                    <div className="seq__part" key={pi}>
                      <div className="seq__label">
                        {p.label}
                        {p.repeat > 1 && (
                          <span className="seq__repeat">
                            × {p.repeat}
                            {roundNow ? ` · round ${roundNow} of ${p.repeat}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="seq__moves">
                        {shownIdx.map(({ m, i }) => (
                          <button
                            key={i}
                            className={`tok ${i < n ? 'is-done' : i === n ? 'is-now' : ''}`}
                            onClick={() => !anim && setPosition({ step: position.step, move: i })}
                            aria-label={`Go to move ${m.move}`}
                          >
                            {m.move}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`now ${current ? '' : 'now--end'}`}>
                {current ? (
                  <>
                    <MoveIcon move={current.move} size={84} />
                    <div className="now__text">
                      <div className="now__move">{current.kind === 'hold' ? 'Turn the cube' : current.move}</div>
                      <div className="now__desc">
                        {current.kind === 'hold'
                          ? `${HOLD_TEXT[current.move]}. Keep ${colorName(step.top).toLowerCase()} on top. ${colorName(step.front)} is now in front.`
                          : describeMove(current.move)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="now__text">
                    <div className="now__move">Step done ✓</div>
                    <div className="now__desc">
                      Compare your cube with the picture. When it matches, go to the next step.
                    </div>
                  </div>
                )}
              </div>

              {explain && (
                <div className="explain">
                  <div className="explain__title">Why this works</div>
                  <p>{step.why}</p>
                  <button className="link" onClick={() => onLearn(step.stage)}>
                    Read the full guide for “{guide.name}” →
                  </button>
                </div>
              )}

              <div className="controls">
                <button className="btn btn--big" onClick={backward} disabled={position.step === 0 && n === 0} aria-label="Previous move">
                  ◀ Back
                </button>
                <button
                  className="btn btn--big"
                  onClick={() => setPlaying((p) => !p)}
                  disabled={!current}
                  aria-label={playing ? 'Pause' : 'Play the rest of this step'}
                >
                  {playing ? 'Pause' : 'Play step'}
                </button>
                <button className="btn btn--big btn--primary" onClick={forward} aria-label="Next move">
                  {current ? 'Next move ▶' : position.step + 1 < plan.length ? 'Next step ▶' : 'Finish ▶'}
                </button>
              </div>
              <div className="caption">Tip: on a keyboard, use the arrow keys and the space bar.</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
