import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, applyMoves, CubeState, parseMoves, solvedState } from '../cube/cube';
import { describeMove, NOTATION_INTRO, NOTATION_MOVES, STAGES } from '../content/learn';
import { Anim, Cube3D } from './Cube3D';
import { MoveIcon } from './MoveIcon';

interface Props {
  onHome: () => void;
  focusStage?: string | null;
}

interface DemoState {
  title: string;
  caption: string;
  start: CubeState;
  moves: string[];
}

export function LearnScreen({ onHome, focusStage }: Props) {
  const [demo, setDemo] = useState<DemoState>({
    title: 'Solved cube',
    caption: 'Tap a "Show me" button to watch a move or an algorithm here.',
    start: solvedState(),
    moves: [],
  });
  const [done, setDone] = useState(0);
  const [state, setState] = useState<CubeState>(solvedState());
  const [anim, setAnim] = useState<Anim | null>(null);
  const [playing, setPlaying] = useState(false);
  const animId = useRef(0);

  useEffect(() => {
    if (!focusStage) return;
    document.getElementById(`stage-${focusStage}`)?.scrollIntoView({ block: 'start' });
  }, [focusStage]);

  const show = (d: DemoState) => {
    setDemo(d);
    setState(d.start);
    setDone(0);
    setAnim(null);
    setPlaying(true);
  };

  const onAnimDone = useCallback(() => {
    setState((s) => (anim ? applyMove(s, anim.move) : s));
    setDone((n) => n + 1);
    setAnim(null);
  }, [anim]);

  useEffect(() => {
    if (!playing || anim) return;
    if (done >= demo.moves.length) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setAnim({ move: demo.moves[done], id: ++animId.current }), done === 0 ? 700 : 180);
    return () => window.clearTimeout(t);
  }, [playing, anim, done, demo.moves]);

  return (
    <div className="screen learn">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={onHome}>← Home</button>
        <div className="topbar__title">Learn the method</div>
        <div />
      </header>

      <div className="learn__layout">
        <aside className="learn__demo" aria-label="Demo cube">
          <Cube3D state={state} anim={anim} onAnimDone={onAnimDone} speed={330} label="Demo cube" />
          <div className="learn__demo-text">
            <div className="learn__demo-title">{demo.title}</div>
            {demo.moves.length > 0 && (
              <div className="learn__demo-moves">
                {demo.moves.map((m, i) => (
                  <span key={i} className={`tok tok--small ${i < done ? 'is-done' : i === done && playing ? 'is-now' : ''}`}>
                    {m}
                  </span>
                ))}
              </div>
            )}
            <p className="caption">{demo.caption}</p>
            {demo.moves.length > 0 && (
              <button className="btn btn--small" onClick={() => show(demo)} disabled={playing}>
                Play again
              </button>
            )}
          </div>
        </aside>

        <article className="learn__text">
          <section className="learn__section" id="notation">
            <div className="eyebrow">Before you start</div>
            <h2>How to read the moves</h2>
            {NOTATION_INTRO.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="movegrid">
              {NOTATION_MOVES.map((m) => (
                <button
                  key={m}
                  className="movecard"
                  onClick={() =>
                    show({ title: `The move ${m}`, caption: describeMove(m), start: solvedState(), moves: [m] })
                  }
                >
                  <MoveIcon move={m} size={56} />
                  <span className="movecard__name">{m}</span>
                  <span className="movecard__desc">{describeMove(m)}</span>
                </button>
              ))}
            </div>
            <p>
              <b>How you hold the cube:</b> white on the bottom and yellow on top, for the whole solve. Between steps
              you only turn the cube left or right, so a different color faces you.
            </p>
          </section>

          {STAGES.map((st) => (
            <section className="learn__section" key={st.id} id={`stage-${st.id}`}>
              <div className="eyebrow">Stage {st.number} of 7</div>
              <h2>{st.name}</h2>
              <p className="lead">{st.goal}</p>
              <p>
                <b>What to look for:</b> {st.look}
              </p>
              <ol className="howto">
                {st.how.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
              {st.algorithms.map((a) => (
                <div className="alg" key={a.name}>
                  <div className="alg__head">
                    <div>
                      <div className="alg__name">{a.name}</div>
                      <div className="alg__moves">
                        {parseMoves(a.alg).map((m, i) => (
                          <span key={i} className="tok tok--small">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn--small btn--primary"
                      onClick={() =>
                        show({
                          title: a.name,
                          caption: a.demo.caption,
                          start: applyMoves(solvedState(), a.demo.setup ? parseMoves(a.demo.setup) : []),
                          moves: parseMoves(a.demo.play),
                        })
                      }
                    >
                      Show me
                    </button>
                  </div>
                  <p>
                    <b>When:</b> {a.when}
                  </p>
                  {a.memory && (
                    <p>
                      <b>Remember it:</b> {a.memory}
                    </p>
                  )}
                </div>
              ))}
              <p className="tip">
                <b>Tip:</b> {st.tip}
              </p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
