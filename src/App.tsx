import { useEffect, useMemo, useState } from 'react';
import { applyMoves, Color, CubeState, Face, FACES, parseMoves, solvedState, stickerIndex, SOLVED_COLORS } from './cube/cube';
import { solve, Solution, STAGE_ORDER } from './cube/solver';
import { Entered, Problem, validate } from './cube/validate';
import { STAGE_BY_ID } from './content/learn';
import { Cube3D } from './ui/Cube3D';
import { EnterScreen } from './ui/EnterScreen';
import { LearnScreen } from './ui/LearnScreen';
import { SolveScreen } from './ui/SolveScreen';
import { load, save } from './ui/storage';

type Screen = 'home' | 'enter' | 'solve' | 'learn';

/** An empty cube: only the centers are filled in, in the standard colors. */
function blankCube(): Entered {
  const e: Entered = Array(54).fill(null);
  FACES.forEach((f: Face) => (e[stickerIndex(f, 4)] = SOLVED_COLORS[f]));
  return e;
}

function randomScramble(length = 25): string[] {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const out: string[] = [];
  while (out.length < length) {
    const f = faces[Math.floor(Math.random() * 6)];
    if (out.length && out[out.length - 1][0] === f) continue;
    out.push(f + ['', "'", '2'][Math.floor(Math.random() * 3)]);
  }
  return out;
}

// A fixed example for the home screen, so it always looks the same.
const HOME_EXAMPLE = applyMoves(solvedState(), parseMoves("R U' F2 L D B' R2 U F' D2 L' B U2 R' F"));

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => load<Screen>('screen', 'home'));
  const [entered, setEntered] = useState<Entered>(() => load<Entered>('entered', blankCube()));
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solveInput, setSolveInput] = useState<CubeState | null>(() => load<CubeState | null>('solveInput', null));
  const [position, setPosition] = useState(() => load('position', { step: 0, move: 0 }));
  const [explain, setExplain] = useState<boolean>(() => load('explain', false));
  const [learnStage, setLearnStage] = useState<string | null>(null);

  useEffect(() => save('entered', entered), [entered]);
  useEffect(() => save('solveInput', solveInput), [solveInput]);
  useEffect(() => save('position', position), [position]);
  useEffect(() => save('explain', explain), [explain]);
  useEffect(() => save('screen', screen === 'learn' ? 'home' : screen), [screen]);
  useEffect(() => window.scrollTo(0, 0), [screen]);

  const solution: Solution | null = useMemo(() => {
    if (!solveInput) return null;
    try {
      return solve(solveInput);
    } catch {
      return null;
    }
  }, [solveInput]);

  // A saved screen that has nothing to show falls back to home.
  const shownScreen: Screen = screen === 'solve' && !solution ? 'home' : screen;

  const check = () => {
    const p = validate(entered);
    setProblems(p);
    if (p.length) return;
    try {
      setSolveInput(entered as Color[]);
      setPosition({ step: 0, move: 0 });
      setScreen('solve');
    } catch {
      setProblems([{ message: 'Something went wrong while solving this cube. Please check the colors again.', stickers: [] }]);
    }
  };

  const example = () => {
    setEntered(applyMoves(solvedState(), randomScramble()));
    setProblems([]);
  };

  const openLearn = (stage?: string) => {
    setLearnStage(stage ?? null);
    setScreen('learn');
  };

  if (shownScreen === 'enter')
    return (
      <EnterScreen
        entered={entered}
        setEntered={(e) => {
          setEntered(e);
          if (problems.length) setProblems([]);
        }}
        problems={problems}
        onCheck={check}
        onExample={example}
        onStartOver={() => {
          setEntered(blankCube());
          setProblems([]);
        }}
        onHome={() => setScreen('home')}
      />
    );

  if (shownScreen === 'solve' && solution)
    return (
      <SolveScreen
        solution={solution}
        position={position}
        setPosition={setPosition}
        explain={explain}
        setExplain={setExplain}
        onHome={() => setScreen('home')}
        onNewCube={() => {
          setEntered(blankCube());
          setSolveInput(null);
          setScreen('enter');
        }}
        onLearn={openLearn}
      />
    );

  if (shownScreen === 'learn') return <LearnScreen onHome={() => setScreen('home')} focusStage={learnStage} />;

  const inProgress = solution && position.step < solution.steps.length;

  return (
    <div className="screen home">
      <section className="home__hero">
        <div className="home__intro">
          <div className="eyebrow">For the 3 × 3 cube</div>
          <h1>Cube Solver</h1>
          <p className="lead">
            Tell the app the colors on your cube. It shows you how to solve it, one move at a time, in plain words.
            Turn on <b>Explain</b> to learn why each move works, so one day you can do it without the app.
          </p>
          <div className="home__actions">
            {inProgress && (
              <button className="btn btn--big btn--primary" onClick={() => setScreen('solve')}>
                Continue solving · step {position.step + 1} of {solution.steps.length}
              </button>
            )}
            <button className={`btn btn--big ${inProgress ? '' : 'btn--primary'}`} onClick={() => setScreen('enter')}>
              Enter my cube
            </button>
            <button className="btn btn--big" onClick={() => openLearn()}>
              Learn the method
            </button>
          </div>
          <button
            className="link"
            onClick={() => {
              example();
              setScreen('enter');
            }}
          >
            No cube in your hands? Try a mixed-up example →
          </button>
        </div>
        <div className="home__cube">
          <Cube3D state={HOME_EXAMPLE} label="A mixed-up cube" />
        </div>
      </section>

      <section className="home__how" aria-label="How it works">
        <div className="howcard">
          <div className="howcard__n">1</div>
          <h3>Enter the colors</h3>
          <p>Hold your cube and tap in the 9 colors of each side. The app checks that every color is there.</p>
        </div>
        <div className="howcard">
          <div className="howcard__n">2</div>
          <h3>Follow the moves</h3>
          <p>Each step tells you how to hold the cube. Tap "Next move" and copy the turn you see.</p>
        </div>
        <div className="howcard">
          <div className="howcard__n">3</div>
          <h3>Learn the why</h3>
          <p>The app uses the beginner's method in 7 stages. Each stage has a short guide and a demo.</p>
        </div>
      </section>

      <section className="home__stages" aria-label="The 7 stages">
        <div className="eyebrow">The 7 stages</div>
        <ol className="stagelist">
          {STAGE_ORDER.map((id) => (
            <li key={id}>
              <button className="link" onClick={() => openLearn(id)}>
                {STAGE_BY_ID[id].name}
              </button>
              <span> {STAGE_BY_ID[id].short}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
